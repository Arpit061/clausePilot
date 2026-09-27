from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_session
from app.schemas.search import ClauseSearchResult, SearchResponse
from app.services.retrieval.keyword_search import search_clauses

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
