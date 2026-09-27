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


class SemanticClauseSearchResult(BaseModel):
    clause_id: str
    document_id: str
    number: str
    title: str | None
    snippet: str
    page_number: int
    similarity: float


class SemanticSearchResponse(BaseModel):
    query: str
    document_id: str | None
    results: list[SemanticClauseSearchResult]


class HybridClauseSearchResult(BaseModel):
    clause_id: str
    document_id: str
    number: str
    title: str | None
    snippet: str
    page_number: int
    keyword_score: float | None
    semantic_score: float | None
    hybrid_score: float


class HybridSearchResponse(BaseModel):
    query: str
    document_id: str | None
    results: list[HybridClauseSearchResult]
