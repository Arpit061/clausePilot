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

## Semantic Search (Embeddings + pgvector)

- The `db` service in `docker-compose.yml` uses the `pgvector/pgvector:pg16` image. The backend enables the extension itself (`CREATE EXTENSION IF NOT EXISTS vector`) on startup, so no manual SQL is required.
- Embedding generation is configured entirely through environment variables — see `.env.example`: `EMBEDDING_PROVIDER` (`fake` by default, `openai` for real embeddings), `EMBEDDING_MODEL`, `EMBEDDING_API_KEY`, and `EMBEDDING_DIMENSION` (must match the model's real output size).
- With the default `fake` provider, everything works out of the box with no API key — useful for local dev and CI. Switch to `openai` and set `EMBEDDING_API_KEY` for real semantic search.
- When a document is processed, each extracted clause is embedded and stored alongside it. If embedding generation fails, the document is marked `failed` with an error message — its pages and clauses stay intact, only the embedding step is incomplete.
- To backfill embeddings for clauses that don't have one yet (e.g. after switching providers, or clauses from a failed embedding run), run:

  ```bash
  cd backend
  .venv\Scripts\activate
  python ../scripts/backfill_embeddings.py               # all documents
  python ../scripts/backfill_embeddings.py --document-id <id>  # one document
  ```

  This is idempotent and only fills in missing embeddings — it never re-processes a document or touches clauses that already have one, and it does not run automatically on every startup.

## File Storage (Cloudflare R2)

Uploaded PDFs are stored through a storage backend chosen by `STORAGE_BACKEND`:

- `local` (default): files are written to `UPLOAD_DIR` (`data/uploads`). Use this for development.
- `r2`: files are stored in a Cloudflare R2 bucket. Use this in production.

To set up R2:

1. In the Cloudflare dashboard, create an R2 bucket and an API token with Object Read & Write access to it.
2. Set these variables in `backend/.env` (or the hosting dashboard):

   ```
   STORAGE_BACKEND=r2
   R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<token access key id>
   R2_SECRET_ACCESS_KEY=<token secret>
   R2_BUCKET_NAME=<bucket name>
   ```

If `STORAGE_BACKEND=r2` and any R2 value is missing, the backend refuses to start with a message naming the missing setting.

Tests never contact R2; they use an in-memory fake client.

## Running the Frontend

Requires Node.js 20+.

```bash
cd frontend
npm install
copy .env.example .env    # Windows; adjust VITE_API_BASE_URL if needed
npm run dev
```

The dev server runs at `http://localhost:5173` and expects the FastAPI backend at the URL configured in `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).
