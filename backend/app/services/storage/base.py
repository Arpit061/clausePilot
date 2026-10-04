from contextlib import AbstractContextManager
from pathlib import Path
from typing import Protocol


class FileStorage(Protocol):
    """Where uploaded PDFs live.

    The ingestion pipeline only talks to this interface:

    - `save` persists the bytes and returns an opaque key, which is stored on
      the Document row (`stored_path`).
    - `open_local` gives a local filesystem path holding the PDF for `key`,
      for as long as the `with` block runs. Object stores download to a
      temporary file and delete it on exit; the local backend yields the
      file in place and leaves it alone.
    """

    def save(self, original_filename: str, content: bytes) -> str:
        """Persist the bytes and return the key to store on the document."""
        ...

    def open_local(self, key: str) -> AbstractContextManager[Path]:
        """Context manager yielding a readable local path for `key`."""
        ...

