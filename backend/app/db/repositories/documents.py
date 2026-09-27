from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Document, DocumentPage, DocumentStatus


def create_document(
    session: Session,
    *,
    filename: str,
    stored_path: str,
    content_type: str,
    size_bytes: int,
) -> Document:
    document = Document(
        filename=filename,
        stored_path=stored_path,
        content_type=content_type,
        size_bytes=size_bytes,
        status=DocumentStatus.PROCESSING,
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


def add_pages(session: Session, document: Document, page_texts: list[str]) -> None:
    for index, text in enumerate(page_texts, start=1):
        session.add(
            DocumentPage(
                document_id=document.id,
                page_number=index,
                text=text,
                char_count=len(text),
            )
        )
    document.page_count = len(page_texts)
    session.commit()


def mark_ready(session: Session, document: Document) -> None:
    document.status = DocumentStatus.READY
    document.error_message = None
    session.commit()


def mark_failed(session: Session, document: Document, error_message: str) -> None:
    document.status = DocumentStatus.FAILED
    document.error_message = error_message
    session.commit()


def list_documents(session: Session) -> list[Document]:
    return list(session.execute(select(Document).order_by(Document.created_at.desc())).scalars())


def get_document(session: Session, document_id: str) -> Document | None:
    return session.get(Document, document_id)


def get_document_with_pages(session: Session, document_id: str) -> Document | None:
    stmt = select(Document).where(Document.id == document_id).options(selectinload(Document.pages))
    return session.execute(stmt).scalar_one_or_none()
