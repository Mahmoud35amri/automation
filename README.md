#  OliveSoft RFP & Tender Intelligence Backend

An AI-driven backend API designed to automate the Request for Proposal (RFP) lifecycle. It integrates web scraping, NLP document extraction, agentic prospect research (via n8n), Qdrant vector similarity search (RAG), and human-in-the-loop proposal refinement.

---

##  Tech Stack

* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
* **Database:** PostgreSQL with [SQLAlchemy ORM](https://www.sqlalchemy.org/)
* **Vector Database:** [Qdrant](https://qdrant.tech/) (RAG Matching)
* **Automation & Agents:** [n8n](https://n8n.io/) Webhook Workflows
* **Async & Storage:** `aiofiles` for streaming presentation downloads (`.pptx`, `.pdf`)
* **Validation:** Pydantic V2

---

##  Key Features

- ** automated Tender Ingestion:** Idempotent scraping endpoints that prevent duplicate entries using `source_url` hash checks.
- ** NLP Structured Extraction:** Ingests entity-extracted data (skills, budgets, roles, certifications, and compliance requirements) from tender PDFs.
- ** Vector Search & RAG Matching:** Links internal assets (CVs, past project references, tool stacks) stored in Qdrant to incoming RFPs.
- ** Agentic Prospect Research:** Webhook integration with n8n autonomous web agents to extract company revenue, competitors, key partners, and budget ranges.
- ** Proposal Draft Generation & Streaming:** Auto-increments versions ($v1 \rightarrow v2$), computes coverage score matrices, and streams `.pptx` and `.pdf` file downloads.
- ** Human-in-the-Loop Refinement:** Real-time `PATCH` endpoints allowing sales teams to refine generated slides prior to client submission.

---

## 🔄 Tender State Machine

The system manages tenders through a structured status workflow:


[ DETECTED ] ──(Trigger Agent)──> [ RESEARCHING ]


│


(n8n Webhook)

▼
[ GENERATING_PROPOSAL ] ◄───────── [ RESEARCHED ]

│

(n8n Webhook)
▼
[ PROPOSAL_READY ] ──(Human Edit)──> [ DOWNLOAD PPTX/PDF ]


---

## 🔗 Linked components

Every module talks to this backend over HTTP; the backend is the single database.

| Folder | Module | Link to the backend |
|---|---|---|
| `scraper/` | Tender detection (HAICOP + appeloffres.com) | `--backend URL` → `POST /tenders/` (deduplicated by `source_url`) |
| `nlp/` | RFP PDF → structured JSON (Groq) | `--backend URL` → `POST /tenders/from-nlp` |
| `rag/` | Qdrant + rule-based matching | `src/link_backend.py <tender_id>` → reads `nlp_metadata`, writes `POST /assets/` + `POST /tenders/{id}/matches` |
| `olivesoft-rfp/` | Prospect research + proposal generation (Next.js) | target of `N8N_RESEARCH_WEBHOOK_URL` / `N8N_PROPOSAL_WEBHOOK_URL`, writes `POST /tenders/{id}/research`, `POST /tenders/{id}/generate-proposal` |

### Run it

```bash
# 1. backend (copy .env.example to .env and fill the database settings)
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --port 8000

# 2. agent + dashboard (olivesoft-rfp/README.md for its .env.local) -> http://localhost:3000
cd olivesoft-rfp && npm install && docker compose up -d qdrant && npm run dev

# 3. feed tenders
python scraper/cstam_pipeline.py --backend http://localhost:8000/api/v1
python nlp/main.py nlp/fixtures/sample_rfp_en.pdf --backend http://localhost:8000/api/v1

# 4. RAG matches for a tender that has an NLP extraction (index once with rag/main.py)
cd rag/src && python link_backend.py <tender_id>

# 5. research + proposal through the backend
curl -X POST http://localhost:8000/api/v1/tenders/<tender_id>/trigger-research
curl -X POST http://localhost:8000/api/v1/tenders/<tender_id>/trigger-proposal
curl http://localhost:8000/api/v1/proposals/<proposal_id>/download -o proposal.pptx
```
