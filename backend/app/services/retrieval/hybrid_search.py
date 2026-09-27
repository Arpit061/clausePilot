from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.llm.embeddings import EmbeddingProvider
from app.services.retrieval.keyword_search import ClauseMatch, search_clauses
from app.services.retrieval.semantic_search import SemanticClauseMatch, search_clauses_semantic

# How much wider a candidate pool to pull from each underlying retriever
# before fusing and truncating to the requested limit. A clause that ranks
# just outside the final `limit` on one signal but strongly on the other
# would otherwise never get a chance to be fused in.
CANDIDATE_POOL_MULTIPLIER = 3


@dataclass
class HybridClauseMatch:
    clause_id: str
    document_id: str
    number: str
    title: str | None
    snippet: str
    page_number: int
    keyword_score: float | None
    semantic_score: float | None
    hybrid_score: float


def _fuse(
    keyword_matches: list[ClauseMatch],
    semantic_matches: list[SemanticClauseMatch],
    *,
    keyword_weight: float,
    semantic_weight: float,
    limit: int,
) -> list[HybridClauseMatch]:
    """Combine keyword and semantic candidates into unified, ranked results.

    Both signals are normalized to [0, 1] before being combined so that
    keyword's unbounded weighted-sum scale and semantic's cosine-similarity
    scale contribute comparably:
      - keyword: min-max normalized against the max score in this result set
        (keyword_search never returns a score <= 0, so the effective min is
        0).
      - semantic: cosine similarity is already bounded to [0, 1], so it is
        used as its own normalized value with no further rescaling.

    hybrid_score = keyword_weight * normalized_keyword
                 + semantic_weight * normalized_semantic

    A clause missing from one retriever's candidate set contributes 0 for
    that signal (its own score field stays None, distinguishing "not found by
    this retriever" from "found with among the lowest scores").
    """
    max_keyword_score = max((m.score for m in keyword_matches), default=0.0)

    combined: dict[str, dict[str, object]] = {}

    for match in keyword_matches:
        normalized_keyword = (match.score / max_keyword_score) if max_keyword_score > 0 else 0.0
        combined[match.clause_id] = {
            "document_id": match.document_id,
            "number": match.number,
            "title": match.title,
            "snippet": match.snippet,
            "page_number": match.page_number,
            "keyword_score": normalized_keyword,
            "semantic_score": None,
        }

    for match in semantic_matches:
        entry = combined.setdefault(
            match.clause_id,
            {
                "document_id": match.document_id,
                "number": match.number,
                "title": match.title,
                "snippet": match.snippet,
                "page_number": match.page_number,
                "keyword_score": None,
                "semantic_score": None,
            },
        )
        entry["semantic_score"] = match.similarity

    results: list[HybridClauseMatch] = []
    for clause_id, entry in combined.items():
        keyword_component = entry["keyword_score"] or 0.0
        semantic_component = entry["semantic_score"] or 0.0
        hybrid_score = keyword_weight * keyword_component + semantic_weight * semantic_component

        results.append(
            HybridClauseMatch(
                clause_id=clause_id,
                document_id=str(entry["document_id"]),
                number=str(entry["number"]),
                title=entry["title"],  # type: ignore[arg-type]
                snippet=str(entry["snippet"]),
                page_number=int(entry["page_number"]),  # type: ignore[arg-type]
                keyword_score=entry["keyword_score"],  # type: ignore[arg-type]
                semantic_score=entry["semantic_score"],  # type: ignore[arg-type]
                hybrid_score=hybrid_score,
            )
        )

    results.sort(key=lambda m: (-m.hybrid_score, m.page_number, m.number, m.clause_id))
    return results[:limit]


def search_clauses_hybrid(
    session: Session,
    *,
    query: str,
    document_id: str | None = None,
    limit: int = 20,
    keyword_weight: float | None = None,
    semantic_weight: float | None = None,
    embedding_provider: EmbeddingProvider | None = None,
) -> list[HybridClauseMatch]:
    raw_query = query.strip()
    if not raw_query:
        return []

    resolved_keyword_weight = settings.HYBRID_KEYWORD_WEIGHT if keyword_weight is None else keyword_weight
    resolved_semantic_weight = settings.HYBRID_SEMANTIC_WEIGHT if semantic_weight is None else semantic_weight

    candidate_limit = max(limit * CANDIDATE_POOL_MULTIPLIER, limit)

    keyword_matches = search_clauses(session, query=raw_query, document_id=document_id, limit=candidate_limit)
    semantic_matches = search_clauses_semantic(
        session,
        query=raw_query,
        document_id=document_id,
        limit=candidate_limit,
        provider=embedding_provider,
    )

    return _fuse(
        keyword_matches,
        semantic_matches,
        keyword_weight=resolved_keyword_weight,
        semantic_weight=resolved_semantic_weight,
        limit=limit,
    )
