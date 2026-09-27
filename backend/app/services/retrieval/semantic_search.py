from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Clause
from app.services.llm.embeddings import EmbeddingProvider, get_embedding_provider

SNIPPET_MAX_LENGTH = 220


@dataclass
class SemanticClauseMatch:
    clause_id: str
    document_id: str
    number: str
    title: str | None
    snippet: str
    page_number: int
    similarity: float


def _snippet(text: str, title: str | None) -> str:
    base = text.strip() or (title or "")
    if len(base) <= SNIPPET_MAX_LENGTH:
        return base
    return base[:SNIPPET_MAX_LENGTH].rstrip() + "…"


def search_clauses_semantic(
    session: Session,
    *,
    query: str,
    document_id: str | None = None,
    limit: int = 20,
    provider: EmbeddingProvider | None = None,
) -> list[SemanticClauseMatch]:
    raw_query = query.strip()
    if not raw_query:
        return []

    provider = provider or get_embedding_provider()
    query_vector = provider.embed([raw_query])[0]

    # pgvector's cosine_distance is `1 - cosine_similarity`, so ordering by it
    # ascending is the same as ordering by similarity descending; we convert
    # back to a similarity score for the API response.
    distance = Clause.embedding.cosine_distance(query_vector).label("distance")

    stmt = select(Clause, distance).where(Clause.embedding.is_not(None))
    if document_id:
        stmt = stmt.where(Clause.document_id == document_id)
    stmt = stmt.order_by(distance, Clause.id).limit(limit)

    rows = session.execute(stmt).all()

    return [
        SemanticClauseMatch(
            clause_id=clause.id,
            document_id=clause.document_id,
            number=clause.number,
            title=clause.title,
            snippet=_snippet(clause.text, clause.title),
            page_number=clause.page_number,
            similarity=max(0.0, 1.0 - float(dist)),
        )
        for clause, dist in rows
    ]
