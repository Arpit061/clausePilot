import re
import uuid
from pathlib import Path

_UNSAFE_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    name = _UNSAFE_CHARS.sub("_", name)
    return name or "upload"


def build_stored_path(upload_dir: str, original_filename: str) -> Path:
    safe_name = sanitize_filename(original_filename)
    unique_name = f"{uuid.uuid4()}_{safe_name}"
    return Path(upload_dir) / unique_name


def write_upload(destination: Path, content: bytes) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
