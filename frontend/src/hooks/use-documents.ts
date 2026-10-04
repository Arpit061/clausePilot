import { useQueries, useQuery } from '@tanstack/react-query'

import { type DocumentSummary, getDocument, listDocuments } from '@/lib/documents'

const PROCESSING_POLL_MS = 4000

/**
 * Query keys are shared so that invalidating `['documents']` (after an upload)
 * refreshes the list and every per-document detail in one step.
 */
export const documentQueryKeys = {
  list: ['documents'] as const,
  detail: (id: string) => ['documents', id] as const,
}

/** Lists standards, polling while any of them is still being processed. */
export function useDocumentsQuery() {
  return useQuery({
    queryKey: documentQueryKeys.list,
    queryFn: listDocuments,
    refetchInterval: (query) =>
      query.state.data?.some((doc) => doc.status === 'processing') ? PROCESSING_POLL_MS : false,
  })
}

/** Loads one standard with its pages and clauses, polling while it is processing. */
export function useDocumentQuery(id: string | undefined) {
  return useQuery({
    queryKey: documentQueryKeys.detail(id ?? ''),
    queryFn: () => getDocument(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? PROCESSING_POLL_MS : false),
  })
}

/**
 * Clause counts only exist on the detail payload, so ready standards are
 * fetched individually. The detail cache is shared with the detail page.
 */
export function useClauseCounts(documents: DocumentSummary[]) {
  const readyIds = documents.filter((doc) => doc.status === 'ready').map((doc) => doc.id)

  const results = useQueries({
    queries: readyIds.map((id) => ({
      queryKey: documentQueryKeys.detail(id),
      queryFn: () => getDocument(id),
      staleTime: 60_000,
    })),
  })

  const counts = new Map<string, number>()
  readyIds.forEach((id, index) => {
    const data = results[index].data
    if (data) {
      counts.set(id, data.clauses.length)
    }
  })

  return {
    counts,
    isPending: results.some((result) => result.isPending),
    total: Array.from(counts.values()).reduce((sum, count) => sum + count, 0),
  }
}
