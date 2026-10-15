"""
CLI entry point for the NLP/RFP-analysis pipeline.

Usage:
    export GROQ_API_KEY=your_key_here
    python main.py fixtures/sample_rfp_en.pdf
    python main.py fixtures/sample_rfp_en.pdf --out result.json
    python main.py fixtures/sample_rfp_en.pdf --backend http://localhost:8000/api/v1

Prints a human-readable summary to stdout, and optionally writes the
full structured JSON to a file for the RAG teammate to consume.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

from extract import extract_from_pdf


def print_summary(extraction, warnings: list[str]) -> None:
    print(f"\n{'='*60}")
    print(f"  {extraction.title}")
    print(f"{'='*60}")
    print(f"Reference:      {extraction.reference or '—'}")
    print(f"Client:         {extraction.client_name or '—'} ({extraction.client_sector or '—'})")
    print(f"Deadline:       {extraction.deadline or '—'}")
    print(f"Budget:         {extraction.budget or '—'} {extraction.currency or ''}")
    print(f"Language:       {extraction.language}")
    print(f"Project type:   {', '.join(extraction.project_type) or '—'}")
    print(f"Technologies:   {', '.join(extraction.required_technologies) or '—'}")

    print(f"\nRoles required ({len(extraction.required_roles)}):")
    for role in extraction.required_roles:
        certs = f", certs: {', '.join(role.required_certifications)}" if role.required_certifications else ""
        print(f"  - {role.count or '?'}x {role.title} (min {role.min_experience_years or '?'} yrs){certs}")

    print(f"\nRequirements ({len(extraction.requirements)}):")
    for req in extraction.requirements:
        flag = "MANDATORY" if req.mandatory else "preferred"
        print(f"  [{req.id}] ({req.category}, {flag}) {req.text}")

    print(f"\nConfidence:     {extraction.confidence:.2f}")
    if extraction.missing_fields:
        print(f"Missing fields: {', '.join(extraction.missing_fields)}")
    if warnings:
        print(f"\n⚠ Vocab warnings ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")
    print()


def send_to_backend(extraction, base_url: str) -> dict:
    """POST the extraction to the backend, which stores it as a tender (POST /tenders/from-nlp)."""
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/tenders/from-nlp",
        data=json.dumps(extraction.model_dump(mode="json")).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract structured data from an RFP PDF.")
    parser.add_argument("pdf_path", help="Path to the RFP PDF file")
    parser.add_argument("--out", help="Optional path to write the full JSON output")
    parser.add_argument("--backend", help="Backend API base URL, e.g. http://localhost:8000/api/v1")
    args = parser.parse_args()

    try:
        extraction, warnings = extract_from_pdf(args.pdf_path)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print_summary(extraction, warnings)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(extraction.model_dump(mode="json"), f, indent=2, ensure_ascii=False)
        print(f"Full JSON written to {args.out}")

    if args.backend:
        try:
            tender = send_to_backend(extraction, args.backend)
        except (urllib.error.URLError, OSError) as e:
            print(f"Error: could not send extraction to backend: {e}", file=sys.stderr)
            sys.exit(1)
        print(f"Tender created in backend: id={tender['id']} status={tender['status']}")


if __name__ == "__main__":
    main()
