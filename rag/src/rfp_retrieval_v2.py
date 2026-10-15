import json
from pathlib import Path

from qdrant_client import QdrantClient

from rfp_matching import match_project
from rfp_query import build_rfp_query
from embeddings import generate_embedding
from candidate_matching import match_candidates
from rfp_output import build_final_output


COLLECTION_NAME = "olivesoft_knowledge"

BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# LOAD JSON
# ============================================================

def load_json(file_path):
    path = Path(file_path)

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


# ============================================================
# LOAD DATA
# ============================================================

rfp = load_json(BASE_DIR / "data" / "rfp.json")

candidates = load_json(
    BASE_DIR / "data" / "cvs.json"
)


# ============================================================
# BUILD RFP QUERY
# ============================================================

query = build_rfp_query(rfp)

print("\nGenerated RFP Query:")
print("=" * 70)
print(query)


# ============================================================
# GENERATE EMBEDDING
# ============================================================

query_embedding = generate_embedding(query)


# ============================================================
# CONNECT TO QDRANT
# ============================================================

client = QdrantClient(
    path=str(BASE_DIR / "qdrant_storage")
)


# ============================================================
# SEMANTIC RETRIEVAL
# ============================================================

results = client.query_points(
    collection_name=COLLECTION_NAME,
    query=query_embedding,
    limit=5
).points


# ============================================================
# DISPLAY PROJECT MATCHING
# ============================================================

print("\n" + "=" * 70)
print("TOP MATCHING OLIVESOFT PROJECTS")
print("=" * 70)


for result in results:

    project = result.payload

    matching = match_project(
        rfp,
        project
    )

    print("\n" + "=" * 70)

    print(
        f"Project ID: {matching['project_id']}"
    )

    print(
        f"Title: {matching['title']}"
    )

    print(
        f"Semantic score: {result.score:.4f}"
    )

    print(
        f"Sector match: {matching['sector_match']}"
    )

    print("\nTechnologies:")

    print(
        f"  Matched: {matching['technology_match']['matched']}"
    )

    print(
        f"  Missing: {matching['technology_match']['missing']}"
    )

    print("\nProject types:")

    print(
        f"  Matched: {matching['project_type_match']['matched']}"
    )

    print(
        f"  Missing: {matching['project_type_match']['missing']}"
    )

    print(
        f"\nYear: {matching['year']}"
    )


# ============================================================
# MATCHING CANDIDATES
# ============================================================

print("\n" + "=" * 70)
print("MATCHING CANDIDATES")
print("=" * 70)

required_roles = rfp.get("required_roles", [])
required_technologies = rfp.get("required_technologies", [])

candidate_results = match_candidates(
    candidates,
    required_roles,
    required_technologies
)

for result in candidate_results:

    print("\n" + "-" * 70)

    print(f"CV: {result['cv_id']}")
    print(f"Name: {result['name']}")

    print(
        f"Required role: "
        f"{result['matched_role']}"
    )

    print(
        f"Role match: "
        f"{result['role_match']}"
    )

    print(
        f"Experience: "
        f"{result['experience_years']} years"
    )

    print(
        f"Required experience: "
        f"{result['required_experience_years']}"
    )

    print(
        f"Experience match: "
        f"{result['experience_match']}"
    )

    print(
        f"Matched technologies: "
        f"{result['matched_technologies']}"
    )

    print(
        f"Missing technologies: "
        f"{result['missing_technologies']}"
    )

    print(
        f"Certifications: "
        f"{result['certifications']}"
    )

    print(
        f"Candidate match: "
        f"{result['candidate_match']}"
    )

# ============================================================
# BUILD FINAL OUTPUT
# ============================================================

final_output = build_final_output(
    results,
    candidate_results,
    rfp
)


# ============================================================
# DISPLAY FINAL JSON
# ============================================================

print("\n" + "=" * 70)
print("FINAL STRUCTURED OUTPUT")
print("=" * 70)

print(
    json.dumps(
        final_output,
        indent=2,
        ensure_ascii=False
    )
)


# ============================================================
# SAVE FINAL OUTPUT
# ============================================================

output_path = BASE_DIR / "data" / "final_output.json"

with output_path.open(
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        final_output,
        file,
        indent=2,
        ensure_ascii=False
    )


print("\n" + "=" * 70)

print(
    f"Final output saved to: {output_path}"
)

print("=" * 70)


# ============================================================
# CLOSE QDRANT
# ============================================================

client.close()