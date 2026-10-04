import tempfile
from pathlib import Path

import pytest

import app.services.storage.r2 as r2_module
from app.core.config import Settings
from app.services.storage import LocalFileStorage, R2FileStorage, build_file_storage


class FakeS3Client:
    """In-memory stand-in for the boto3 S3 client. No network, no credentials."""

    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}
        self.put_calls: list[dict] = []

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> None:
        self.put_calls.append({"Bucket": Bucket, "Key": Key, "ContentType": ContentType})
        self.objects[(Bucket, Key)] = Body

    def download_fileobj(self, Bucket: str, Key: str, Fileobj) -> None:
        if (Bucket, Key) not in self.objects:
            raise KeyError(f"no such object: {Key}")
        Fileobj.write(self.objects[(Bucket, Key)])


def r2_settings(**overrides) -> Settings:
    values = {
        "STORAGE_BACKEND": "r2",
        "R2_ENDPOINT_URL": "https://account.r2.cloudflarestorage.com",
        "R2_ACCESS_KEY_ID": "test-access-key",
        "R2_SECRET_ACCESS_KEY": "test-secret",
        "R2_BUCKET_NAME": "clausepilot-test",
        "_env_file": None,
    }
    values.update(overrides)
    return Settings(**values)


# --- backend selection and configuration -------------------------------------------------

def test_storage_backend_defaults_to_local(monkeypatch) -> None:
    monkeypatch.delenv("STORAGE_BACKEND", raising=False)
    assert Settings(_env_file=None).STORAGE_BACKEND == "local"


def test_storage_backend_is_case_and_whitespace_tolerant() -> None:
    assert Settings(STORAGE_BACKEND=" R2 ", R2_ENDPOINT_URL="x", R2_ACCESS_KEY_ID="x",
                    R2_SECRET_ACCESS_KEY="x", R2_BUCKET_NAME="x", _env_file=None).STORAGE_BACKEND == "r2"


def test_r2_backend_requires_all_r2_settings() -> None:
    with pytest.raises(ValueError, match="R2_BUCKET_NAME"):
        r2_settings(R2_BUCKET_NAME="")


def test_unknown_storage_backend_is_rejected() -> None:
    with pytest.raises(ValueError):
        Settings(STORAGE_BACKEND="s3", _env_file=None)


def test_factory_selects_local_backend_by_default(tmp_path: Path) -> None:
    storage = build_file_storage(Settings(UPLOAD_DIR=str(tmp_path), _env_file=None))
    assert isinstance(storage, LocalFileStorage)


def test_factory_selects_r2_backend(monkeypatch) -> None:
    created = {}

    def fake_client(cfg):
        created["endpoint"] = cfg.R2_ENDPOINT_URL
        return FakeS3Client()

    monkeypatch.setattr("app.services.storage.factory.create_r2_client", fake_client)
    storage = build_file_storage(r2_settings())
    assert isinstance(storage, R2FileStorage)
    assert created["endpoint"] == "https://account.r2.cloudflarestorage.com"


# --- local backend ------------------------------------------------------------------------

def test_local_storage_round_trip(tmp_path: Path) -> None:
    storage = LocalFileStorage(str(tmp_path))
    key = storage.save("My Standard (v2).pdf", b"%PDF-1.4 test")

    with storage.open_local(key) as path:
        assert path.read_bytes() == b"%PDF-1.4 test"
    assert path.exists(), "local files are read in place and must survive the block"
    assert path.name.endswith("_My_Standard_v2_.pdf")


# --- R2 backend ---------------------------------------------------------------------------

def test_r2_save_uploads_object_and_returns_key() -> None:
    client = FakeS3Client()
    storage = R2FileStorage(client, "bucket-a")

    key = storage.save("Standard 1.pdf", b"%PDF data")

    assert "/" not in key and "\\" not in key, "R2 keys are object names, not filesystem paths"
    assert key.endswith("_Standard_1.pdf")
    assert client.objects[("bucket-a", key)] == b"%PDF data"
    assert client.put_calls[0]["ContentType"] == "application/pdf"


def test_r2_open_local_downloads_then_removes_temp_file() -> None:
    client = FakeS3Client()
    storage = R2FileStorage(client, "bucket-a")
    key = storage.save("doc.pdf", b"%PDF bytes")

    with storage.open_local(key) as path:
        assert path.read_bytes() == b"%PDF bytes"
        seen = path

    assert not seen.exists(), "temporary download must be deleted after the block"


def test_r2_open_local_cleans_up_when_processing_raises() -> None:
    client = FakeS3Client()
    storage = R2FileStorage(client, "bucket-a")
    key = storage.save("doc.pdf", b"%PDF bytes")
    seen: list[Path] = []

    with pytest.raises(RuntimeError):
        with storage.open_local(key) as path:
            seen.append(path)
            raise RuntimeError("parser failed")

    assert not seen[0].exists()


def test_r2_open_local_cleans_up_when_download_fails(monkeypatch) -> None:
    storage = R2FileStorage(FakeS3Client(), "bucket-a")
    temp_paths: list[Path] = []
    original_mkstemp = tempfile.mkstemp

    def recording_mkstemp(*args, **kwargs):
        descriptor, name = original_mkstemp(*args, **kwargs)
        temp_paths.append(Path(name))
        return descriptor, name

    monkeypatch.setattr(r2_module.tempfile, "mkstemp", recording_mkstemp)

    with pytest.raises(KeyError):
        with storage.open_local("missing-key.pdf"):
            pass

    assert temp_paths and not temp_paths[0].exists()
