import { apiClient } from '@/lib/api-client'

export interface ClauseSearchResult {
  clause_id: string
  document_id: string
  number: string
  title: string | null
  snippet: string
  page_number: number
  score: number
}

export interface SearchResponse {
  query: string
  document_id: string | null
  results: ClauseSearchResult[]
}

export interface SemanticClauseSearchResult {
  clause_id: string
  document_id: string
  number: string
  title: string | null
  snippet: string
  page_number: number
  similarity: number
}

export interface SemanticSearchResponse {
  query: string
  document_id: string | null
  results: SemanticClauseSearchResult[]
}

export interface HybridClauseSearchResult {
  clause_id: string
  document_id: string
  number: string
  title: string | null
  snippet: string
  page_number: number
  keyword_score: number | null
  semantic_score: number | null
  hybrid_score: number
}

export interface HybridSearchResponse {
  query: string
  document_id: string | null
  results: HybridClauseSearchResult[]
}

export interface SearchParams {
  q: string
  documentId?: string
}

export function searchClauses({ q, documentId }: SearchParams) {
  const params = new URLSearchParams({ q })
  if (documentId) {
    params.set('document_id', documentId)
  }
  return apiClient.get<SearchResponse>(`/search?${params.toString()}`)
}

export function searchClausesSemantic({ q, documentId }: SearchParams) {
  const params = new URLSearchParams({ q })
  if (documentId) {
    params.set('document_id', documentId)
  }
  return apiClient.get<SemanticSearchResponse>(`/search/semantic?${params.toString()}`)
}

export function searchClausesHybrid({ q, documentId }: SearchParams) {
  const params = new URLSearchParams({ q })
  if (documentId) {
    params.set('document_id', documentId)
  }
  return apiClient.get<HybridSearchResponse>(`/search/hybrid?${params.toString()}`)
}

export type SearchMode = 'keyword' | 'semantic' | 'hybrid'

export const modeScoreLabel: Record<SearchMode, string> = {
  keyword: 'Score',
  semantic: 'Similarity',
  hybrid: 'Hybrid',
}

/**
 * One result shape for all three modes, so the UI never branches on which
 * endpoint produced it. `score` is the mode's primary score; the breakdown is
 * only populated for hybrid, where both component scores are returned.
 */
export interface SearchHit {
  clause_id: string
  document_id: string
  number: string
  title: string | null
  snippet: string
  page_number: number
  score: number
  breakdown: { keyword: number | null; semantic: number | null } | null
}

export function clauseHref(hit: Pick<SearchHit, 'document_id' | 'clause_id'>) {
  return `/documents/${hit.document_id}?clause=${hit.clause_id}`
}

export interface SearchResults {
  query: string
  results: SearchHit[]
}

export async function runSearch(mode: SearchMode, params: SearchParams): Promise<SearchResults> {
  if (mode === 'semantic') {
    const response = await searchClausesSemantic(params)
    return {
      query: response.query,
      results: response.results.map((r) => ({
        clause_id: r.clause_id,
        document_id: r.document_id,
        number: r.number,
        title: r.title,
        snippet: r.snippet,
        page_number: r.page_number,
        score: r.similarity,
        breakdown: null,
      })),
    }
  }

  if (mode === 'hybrid') {
    const response = await searchClausesHybrid(params)
    return {
      query: response.query,
      results: response.results.map((r) => ({
        clause_id: r.clause_id,
        document_id: r.document_id,
        number: r.number,
        title: r.title,
        snippet: r.snippet,
        page_number: r.page_number,
        score: r.hybrid_score,
        breakdown: { keyword: r.keyword_score, semantic: r.semantic_score },
      })),
    }
  }

  const response = await searchClauses(params)
  return {
    query: response.query,
    results: response.results.map((r) => ({
      clause_id: r.clause_id,
      document_id: r.document_id,
      number: r.number,
      title: r.title,
      snippet: r.snippet,
      page_number: r.page_number,
      score: r.score,
      breakdown: null,
    })),
  }
}
