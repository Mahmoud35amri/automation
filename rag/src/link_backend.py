"""
Run the RAG for one backend tender and record its matches in the backend.

    cd rag/src
    python link_backend.py <tender_id> [--backend http://localhost:8000/api/v1]

1. GET /tenders/{id}            -> the tender's NLP extraction (nlp_metadata) is the structured RFP
2. same retrieval + matching as rfp_retrieval_v2.py (Qdrant top-5 projects, rule-based CV matching)
3. POST /assets/                -> registers each matched project / CV once (keyed by metadata_json.rag_id)
4. POST /tenders/{id}/matches   -> one match per project / candidate, with the matching evidence as reason
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from qdrant_client import QdrantClient

from candidate_matching import match_candidates
from cv_loader import cv_to_text
from embeddings import generate_embedding
from rfp_matching import match_project
from rfp_output import build_final_output
from rfp_query import build_rfp_query


COLLECTION_NAME = "olivesoft_knowledge"
BASE_DIR = Path(__file__).resolve().parent.parent


def call(method: str, url: str, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def list_assets(api: str) -> list[dict]:
    assets, skip = [], 0
    while True:
        page = call("GET", f"{api}/assets/?skip={skip}&limit=100")
        assets += page
        if len(page) < 100:
            return assets
        skip += 100


def asset_id(api: str, known: dict, rag_id: str, body: dict) -> int:
    """Backend id of a project / CV, creating the internal asset the first time it is matched."""
    if rag_id not in known:
        asset = {**body, "metadata_json": {"rag_id": rag_id, **body["metadata_json"]}}
        known[rag_id] = call("POST", f"{api}/assets/", asset)["id"]
    return known[rag_id]


def words(items: list) -> str:
    return ", ".join(items) or "none"


def run_rag(rfp: dict, candidates: list[dict]):
    client = QdrantClient(path=str(BASE_DIR / "qdrant_storage"))
    try:
        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=generate_embedding(build_rfp_query(rfp)),
            limit=5,
        ).points
    finally:
        client.close()

    candidate_results = match_candidates(
        candidates, rfp.get("required_roles", []), rfp.get("required_technologies", [])
    )
    return results, build_final_output(results, candidate_results, rfp)


def project_matches(api, known, rfp, results, references) -> list[dict]:
    matches = []
    for result in results:
        project = result.payload
        m = match_project(rfp, project)
        reason = (
            f"Sector match: {'yes' if m['sector_match'] else 'no'}. "
            f"Technologies matched: {words(m['technology_match']['matched'])}; missing: {words(m['technology_match']['missing'])}. "
            f"Project types matched: {words(m['project_type_match']['matched'])}; missing: {words(m['project_type_match']['missing'])}."
        )
        if project.get("id") in references:
            reason += f" Valid reference ({project.get('sector')}, {project.get('year')})."
        matches.append({
            "asset_id": asset_id(api, known, project["id"], {
                "title": project["title"],
                "asset_type": "PAST_PROJECT",
                "description": project.get("description", ""),
                "qdrant_point_id": str(result.id),
                "metadata_json": {k: project.get(k) for k in ("sector", "project_type", "technologies", "skills", "year")},
            }),
            "relevance_score": min(max(result.score, 0.0), 1.0),
            "match_reason": reason,
        })
    return matches


def candidate_matches(api, known, candidates, matching_candidates) -> list[dict]:
    cvs = {cv["cv_id"]: cv for cv in candidates}
    matches = []
    for c in matching_candidates:
        cv = cvs[c["cv_id"]]
        required = len(c["skills"]) + len(c["missing_skills"])
        required_years = c["required_experience_years"]
        experience = f"{c['experience_years']} years" + ("" if required_years is None else f" (required: {required_years})")
        matches.append({
            "asset_id": asset_id(api, known, cv["cv_id"], {
                "title": f"{cv['name']} ({', '.join(cv.get('roles', []))})",
                "asset_type": "CV",
                "description": cv_to_text(cv),
                "metadata_json": {k: cv.get(k) for k in ("roles", "skills", "experience_years", "certifications")},
            }),
            # share of the required technologies this candidate covers (role + experience already satisfied)
            "relevance_score": len(c["skills"]) / required if required else 1.0,
            "match_reason": (
                f"Role {c['role']}: {experience}. "
                f"Technologies matched: {words(c['skills'])}; missing: {words(c['missing_skills'])}. "
                f"Certifications: {words(c['certifications'])}."
            ),
        })
    return matches


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the RAG for a backend tender and store its matches.")
    parser.add_argument("tender_id", type=int)
    parser.add_argument("--backend", default="http://localhost:8000/api/v1", help="Backend API base URL")
    args = parser.parse_args()
    api = args.backend.rstrip("/")

    try:
        tender = call("GET", f"{api}/tenders/{args.tender_id}")
        rfp = tender.get("nlp_metadata")
        if not rfp:
            sys.exit(f"Tender {args.tender_id} has no NLP extraction (nlp_metadata): run nlp/main.py --backend on its RFP first.")

        candidates = json.loads((BASE_DIR / "data" / "cvs.json").read_text(encoding="utf-8"))
        results, final_output = run_rag(rfp, candidates)

        known = {a["metadata_json"]["rag_id"]: a["id"] for a in list_assets(api) if (a.get("metadata_json") or {}).get("rag_id")}
        references = {r["project_id"] for r in final_output["matching_references"]}
        matches = (project_matches(api, known, rfp, results, references)
                   + candidate_matches(api, known, candidates, final_output["matching_candidates"]))

        # re-running must not duplicate matches already recorded for this tender
        seen = {m["asset_id"] for m in tender.get("asset_matches", [])}
        new = []
        for m in matches:
            if m["asset_id"] not in seen:
                seen.add(m["asset_id"])
                new.append(m)
        saved = call("POST", f"{api}/tenders/{args.tender_id}/matches", new) if new else []
    except urllib.error.HTTPError as e:
        sys.exit(f"Backend error {e.code} on {e.url}: {e.read().decode('utf-8', 'replace')}")
    except urllib.error.URLError as e:
        sys.exit(f"Backend unreachable at {api}: {e.reason}")

    print(json.dumps(final_output, indent=2, ensure_ascii=False))
    print(f"\n{len(saved)} match(es) recorded for tender {args.tender_id} ({len(matches) - len(new)} already present).")


if __name__ == "__main__":
    main()
