import os
import tempfile
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from app.utils.files import sanitize_filename


class R2FileStorage:
    """Stores PDFs in a Cloudflare R2 bucket through its S3-compatible API.

    The client is injected so the storage logic can be tested without network
    access. `save` uploads the bytes under a unique object key. `open_local`
    downloads the object to a temporary file so the PDF parser can read it,
    and removes that file when the block exits, even if processing fails.
    """

    def __init__(self, client: Any, bucket: str) -> None:
        self._client = client
        self._bucket = bucket

    def save(self, original_filename: str, content: bytes) -> str:
        key = f"{uuid.uuid4()}_{sanitize_filename(original_filename)}"
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=content,
            ContentType="application/pdf",
        )
        return key

    @contextmanager
    def open_local(self, key: str) -> Iterator[Path]:
        descriptor, temp_name = tempfile.mkstemp(prefix="clausepilot_", suffix=".pdf")
        os.close(descriptor)
        temp_path = Path(temp_name)
        try:
            with temp_path.open("wb") as handle:
                self._client.download_fileobj(self._bucket, key, handle)
            yield temp_path
        finally:
            temp_path.unlink(missing_ok=True)
