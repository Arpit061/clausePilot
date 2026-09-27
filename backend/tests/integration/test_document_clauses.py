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


def test_upload_processes_and_persists_clauses() -> None:
    with TestClient(app) as client:
        pdf_bytes = FIXTURE_PDF.read_bytes()

        upload_response = client.post(
            "/documents",
            files={"file": ("standard_sample.pdf", pdf_bytes, "application/pdf")},
        )

        assert upload_response.status_code == 201
        uploaded = upload_response.json()
        assert uploaded["status"] == "ready"
        assert uploaded["page_count"] == 2

        detail_response = client.get(f"/documents/{uploaded['id']}")
        assert detail_response.status_code == 200
        detail = detail_response.json()

        clauses_by_number = {c["number"]: c for c in detail["clauses"]}
        expected_numbers = {"1", "1.1", "1.1.1", "2", "2.1", "Annex A", "Annex A.1"}
        assert expected_numbers.issubset(clauses_by_number.keys())

        # Clause order is preserved as encountered in the document.
        assert [c["number"] for c in detail["clauses"]] == [
            "1",
            "1.1",
            "1.1.1",
            "2",
            "2.1",
            "Annex A",
            "Annex A.1",
        ]

        top = clauses_by_number["1"]
        assert top["title"] == "Scope"
        assert top["depth"] == 1
        assert top["parent_id"] is None
        assert top["page_number"] == 1
        assert "specifies requirements" in top["text"]

        nested = clauses_by_number["1.1.1"]
        assert nested["title"] == "Materials"
        assert nested["depth"] == 3
        assert nested["path"] == "1 > 1.1 > 1.1.1"
        assert nested["page_number"] == 1

        # Parent linkage: 1.1.1's parent_id must equal 1.1's clause id.
        assert nested["parent_id"] == clauses_by_number["1.1"]["id"]
        assert clauses_by_number["1.1"]["parent_id"] == top["id"]

        # Clause "2" is headed on page 1 but its body continues onto page 2's
        # heading boundary; the heading itself must stay associated with page 1.
        cross_page_clause = clauses_by_number["2"]
        assert cross_page_clause["page_number"] == 1

        # "2.1" heading itself appears on page 2.
        assert clauses_by_number["2.1"]["page_number"] == 2

        annex_a = clauses_by_number["Annex A"]
        annex_a1 = clauses_by_number["Annex A.1"]
        assert annex_a["depth"] == 1
        assert annex_a["parent_id"] is None
        assert annex_a1["depth"] == 2
        assert annex_a1["parent_id"] == annex_a["id"]
        assert annex_a1["path"] == "Annex A > Annex A.1"
