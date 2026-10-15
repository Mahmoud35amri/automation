"""
LLM extraction stage of the NLP/RFP pipeline.

preprocessed text (+ sections, language) -> Groq LLM (JSON mode)
-> validated RFPExtraction

The LLM is only responsible for the semantic/judgment parts: mandatory
vs preferred, categorization, normalization into controlled vocab.
Deterministic fields (already caught by preprocessing/regex) are still
passed through the LLM for now for simplicity — split them out into a
separate regex pass later if extraction quality needs it.

Requires env var GROQ_API_KEY. Get a free key at https://console.groq.com
"""

import json
import os

from dotenv import load_dotenv
from groq import Groq
from pydantic import ValidationError

load_dotenv()  # reads GROQ_API_KEY from a .env file in the working dir, if present

from schema import RFPExtraction, validate_vocab
from vocab import PROJECT_TYPES, REQUIREMENT_CATEGORIES, SECTORS, TECHNOLOGIES

MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

SYSTEM_PROMPT = f"""You are an information extraction engine for RFPs (Requests for Proposal / Appels d'Offres) \
in the IT services and software engineering sector. You read an RFP (English or French) and output ONLY a JSON \
object matching the schema described below. No prose, no markdown fences, JSON only.

CONTROLLED VOCABULARIES — use ONLY these values for the corresponding fields. \
If nothing fits, use "Other"/"other":

client_sector (pick exactly one): {SECTORS}
project_type (pick one or more): {PROJECT_TYPES}
required_technologies (pick zero or more, normalize any variant e.g. "K8s" -> "Kubernetes"): {TECHNOLOGIES}
requirements[].category (pick exactly one per requirement): {REQUIREMENT_CATEGORIES}

RULES:
- requirements[].mandatory: true if the RFP text signals it is required/obligatory \
("must", "shall", "required", "exige", "obligatoire"); false if it signals preference \
("nice to have", "a plus", "souhaite", "preferred").
- Never invent information not present in the text. If a field cannot be found, leave it null \
(or an empty list) AND add its name to missing_fields.
- confidence (0 to 1): your own estimate of overall extraction quality/completeness for this document.
- Output valid JSON only, matching this shape:

{{
  "reference": str | null,
  "title": str,
  "client_name": str | null,
  "client_sector": str | null,
  "deadline": "YYYY-MM-DD" | null,
  "budget": number | null,
  "currency": str | null,
  "project_type": [str],
  "required_technologies": [str],
  "required_roles": [{{"title": str, "count": int|null, "min_experience_years": int|null, "required_certifications": [str]}}],
  "requirements": [{{"id": str, "text": str, "category": str, "mandatory": bool, "min_experience_years": int|null}}],
  "language": "en" | "fr" | "ar",
  "missing_fields": [str],
  "confidence": number
}}"""


def _get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY not set. Get a free key at https://console.groq.com "
            "and set it as an environment variable before running extraction."
        )
    return Groq(api_key=api_key)


def _call_llm(client: Groq, document_text: str, detected_language: str) -> str:
    user_prompt = (
        f"Detected language: {detected_language}\n\n"
        f"RFP TEXT:\n{document_text}"
    )
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,  # extraction should be as deterministic as possible
    )
    return response.choices[0].message.content


def extract_from_text(document_text: str, detected_language: str = "en", max_retries: int = 1) -> tuple[RFPExtraction, list[str]]:
    """
    Calls the LLM and validates its output against RFPExtraction.
    Retries once (asking it to fix its own output) on invalid JSON/schema
    mismatch, since LLM JSON mode occasionally produces near-misses.
    Returns (extraction, vocab_warnings).
    """
    client = _get_client()
    raw = _call_llm(client, document_text, detected_language)

    for attempt in range(max_retries + 1):
        try:
            data = json.loads(raw)
            extraction = RFPExtraction(**data)
            warnings = validate_vocab(extraction)
            return extraction, warnings
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == max_retries:
                raise RuntimeError(f"LLM output failed validation after retries: {e}\nRaw output:\n{raw}") from e
            # Ask the model to repair its own output rather than silently guessing.
            repair_prompt = (
                f"Your previous JSON output was invalid: {e}\n\n"
                f"Previous output:\n{raw}\n\n"
                "Return ONLY the corrected JSON object, matching the schema exactly."
            )
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": repair_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            raw = response.choices[0].message.content

    raise RuntimeError("unreachable")  # loop always returns or raises


def extract_from_pdf(pdf_path: str) -> tuple[RFPExtraction, list[str]]:
    """Full pipeline: PDF -> preprocessing -> LLM extraction -> validated schema."""
    from preprocessing import preprocess_pdf  # local import avoids a hard dep for text-only callers

    pre = preprocess_pdf(pdf_path)
    # Feed the requirements section + full text if it was found; otherwise fall back to full text alone.
    text_for_llm = pre["sections"].get("_full_text", "")
    return extract_from_text(text_for_llm, detected_language=pre["language"])
