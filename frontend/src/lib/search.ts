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
