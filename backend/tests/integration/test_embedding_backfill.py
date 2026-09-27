from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.database import SessionLocal, check_database_connection
from app.db.models import Clause
from app.main import app
from app.services.ingestion.embedding_backfill import backfill_missing_embeddings

FIXTURE_PDF = Path(__file__).resolve().parents[1] / "fixtures" / "standard_sample.pdf"

pytestmark = pytest.mark.skipif(
    not check_database_connection(),
    reason="Requires a running PostgreSQL instance (see docker-compose.yml).",
)


def test_backfill_fills_in_clauses_with_no_embedding() -> None:
    with TestClient(app) as client:
        pdf_bytes = FIXTURE_PDF.read_bytes()
        response = client.post(
            "/documents",
            files={"file": ("standard_sample.pdf", pdf_bytes, "application/pdf")},
        )
        assert response.status_code == 201
        document_id = response.json()["id"]

    # Simulate clauses left over from before semantic search existed (or a
    # prior embedding failure) by clearing their embeddings directly.
    session = SessionLocal()
    try:
        clauses = list(session.execute(select(Clause).where(Clause.document_id == document_id)).scalars())
        assert len(clauses) > 0
        for clause in clauses:
            clause.embedding = None
        session.commit()

        updated = backfill_missing_embeddings(session, document_id=document_id)
        assert updated == len(clauses)

        refreshed = list(session.execute(select(Clause).where(Clause.document_id == document_id)).scalars())
        assert all(c.embedding is not None for c in refreshed)
        assert all(len(c.embedding) == len(refreshed[0].embedding) for c in refreshed)
    finally:
        session.close()


def test_backfill_is_a_no_op_when_nothing_is_missing() -> None:
    session = SessionLocal()
    try:
        updated = backfill_missing_embeddings(session, document_id="00000000-0000-0000-0000-000000000000")
        assert updated == 0
    finally:
        session.close()
