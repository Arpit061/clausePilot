# ClausePilot

ClausePilot is an AI Engineering Standards Assistant. Users upload engineering standards and technical PDFs, ask natural-language questions, and the system retrieves relevant clauses with source and page references.

## Architecture Overview

- **backend/app/api** — HTTP request/response layer (FastAPI routes).
- **backend/app/services** — application logic:
  - **ingestion** — converts uploaded documents into structured, clause-aware data.
  - **retrieval** — keyword search, semantic search, hybrid retrieval, and reranking.
  - **agent** — decides which retrieval tools to use and constructs evidence-grounded responses.
  - **llm** — model and embedding provider abstraction.
  - **citations** — source traceability for retrieved clauses.
- **backend/app/db** — persistence and repositories.
- **backend/app/schemas** — request/response data models.
- **frontend** — Streamlit UI for upload, search, and chat.
- **data** — local storage for uploads, processed documents, and evaluation sets.
- **scripts** — operational/utility scripts.
- **docs** — architecture, development, and evaluation documentation.
