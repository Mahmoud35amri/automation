"""
Preprocessing stage of the NLP/RFP pipeline.

RFP document (PDF) -> text extraction -> cleanup -> language detection
-> section splitting -> ready for LLM extraction.

Kept deterministic and dependency-light on purpose: everything here is
classical/rule-based, no LLM calls. The LLM only enters at extract.py.
"""

import re
import unicodedata

import pdfplumber
from langdetect import DetectorFactory, detect

# langdetect is non-deterministic on short text unless seeded.
DetectorFactory.seed = 0

# Section header aliases across English/French RFP conventions, used to
# roughly chunk a document before/instead of feeding the whole thing to
# the LLM. See the CSTAM notes for the reasoning behind these buckets.
# Accents are optional here — matching in split_sections() is accent-
# insensitive via _strip_accents(), so "criteres" and "critères" both work.
SECTION_ALIASES: dict[str, list[str]] = {
    "requirements": [
        "cahier des prescriptions techniques", "cctp",
        "specifications techniques", "specifications",
        "scope of work", "statement of work", "technical requirements",
    ],
    "eval_criteria": [
        "criteres d'evaluation", "criteres d evaluation", "evaluation criteria",
    ],
    "deadline": [
        "date limite", "delai de soumission", "submission deadline", "deadline",
    ],
    "admin_terms": [
        "ccap", "instructions aux soumissionnaires", "instructions to bidders",
        "terms and conditions",
    ],
}


def extract_text_from_pdf(path: str) -> str:
    """Extract raw text from a PDF, page by page, preserving page breaks
    as double newlines so section detection has natural boundaries."""
    pages: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(text)
    return "\n\n".join(pages)


def clean_text(raw: str) -> str:
    """Normalize whitespace and strip common PDF extraction noise
    (repeated headers/footers, page-number-only lines, excess blank lines)."""
    lines = raw.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
        # Drop lines that are just a page number or "Page X sur Y" / "Page X of Y"
        if re.fullmatch(r"(page\s*)?\d+(\s*(sur|of|/)\s*\d+)?", stripped, flags=re.IGNORECASE):
            continue
        cleaned_lines.append(stripped)

    text = "\n".join(cleaned_lines)
    text = re.sub(r"\n{3,}", "\n\n", text)      # collapse excess blank lines
    text = re.sub(r"[ \t]{2,}", " ", text)       # collapse repeated spaces/tabs
    return text.strip()


def detect_language(text: str) -> str:
    """Return 'en', 'fr', or 'ar'. Falls back to 'en' if detection fails
    or returns something outside our controlled language list."""
    sample = text[:2000] if len(text) > 2000 else text
    try:
        lang = detect(sample)
    except Exception:
        return "en"
    return lang if lang in ("en", "fr", "ar") else "en"


def _strip_accents(s: str) -> str:
    """Remove diacritics so 'critères' and 'criteres' match the same way.
    PDF text extraction and scanned/re-typed RFPs are inconsistent about
    accents, so matching must be accent-insensitive."""
    normalized = unicodedata.normalize("NFKD", s)
    return "".join(c for c in normalized if not unicodedata.combining(c))


def split_sections(text: str) -> dict[str, str]:
    """
    Heuristically split the document into named buckets using
    SECTION_ALIASES. Returns {bucket_name: matched_text_span}.
    This is a coarse pre-filter to help the LLM focus, not a hard
    structural parser — RFP formatting varies too much for that.
    Anything not matched stays retrievable via sections["_full_text"].
    Matching is accent- and case-insensitive; positions are mapped back
    onto the original (accented) text.
    """
    lower = _strip_accents(text.lower())
    hits: list[tuple[int, str]] = []

    for bucket, aliases in SECTION_ALIASES.items():
        for alias in aliases:
            idx = lower.find(_strip_accents(alias))
            if idx != -1:
                hits.append((idx, bucket))

    hits.sort(key=lambda h: h[0])

    sections: dict[str, str] = {}
    for i, (start, bucket) in enumerate(hits):
        end = hits[i + 1][0] if i + 1 < len(hits) else len(text)
        chunk = text[start:end].strip()
        # A bucket can appear more than once (rare); keep the longest span.
        if bucket not in sections or len(chunk) > len(sections[bucket]):
            sections[bucket] = chunk

    sections["_full_text"] = text
    return sections


def preprocess_pdf(path: str) -> dict:
    """Full preprocessing pipeline for one RFP PDF. Returns everything
    extract.py needs: cleaned text, detected language, and section spans."""
    raw = extract_text_from_pdf(path)
    text = clean_text(raw)
    return {
        "language": detect_language(text),
        "sections": split_sections(text),
        "char_count": len(text),
    }
