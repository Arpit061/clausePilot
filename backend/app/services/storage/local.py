from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from app.utils.files import build_stored_path, write_upload


class LocalFileStorage:
    """Stores PDFs on the local filesystem under `base_dir`.

    The key is the absolute path of the file, which is exactly what earlier
    versions wrote into `documents.stored_path`, so existing rows stay valid.
    """

    def __init__(self, base_dir: str) -> None:
        self._base_dir = base_dir

    def save(self, original_filename: str, content: bytes) -> str:
        destination = build_stored_path(self._base_dir, original_filename)
        write_upload(destination, content)
        return str(destination)

    @contextmanager
    def open_local(self, key: str) -> Iterator[Path]:
        # The file is already local. It is read in place and must not be deleted here.
        yield Path(key)
