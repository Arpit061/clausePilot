from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_session
from app.schemas.search import (
    ClauseSearchResult,
    HybridClauseSearchResult,
    HybridSearchResponse,
    SearchResponse,
    SemanticClauseSearchResult,
    SemanticSearchResponse,
)
from app.services.retrieval.hybrid_search import search_clauses_hybrid
from app.services.retrieval.keyword_search import search_clauses
from app.services.retrieval.semantic_search import search_clauses_semantic

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
def search(
    q: str = Query(default=""),
    document_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> SearchResponse:
    matches = search_clauses(session, query=q, document_id=document_id, limit=limit)

    results = [
        ClauseSearchResult(
            clause_id=match.clause_id,
            document_id=match.document_id,
            number=match.number,
            title=match.title,
            snippet=match.snippet,
            page_number=match.page_number,
            score=match.score,
        )
        for match in matches
    ]

    return SearchResponse(query=q, document_id=document_id, results=results)


@router.get("/search/semantic", response_model=SemanticSearchResponse)
def semantic_search(
    q: str = Query(default=""),
    document_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> SemanticSearchResponse:
    matches = search_clauses_semantic(session, query=q, document_id=document_id, limit=limit)

    results = [
        SemanticClauseSearchResult(
            clause_id=match.clause_id,
            document_id=match.document_id,
            number=match.number,
            title=match.title,
            snippet=match.snippet,
            page_number=match.page_number,
            similarity=match.similarity,
        )
        for match in matches
    ]

    return SemanticSearchResponse(query=q, document_id=document_id, results=results)


@router.get("/search/hybrid", response_model=HybridSearchResponse)
def hybrid_search(
    q: str = Query(default=""),
    document_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> HybridSearchResponse:
    matches = search_clauses_hybrid(session, query=q, document_id=document_id, limit=limit)

    results = [
        HybridClauseSearchResult(
            clause_id=match.clause_id,
            document_id=match.document_id,
            number=match.number,
            title=match.title,
            snippet=match.snippet,
            page_number=match.page_number,
            keyword_score=match.keyword_score,
            semantic_score=match.semantic_score,
            hybrid_score=match.hybrid_score,
        )
        for match in matches
    ]

    return HybridSearchResponse(query=q, document_id=document_id, results=results)
