 OliveSoft RFP Intelligence — RAG Layer
 1. Overview

The OliveSoft RAG module is an evidence-driven Retrieval-Augmented Generation (RAG) component designed to identify relevant OliveSoft capabilities from an incoming Request for Proposal (RFP).

The objective is not simply to retrieve projects that are semantically similar to an RFP.

The system combines:

* Semantic retrieval
* Structured requirement matching
* Technology matching
* Sector matching
* Project-type matching
* Candidate/CV matching
* Reference validation
* Requirement-level evidence
* Structured JSON output

This allows the system to distinguish between:

>This project is semantically similar to the RFP.

and:

> This project provides concrete evidence covering specific RFP requirements.

This distinction is the core principle of the RAG layer.



 2. RAG Pipeline

Structured RFP
      │
      ▼
RFP Query Builder
      │
      ▼
Embedding Model
      │
      ▼
Qdrant Vector Search
      │
      ▼
Top-K Projects
      │
      ├──────────────────┐
      ▼                  ▼
Requirement          Candidate
Matching              Matching
      │                  │
      ├──────────┬───────┘
      ▼          ▼
Technology    Sector /
Matching      Reference Matching
      │
      ▼
Evidence-Based Results
      │
      ▼
Structured JSON
      │
      ▼
Proposal Generation Agent

The final proposal-generation step is a downstream component consuming the structured output produced by the RAG layer.



3. Semantic Retrieval

The structured RFP is transformed into a retrieval query containing:

* Client sector
* Project types
* Required technologies
* Required roles
* Mandatory requirements
* Optional requirements
* Reference requirements

The generated query is converted into an embedding and searched against the OliveSoft project knowledge base stored in Qdrant.

The current MVP retrieves the Top-5 most semantically relevant projects.

The semantic similarity score is used as a retrieval signal, but it is not treated as the final matching decision.

---

 4. Why This Is Not a Simple RAG

A conventional RAG pipeline generally follows:


Query
  ↓
Embedding
  ↓
Vector Search
  ↓
Retrieved Documents
  ↓
LLM Answer


The OliveSoft RAG layer adds a requirement-aware validation layer after retrieval.


RFP
 │
 ├── Semantic Understanding
 │
 ├── Semantic Retrieval
 │       ↓
 │   Top-K Projects
 │
 ├── Requirement Matching
 │
 ├── Technology Matching
 │
 ├── Sector Matching
 │
 ├── Project-Type Matchin
 │
 ├── Candidate Matching
 │
 └── Reference Validation
 │
 ▼
Evidence-Based Structured Results


The system therefore does not rely only on the Qdrant similarity score.

> Semantic similarity measures relevance. Requirement matching measures requirement coverage.

A project can have a high semantic similarity while failing an important mandatory requirement.

Conversely, a project with a lower semantic similarity can still provide useful evidence for a specific requirement.



 5. Requirement Matching

After semantic retrieval, each relevant project is evaluated against the RFP requirements.

The current matching layer evaluates requirements such as:

| ID | Requirement                             | Evaluation                    |
| -- | --------------------------------------- | ----------------------------- |
| R1 | Monolith → Microservices                | Matched / Partial / Not Found |
| R2 | AWS/Azure + Docker + Kubernetes         | Matched / Partial / Not Found |
| R3 | CI/CD + Monitoring                      | Matched / Partial / Not Found |
| R4 | Security + Compliance + Banking context | Matched / Partial / Not Found |
| R5 | GraphQL                                 | Matched / Not Found           |
| R6 | Banking/Financial references            | Matched / Partial / Not Found |

Example:

`text
R2 — AWS/Azure + Docker + Kubernetes

Status: MATCHED

Evidence:
Project contains a cloud provider,
Docker and Kubernetes.


The matching layer therefore provides more information than a simple similarity score.



 6. Three-Level Requirement Evaluation

Requirements are classified into three levels:

 MATCHED

Sufficient evidence is available to support the requirement.


AWS
+
Docker
+
Kubernetes


 PARTIAL

Some elements are present, but the complete requirement cannot be established.
CI/CD      → available
Monitoring → unavailable

Status → PARTIAL


 NOT_FOUND

No supporting evidence is identified in the evaluated project.
Central-bank compliance
→ No supporting evidence found
Status → NOT_FOUND


This distinction is important for downstream proposal generation because missing evidence should not be presented as an OliveSoft capability.



 7. Candidate Matching

The RAG workflow also processes internal CV data to identify candidates relevant to the RFP.

Candidate matching evaluates:

* Required role
* Experience
* Technical skills
* Certifications

Example:

```json
{
  "cv_id": "CV001",
  "role": "DevOps Engineer",
  "skills": [
    "AWS",
    "Docker",
    "Kubernetes"
  ],
  "experience_years": 7,
  "required_experience_years": 5,
  "certifications": [
    "AWS Certified Solutions Architect"
  ]
}



This allows the system to distinguish between a candidate who is merely related to the RFP and a candidate who satisfies the specified role and experience constraints.



8. Reference Validation

Reference requirements are evaluated separately from semantic similarity.

For example, when an RFP requires previous projects in the financial sector, the system identifies projects based on available evidence such as:

* Relevant sector
* Project year
* Project information

Example:

```json
"matching_references": [
  {
    "project_id": "project_001",
    "title": "Bank Cloud Transformation",
    "sector": "Finance",
    "year": 2024
  }
]
```

This prevents a semantically similar project from automatically being treated as a relevant reference without checking its available project metadata.

---
 9. Final RAG Output

The RAG layer produces structured JSON designed to be consumed by the downstream proposal-generation agent.

```json
{
  "matching_projects": [],
  "matching_candidates": [],
  "matching_references": []
}
```

The output can contain:

### Matching Projects

* Project ID
* Project title
* Similarity score
* Sector
* Technologies
* Project type
* Year

### Matching Candidates

* CV ID
* Candidate name
* Matched role
* Skills
* Missing skills
* Experience
* Required experience
* Certifications

### Matching References

* Project ID
* Project title
* Sector
* Year

This machine-readable format provides a stable interface between the RAG layer and the downstream proposal-generation layer.

---

10. NLP ↔ RAG ↔ Agent Contract

The RAG layer is being developed around a **shared technical contract** with the NLP and Agent teams.
        NLP
         │
         │ Structured RFP
         ▼
        RAG
         │
         │ Evidence-Based
         │ Matching Results
         ▼
 Proposal Agent


The objective is to keep the three components modular and allow each team to evolve independently.

The communication is based on structured JSON rather than presentation-oriented text.

The shared contract is designed around entities such as:

RFP
Requirement
Project
Candidate
Reference
Match
Evidence

This allows the RAG implementation to evolve without requiring major changes to the NLP or proposal-generation components.



 11. Technology Stack

| Component            | Technology                   |
| -------------------- | ---------------------------- |
| Programming Language | Python                       |
| Vector Database      | Qdrant                       |
| Embeddings           | Hugging Face Embedding Model |
| Knowledge Format     | JSON                         |
| Retrieval            | Vector Similarity Search     |
| Matching             | Python Rule-Based Matching   |
| Interface            | Structured JSON              |

Current RAG Component

src/
├── embeddings.py
├── rfp_query.py
├── rfp_matching.py
├── candidate_matching.py
├── rfp_output.py
└── rfp_retrieval_v2.py


Data currently used by the RAG layer includes:

data/
├── projects.json
├── cvs.json
├── rfp.json
└── final_output.json

---

12. Robustness Features

The current MVP goes beyond basic vector retrieval through:

* Semantic retrieval
* Requirement-aware matching
* Technology matching
* Sector matching
* Project-type matching
* Candidate matching
* Reference validation
* Partial-match detection
* Requirement-level evidence
* Structured machine-readable output

The most important design principle is that:

> The final matching result does not depend solely on the Qdrant similarity score.

The architecture separates:
Semantic Relevance
        +
Structured Constraints
        +
Requirement Coverage
        +
Evidence
        ↓
Final Structured Result


This separation reduces the risk of treating semantic similarity as proof that a project satisfies a contractual requirement.


 13. Current MVP

The current implementation successfully performs:

RFP
 ↓
Structured Query
 ↓
Embedding
 ↓
Qdrant Top-K Retrieval
 ↓
Requirement Matching
 ↓
Candidate Matching
 ↓
Reference Matching
 ↓
Structured JSON Output

The generated JSON is ready to be consumed by the downstream proposal-generation layer.


 14. Planned Improvements

The architecture is intentionally modular so that the MVP can evolve toward a more advanced production RAG system.

Potential improvements include:

* Hybrid keyword + semantic retrieval
* Metadata filtering
* Query expansion
* Multi-query retrieval
* Cross-encoder reranking
* Requirement-specific retrieval
* LLM-based requirement reasoning
* Stronger evidence validation
* Larger and richer internal knowledge base

These improvements can be introduced progressively without changing the core **NLP ↔ RAG ↔ Agent contract**.

Some improvements may require additional infrastructure or paid services in a future production deployment.

15. Key Design Principles

### Evidence First

No OliveSoft capability should be claimed without supporting internal evidence.

### Retrieval ≠ Decision

Semantic similarity is a retrieval signal, not the final business decision.

### Structured Constraints Matter

Mandatory requirements, experience, technologies and sector constraints must be explicitly evaluated.

### Partial Matches Matter

Incomplete requirement coverage must be distinguished from complete coverage.

### Modular Architecture

NLP, RAG and Agent components communicate through structured contracts.

### Explainability

The system should provide information explaining why an asset was retrieved and how requirements were evaluated.

### Upgradeability

Individual components can be replaced or improved without redesigning the entire architecture.

---

 16. Conclusion

The OliveSoft RFP Intelligence RAG layer is designed as an evidence-driven retrieval and matching architecture, rather than a conventional "embed and retrieve" system.

Its core contribution is the combination of:

Semantic Retrieval
        +
Structured Requirement Matching
        +
Requirement-Level Evidence
        +
Candidate Matching
        +
Reference Validation
        +
Structured Inter-Agent Contract
```

The current MVP establishes the RAG intelligence layer required to connect OliveSoft's internal knowledge with incoming RFP requirements.

Its modular design also prepares the system for future integration with the proposal-generation agent, while allowing the retrieval and matching components to evolve independently.
