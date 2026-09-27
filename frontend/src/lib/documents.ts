import { apiClient } from '@/lib/api-client'

export type DocumentStatus = 'processing' | 'ready' | 'failed'

export interface DocumentSummary {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  page_count: number
  status: DocumentStatus
  error_message: string | null
  created_at: string
}

export interface DocumentPage {
  page_number: number
  char_count: number
}

export interface DocumentDetail extends DocumentSummary {
  pages: DocumentPage[]
}

interface DocumentListResponse {
  documents: DocumentSummary[]
}

export function listDocuments() {
  return apiClient.get<DocumentListResponse>('/documents').then((res) => res.documents)
}

export function getDocument(id: string) {
  return apiClient.get<DocumentDetail>(`/documents/${id}`)
}

export function uploadDocument(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post<DocumentSummary>('/documents', formData)
}
