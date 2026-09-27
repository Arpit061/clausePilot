from sqlalchemy.orm import Session

from app.db.repositories.clauses import list_clauses_missing_embeddings, set_clause_embeddings
from app.services.llm.embeddings import EmbeddingProvider, build_embedding_text, get_embedding_provider


def backfill_missing_embeddings(
    session: Session,
    *,
    document_id: str | None = None,
    batch_size: int = 50,
    provider: EmbeddingProvider | None = None,
) -> int:
    """Generate embeddings for any persisted clauses that don't have one yet.

    Safe to run repeatedly and does not touch clauses that already have an
    embedding, so it only ever fills in gaps -- from a prior embedding
    failure, or from documents processed before semantic search existed.
    """
    provider = provider or get_embedding_provider()
    pending = list_clauses_missing_embeddings(session, document_id=document_id)

    updated = 0
    for start in range(0, len(pending), batch_size):
        batch = pending[start : start + batch_size]
        texts = [build_embedding_text(number=c.number, title=c.title, text=c.text) for c in batch]
        vectors = provider.embed(texts)
        set_clause_embeddings(session, batch, vectors)
        updated += len(batch)

    return updated
