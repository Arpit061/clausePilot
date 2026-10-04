from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db.database import check_database_connection
from app.main import app
from app.services.ingestion import document_processor
from app.services.storage import R2FileStorage
from tests.unit.test_storage import FakeS3Client

FIXTURE_PDF = Path(__file__).resolve().parents[1] / "fixtures" / "sample.pdf"

pytestmark = pytest.mark.skipif(
    not check_database_connection(),
    reason="Requires a running PostgreSQL instance (see docker-compose.yml).",
)


class RecordingR2Storage(R2FileStorage):
    """Records every temporary path handed to the parser so the test can check cleanup."""

    def __init__(self, client, bucket):
        super().__init__(client, bucket)
        self.temp_paths: list[Path] = []

    def open_local(self, key):
        context = super().open_local(key)

        class Wrapper:
            def __enter__(inner):
                path = context.__enter__()
                self.temp_paths.append(path)
                return path

            def __exit__(inner, *exc):
                return context.__exit__(*exc)

        return Wrapper()


def test_upload_through_r2_storage_processes_and_cleans_up(monkeypatch) -> None:
    client = FakeS3Client()
    storage = RecordingR2Storage(client, "clausepilot-test")
    monkeypatch.setattr(document_processor, "get_file_storage", lambda: storage)

    with TestClient(app) as http:
        response = http.post(
            "/documents",
            files={"file": ("r2-sample.pdf", FIXTURE_PDF.read_bytes(), "application/pdf")},
        )

        assert response.status_code == 201
        uploaded = response.json()
        assert uploaded["status"] == "ready"
        assert uploaded["page_count"] == 1

        # The original bytes live in the bucket under the stored key, not on local disk.
        stored_keys = [key for (_, key) in client.objects]
        assert len(stored_keys) == 1
        assert not Path(stored_keys[0]).is_absolute()

        # The parser read a temporary local copy, and that copy is gone now.
        assert storage.temp_paths, "processing should have requested a local copy"
        assert not any(path.exists() for path in storage.temp_paths)

        detail = http.get(f"/documents/{uploaded['id']}").json()
        assert len(detail["pages"]) == 1
