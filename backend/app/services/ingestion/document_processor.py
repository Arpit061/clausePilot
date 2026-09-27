from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Document
from app.db.repositories.clauses import add_clauses, set_clause_embeddings
from app.db.repositories.documents import add_pages, create_document, mark_failed, mark_ready
from app.services.ingestion.clause_extractor import extract_clauses
from app.services.ingestion.pdf_parser import PdfParseError, extract_pages
from app.services.llm.embeddings import EmbeddingProviderError, build_embedding_text, get_embedding_provider
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

    extracted = extract_clauses(pages)
    persisted_clauses = add_clauses(session, document, extracted) if extracted else []

    if persisted_clauses:
        try:
            provider = get_embedding_provider()
            texts = [
                build_embedding_text(number=clause.number, title=clause.title, text=clause.text)
                for clause in persisted_clauses
            ]
            vectors = provider.embed(texts)
            set_clause_embeddings(session, persisted_clauses, vectors)
        except EmbeddingProviderError as exc:
            # Pages and clauses are already committed and remain intact; only
            # the document's status reflects that semantic search isn't
            # available for it yet. A backfill can retry embedding generation
            # later without touching or re-extracting anything.
            mark_failed(session, document, f"Embedding generation failed: {exc}")
            return document

    mark_ready(session, document)
    return document
