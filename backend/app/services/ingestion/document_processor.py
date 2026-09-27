from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Document
from app.db.repositories.documents import add_pages, create_document, mark_failed, mark_ready
from app.services.ingestion.pdf_parser import PdfParseError, extract_pages
from app.utils.files import build_stored_path, sanitize_filename, write_upload


class UnsupportedFileTypeError(Exception):
    pass


class FileTooLargeError(Exception):
    pass


def process_upload(session: Session, *, filename: str, content_type: str, content: bytes) -> Document:
    if content_type != "application/pdf":
        raise UnsupportedFileTypeError("Only PDF files are supported.")

    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise FileTooLargeError(
            f"File exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES} bytes."
        )

    stored_path = build_stored_path(settings.UPLOAD_DIR, filename)
    write_upload(stored_path, content)

    document = create_document(
        session,
        filename=sanitize_filename(filename),
        stored_path=str(stored_path),
        content_type=content_type,
        size_bytes=len(content),
    )

    try:
        pages = extract_pages(stored_path)
    except PdfParseError as exc:
        mark_failed(session, document, str(exc))
        return document

    add_pages(session, document, pages)
    mark_ready(session, document)
    return document
