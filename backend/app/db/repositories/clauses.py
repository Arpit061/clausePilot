import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Clause, Document
from app.services.ingestion.clause_extractor import ExtractedClause


def add_clauses(session: Session, document: Document, extracted_clauses: list[ExtractedClause]) -> list[Clause]:
    number_to_id: dict[str, str] = {}
    clauses: list[Clause] = []

    for item in extracted_clauses:
        clause_id = str(uuid.uuid4())
        parent_id = number_to_id.get(item.parent_number) if item.parent_number else None

        clause = Clause(
            id=clause_id,
            document_id=document.id,
            parent_id=parent_id,
            number=item.number,
            title=item.title,
            text=item.text,
            path=item.path,
            depth=item.depth,
            page_number=item.page_number,
            order_index=item.order_index,
        )
        session.add(clause)
        clauses.append(clause)
        number_to_id.setdefault(item.number, clause_id)

    session.commit()
    return clauses


def list_clauses_for_document(session: Session, document_id: str) -> list[Clause]:
    stmt = select(Clause).where(Clause.document_id == document_id).order_by(Clause.order_index)
    return list(session.execute(stmt).scalars())


def set_clause_embeddings(session: Session, clauses: list[Clause], vectors: list[list[float]]) -> None:
    for clause, vector in zip(clauses, vectors, strict=True):
        clause.embedding = vector
    session.commit()


def list_clauses_missing_embeddings(session: Session, document_id: str | None = None) -> list[Clause]:
    stmt = select(Clause).where(Clause.embedding.is_(None)).order_by(Clause.document_id, Clause.order_index)
    if document_id:
        stmt = stmt.where(Clause.document_id == document_id)
    return list(session.execute(stmt).scalars())
