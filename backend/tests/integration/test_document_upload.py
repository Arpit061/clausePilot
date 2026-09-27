from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db.database import check_database_connection
from app.main import app

FIXTURE_PDF = Path(__file__).resolve().parents[1] / "fixtures" / "sample.pdf"

pytestmark = pytest.mark.skipif(
    not check_database_connection(),
    reason="Requires a running PostgreSQL instance (see docker-compose.yml).",
)


def test_upload_document_extracts_pages_and_lists_it() -> None:
    with TestClient(app) as client:
        pdf_bytes = FIXTURE_PDF.read_bytes()

        upload_response = client.post(
            "/documents",
            files={"file": ("sample.pdf", pdf_bytes, "application/pdf")},
        )

        assert upload_response.status_code == 201
        uploaded = upload_response.json()
        assert uploaded["status"] == "ready"
        assert uploaded["page_count"] == 1
        assert uploaded["filename"] == "sample.pdf"

        detail_response = client.get(f"/documents/{uploaded['id']}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert len(detail["pages"]) == 1
        assert detail["pages"][0]["page_number"] == 1
        assert detail["pages"][0]["char_count"] > 0

        list_response = client.get("/documents")
        assert list_response.status_code == 200
        documents = list_response.json()["documents"]
        assert any(doc["id"] == uploaded["id"] for doc in documents)


def test_upload_rejects_non_pdf_file() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/documents",
            files={"file": ("notes.txt", b"plain text", "text/plain")},
        )

        assert response.status_code == 415
