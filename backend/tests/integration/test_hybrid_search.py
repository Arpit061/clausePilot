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


def test_hybrid_search_returns_all_three_scores() -> None:
    with TestClient(app) as client:
        document = _upload_fixture(client)

        response = client.get(
            "/search/hybrid", params={"q": "corrosion resistant", "document_id": document["id"]}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["query"] == "corrosion resistant"
        assert body["document_id"] == document["id"]
        assert len(body["results"]) >= 1

        top = body["results"][0]
        assert top["number"] == "1.1.1"
        assert "keyword_score" in top
        assert "semantic_score" in top
        assert "hybrid_score" in top
        # A clause that matches on exact phrase should be found by both
        # retrievers here, so both underlying signals should be present.
        assert top["keyword_score"] is not None
        assert top["semantic_score"] is not None
        assert top["hybrid_score"] > 0


def test_hybrid_search_contributes_from_keyword_only_matches() -> None:
    with TestClient(app) as client:
        document = _upload_fixture(client)

        # "1.1.1" matches the clause number exactly (a strong keyword signal)
        # but is not a natural-language phrase a semantic match would favor
        # over other clauses -- this exercises the keyword-only-candidate path.
        response = client.get(
            "/search/hybrid", params={"q": "1.1.1", "document_id": document["id"]}
        )

        assert response.status_code == 200
        results = response.json()["results"]
        assert any(r["number"] == "1.1.1" and r["keyword_score"] is not None for r in results)


def test_hybrid_search_scopes_to_a_specific_document() -> None:
    with TestClient(app) as client:
        first_document = _upload_fixture(client)
        second_document = _upload_fixture(client)

        response = client.get(
            "/search/hybrid", params={"q": "corrosion resistant", "document_id": first_document["id"]}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["document_id"] == first_document["id"]
        assert len(body["results"]) >= 1
        assert all(r["document_id"] == first_document["id"] for r in body["results"])
        assert all(r["document_id"] != second_document["id"] for r in body["results"])


def test_hybrid_search_with_blank_query_returns_empty_results() -> None:
    with TestClient(app) as client:
        _upload_fixture(client)

        response = client.get("/search/hybrid", params={"q": ""})

        assert response.status_code == 200
        assert response.json()["results"] == []


def test_existing_keyword_and_semantic_endpoints_are_unaffected() -> None:
    with TestClient(app) as client:
        document = _upload_fixture(client)

        keyword_response = client.get(
            "/search", params={"q": "corrosion resistant", "document_id": document["id"]}
        )
        semantic_response = client.get(
            "/search/semantic", params={"q": "corrosion resistant", "document_id": document["id"]}
        )

        assert keyword_response.status_code == 200
        assert semantic_response.status_code == 200
        assert all("score" in r for r in keyword_response.json()["results"])
        assert all("similarity" in r for r in semantic_response.json()["results"])
        assert all("hybrid_score" not in r for r in keyword_response.json()["results"])
        assert all("hybrid_score" not in r for r in semantic_response.json()["results"])
