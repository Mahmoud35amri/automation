# CSTAM-OliveSoft — NLP/RFP Analysis Component

## What this does

Turns an unstructured RFP PDF into structured JSON:

```
RFP PDF → text extraction → cleanup → language detection
        → section splitting → LLM extraction (Groq) → validated JSON
        → handed to RAG teammate
```

## Files

|File|Responsibility|
|-|-|
|`vocab.py`|Controlled vocabularies (sector, tech, project type, categories) — the shared contract with the RAG teammate's index|
|`schema.py`|`RFPExtraction` Pydantic model + `validate\_vocab()` safety net|
|`preprocessing.py`|PDF → clean text → language detection → heuristic section splitting|
|`extract.py`|Groq LLM call, prompted with the schema + controlled vocab, with a one-shot self-repair retry on invalid output|
|`main.py`|CLI: run the full pipeline on a PDF, print a summary, optionally dump JSON|
|`make\_fixtures.py`|Generates synthetic EN/FR test RFP PDFs (real OliveSoft data not available yet)|
|`fixtures/`|Generated test PDFs|

## Setup

```bash
pip install -r requirements.txt
export GROQ\_API\_KEY=your\_key\_here   # free key at https://console.groq.com
```

## Run

```bash
python main.py fixtures/sample\_rfp\_en.pdf
python main.py fixtures/sample\_rfp\_fr.pdf --out result.json
```

## Design decisions worth remembering

* **Hybrid, not chatbot.** Deterministic stuff (whitespace, page numbers, section
boundaries) is regex/rule-based in `preprocessing.py`. Only genuinely semantic
judgment (mandatory vs preferred, categorization, normalization into controlled
vocab) goes to the LLM in `extract.py`.
* **Controlled vocabularies exist so retrieval doesn't silently break.** If this
pipeline outputs `"K8s"` and the RAG index has `"Kubernetes"`, matching fails
with no error. `validate\_vocab()` catches drift early; extend `vocab.py` as real
data reveals gaps in the lists, don't let the LLM freelance new values.
* **`missing\_fields` + `confidence`** on every extraction — this is what makes
incomplete/noisy RFPs (an explicit scored edge case) a handled state instead of
a crash or a silent hallucination.
* **Section splitting is accent-insensitive.** Real French/Tunisian PDFs are
inconsistent about diacritics depending on how they were typed/scanned, so
matching strips accents on both sides before comparing.
* **PDF-only input for now.** DOCX/other formats are an explicit future-phase
item, not handled yet — don't scope-creep this before Phase 1 is solid.

## Not yet done / open questions

* Live-tested against a real Groq call (blocked on API key as of last session).
* Requirements-matrix bonus (per-requirement retrieval) needs this schema's
`requirements\[]` wired into the RAG teammate's per-asset scoring — sync with him.
* RAG benchmark (gold-set eval) needs synthetic tenders *with* labeled expected
matches, not just parseable ones — current fixtures aren't labeled for that yet.
* No test coverage yet beyond the two synthetic fixtures; worth adding a noisy/
incomplete RFP fixture to exercise `missing\_fields` before the demo.

