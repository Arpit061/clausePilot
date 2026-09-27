from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db.database import check_database_connection
from app.main import app
from app.services.llm.embeddings import build_embedding_text

FIXTURE_PDF = Path(__file__).resolve().parents[1] / "fixtures" / "standard_sample.pdf"

pytestmark = pytest.mark.skipif(
    not check_database_connection(),
    reason="Requires a running PostgreSQL instance (see docker-compose.yml).",
)


def _upload_fixture(client: TestClient) -> dict:
    pdf_bytes = FIXTURE_PDF.read_bytes()
    response = client.post(
        "/documents",
        files={"file": ("standard_sample.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 201
    document = response.json()
    assert document["status"] == "ready"
    return document


def test_semantic_search_ranks_the_matching_clause_first() -> None:
    with TestClient(app) as client:
        document = _upload_fixture(client)
        detail = client.get(f"/documents/{document['id']}").json()

        materials_clause = next(c for c in detail["clauses"] if c["number"] == "1.1.1")

        # Embedding the clause's own canonical text as the query means its
        # query vector is identical to the stored clause vector, so this
        # clause must come back as the closest match -- a query the
        # deterministic fake provider can satisfy without real semantic
        # understanding, while still exercising the whole embed -> pgvector
        # cosine-similarity -> ranking pipeline end-to-end.
        query_text = build_embedding_text(
            number=materials_clause["number"],
            title=materials_clause["title"],
            text=materials_clause["text"],
        )

        # Scoped to this document: the dev database may already contain many
        # duplicate uploads of the same fixture from prior test runs, which
        # would otherwise tie on distance 0 with no defined order between them.
        response = client.get(
            "/search/semantic", params={"q": query_text, "document_id": document["id"]}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["query"] == query_text
        assert len(body["results"]) >= 1

        top = body["results"][0]
        assert top["clause_id"] == materials_clause["id"]
        assert top["number"] == "1.1.1"
        assert top["similarity"] > 0.99


def test_semantic_search_scopes_to_a_specific_document() -> None:
    with TestClient(app) as client:
        first_document = _upload_fixture(client)
        second_document = _upload_fixture(client)

        response = client.get(
            "/search/semantic",
            params={"q": "corrosion resistant materials", "document_id": first_document["id"]},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["document_id"] == first_document["id"]
        assert len(body["results"]) >= 1
        assert all(r["document_id"] == first_document["id"] for r in body["results"])
        assert all(r["document_id"] != second_document["id"] for r in body["results"])


def test_semantic_search_with_blank_query_returns_empty_results() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get("/search/semantic", params={"q": ""})

        assert response.status_code == 200
        assert response.json()["results"] == []


def test_semantic_search_with_unknown_document_id_returns_empty_results() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get(
            "/search/semantic",
            params={"q": "corrosion resistant materials", "document_id": "does-not-exist"},
        )

        assert response.status_code == 200
        assert response.json()["results"] == []


def test_keyword_search_endpoint_is_unaffected_by_semantic_search() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get("/search", params={"q": "corrosion resistant"})

        assert response.status_code == 200
        body = response.json()
        assert "results" in body
        assert all("score" in r for r in body["results"])
        assert all("similarity" not in r for r in body["results"])
