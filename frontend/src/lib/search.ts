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
