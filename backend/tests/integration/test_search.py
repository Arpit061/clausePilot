from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db.database import check_database_connection
from app.main import app

FIXTURE_PDF = Path(__file__).resolve().parents[1] / "fixtures" / "standard_sample.pdf"

pytestmark = pytest.mark.skipif(
    not check_database_connection(),
    reason="Requires a running PostgreSQL instance (see docker-compose.yml).",
)


def _upload_fixture(client: TestClient) -> str:
    pdf_bytes = FIXTURE_PDF.read_bytes()
    response = client.post(
        "/documents",
        files={"file": ("standard_sample.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_search_finds_clause_by_title_text() -> None:
    with TestClient(app) as client:
        document_id = _upload_fixture(client)

        response = client.get("/search", params={"q": "corrosion resistant"})

        assert response.status_code == 200
        body = response.json()
        assert body["query"] == "corrosion resistant"
        assert body["document_id"] is None
        assert len(body["results"]) >= 1

        top = body["results"][0]
        assert top["number"] == "1.1.1"
        assert top["title"] == "Materials"
        assert "corrosion" in top["snippet"].lower()
        assert top["score"] > 0


def test_search_finds_clause_by_number() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get("/search", params={"q": "1.1.1"})

        assert response.status_code == 200
        results = response.json()["results"]
        assert any(r["number"] == "1.1.1" for r in results)
        # Exact number match should rank first among the returned results.
        assert results[0]["number"] == "1.1.1"


def test_search_scopes_to_a_specific_document() -> None:
    with TestClient(app) as client:
        first_document_id = _upload_fixture(client)
        second_document_id = _upload_fixture(client)

        response = client.get(
            "/search", params={"q": "corrosion", "document_id": first_document_id}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["document_id"] == first_document_id
        assert len(body["results"]) >= 1
        assert all(r["document_id"] == first_document_id for r in body["results"])
        assert all(r["document_id"] != second_document_id for r in body["results"])


def test_search_with_no_matches_returns_empty_results() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get("/search", params={"q": "xyznonexistentterm"})

        assert response.status_code == 200
        assert response.json()["results"] == []


def test_search_with_blank_query_returns_empty_results() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get("/search", params={"q": ""})

        assert response.status_code == 200
        assert response.json()["results"] == []


def test_search_finds_annex_clauses() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get("/search", params={"q": "Annex A"})

        assert response.status_code == 200
        results = response.json()["results"]
        numbers = {r["number"] for r in results}
        assert "Annex A" in numbers
