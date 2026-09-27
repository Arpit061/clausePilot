from pydantic import BaseModel


class ClauseSearchResult(BaseModel):
    clause_id: str
    document_id: str
    number: str
    title: str | None
    snippet: str
    page_number: int
    score: float


class SearchResponse(BaseModel):
    query: str
    document_id: str | None
    results: list[ClauseSearchResult]
