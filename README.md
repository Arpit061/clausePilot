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
- **frontend** — React + TypeScript (Vite) client for upload, search, and chat, styled with Tailwind CSS and shadcn/ui.
- **data** — local storage for uploads, processed documents, and evaluation sets.
- **scripts** — operational/utility scripts.
- **docs** — architecture, development, and evaluation documentation.

## Current Milestone: Foundation

Only the development foundation is implemented so far:

- FastAPI app with a working `GET /health` endpoint.
- Environment-based configuration via `pydantic-settings`.
- SQLAlchemy engine/session setup and a database health-check utility (PostgreSQL is not required to import the app or run unit tests).
- Basic application logging.
- A React + TypeScript (Vite) app shell: Tailwind CSS, shadcn/ui, TanStack Query, React Router, Lucide icons, and a typed API client that talks to FastAPI over HTTP (base URL from `VITE_API_BASE_URL`).
- PostgreSQL is configured in `docker-compose.yml` as a plain Postgres service. `pgvector` will be added in the retrieval milestone once the vector search design is settled.

Document ingestion, clause extraction, retrieval, reranking, upload, chat, PDF viewing, authentication, and the agent are **not** implemented yet.

## Local Setup

Requires Python 3.12+.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -e .
```

Copy `.env.example` to `.env` and adjust values as needed. Never commit a real `.env` file.

## Running the Backend

```bash
cd backend
uvicorn app.main:app --reload
```

Then check: `GET http://127.0.0.1:8000/health`

## Running Tests

```bash
cd backend
pytest
```

## Running the Frontend

Requires Node.js 20+.

```bash
cd frontend
npm install
copy .env.example .env    # Windows; adjust VITE_API_BASE_URL if needed
npm run dev
```

The dev server runs at `http://localhost:5173` and expects the FastAPI backend at the URL configured in `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).
