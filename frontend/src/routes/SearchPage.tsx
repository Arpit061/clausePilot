import { useQuery } from '@tanstack/react-query'
import { FileSearch, Loader2, Search as SearchIcon, UploadCloud } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { SegmentedControl, type SegmentOption } from '@/components/common/segmented-control'
import { RowsSkeleton } from '@/components/common/skeleton'
import { UploadStandardButton } from '@/components/documents/upload-standard-button'
import { SearchPreview, SearchResultCard } from '@/components/search/search-result-card'
import { Button } from '@/components/ui/button'
import { useDocumentsQuery } from '@/hooks/use-documents'
import { describeError } from '@/lib/api-client'
import { type SearchMode, clauseHref, runSearch } from '@/lib/search'

const modeOptions: SegmentOption<SearchMode>[] = [
  { value: 'keyword', label: 'Keyword', description: 'Matches the words in clause numbers, titles and text.' },
  { value: 'semantic', label: 'Semantic', description: 'Matches the meaning of your query, even with different wording.' },
  { value: 'hybrid', label: 'Hybrid', description: 'Combines keyword and semantic scores.' },
]

const modeHints: Record<SearchMode, string> = {
  keyword: 'Best for a clause number, a defined term, or an exact phrase.',
  semantic: 'Best for describing a requirement in your own words.',
  hybrid: 'A balanced default when you are not sure which mode fits.',
}

function parseMode(value: string | null): SearchMode {
  return value === 'semantic' || value === 'hybrid' ? value : 'keyword'
}

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Search state lives in the URL so results survive refresh and back/forward,
  // and the header search box can start a search by just changing `q`.
  const submittedQuery = searchParams.get('q')?.trim() ?? ''
  const mode = parseMode(searchParams.get('mode'))
  const documentId = searchParams.get('document') ?? ''

  const [draft, setDraft] = useState(submittedQuery)
  const [syncedQuery, setSyncedQuery] = useState(submittedQuery)
  const [previewId, setPreviewId] = useState<string | null>(null)

  // When the query changes from outside (header search), refresh the input during render.
  if (syncedQuery !== submittedQuery) {
    setSyncedQuery(submittedQuery)
    setDraft(submittedQuery)
  }

  const { data: documents, isPending: documentsPending } = useDocumentsQuery()
  const hasDocuments = (documents?.length ?? 0) > 0

  const search = useQuery({
    queryKey: ['search', mode, submittedQuery, documentId],
    queryFn: () => runSearch(mode, { q: submittedQuery, documentId: documentId || undefined }),
    enabled: submittedQuery.length > 0,
  })

  const results = search.data?.results ?? []
  const activeHit = results.find((hit) => hit.clause_id === previewId) ?? results[0] ?? null
  const documentName = (id: string) => documents?.find((doc) => doc.id === id)?.filename ?? 'Unknown standard'

  function updateParams(changes: Record<string, string>) {
    setPreviewId(null)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, value)
        else next.delete(key)
      })
      return next
    })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateParams({ q: draft.trim() })
  }

  function handleModeChange(next: SearchMode) {
    updateParams({ mode: next === 'keyword' ? '' : next })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Search engineering standards"
        description="Find the requirement, inspection method, or testing procedure you need, then open its exact clause."
      />

      {!documentsPending && !hasDocuments ? (
        <EmptyState
          icon={UploadCloud}
          title="Nothing to search yet"
          description="Upload a standard first. Once it has finished processing, its clauses become searchable here."
          action={<UploadStandardButton label="Upload your first standard" />}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" role="search">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Search query</span>
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Search for a requirement, inspection method, testing procedure…"
                  autoFocus={!submittedQuery}
                  className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>
              <Button type="submit" size="lg" disabled={draft.trim().length === 0} className="sm:w-28">
                Search
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SegmentedControl options={modeOptions} value={mode} onChange={handleModeChange} label="Search mode" />
              <div className="flex items-center gap-2">
                <label htmlFor="document-filter" className="text-sm text-muted-foreground">
                  Standard
                </label>
                <select
                  id="document-filter"
                  value={documentId}
                  onChange={(event) => updateParams({ document: event.target.value })}
                  className="h-8 max-w-xs rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">All standards</option>
                  {documents?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{modeHints[mode]}</p>
          </form>

          {submittedQuery.length === 0 && (
            <EmptyState
              icon={FileSearch}
              title="Start with a clause number or a term"
              description='Try "1.1.1", "hydrostatic testing", or describe a requirement in your own words with Semantic mode.'
            />
          )}

          {submittedQuery.length > 0 && search.isPending && (
            <div className="flex flex-col gap-3" aria-live="polite">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Searching…
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <RowsSkeleton rows={3} />
              </div>
            </div>
          )}

          {submittedQuery.length > 0 && search.isError && (
            <ErrorState
              message={describeError(search.error, 'Search failed. Please try again.')}
              onRetry={() => search.refetch()}
              isRetrying={search.isFetching}
            />
          )}

          {submittedQuery.length > 0 && search.isSuccess && results.length === 0 && (
            <EmptyState
              icon={FileSearch}
              title="No matching clauses"
              description={
                mode === 'keyword'
                  ? 'Check the spelling, try a shorter term, or switch to Semantic mode to search by meaning.'
                  : 'Try different wording, or search a specific standard.'
              }
            />
          )}

          {submittedQuery.length > 0 && search.isSuccess && results.length > 0 && activeHit && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <section aria-label="Search results" className="flex min-w-0 flex-col gap-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {results.length} {results.length === 1 ? 'result' : 'results'} for “{submittedQuery}” in{' '}
                  {mode === 'keyword' ? 'Keyword' : mode === 'semantic' ? 'Semantic' : 'Hybrid'} mode
                  {documentId ? ` in ${documentName(documentId)}` : ''}
                </p>
                <ul className="flex flex-col gap-2">
                  {results.map((hit) => (
                    <li key={hit.clause_id}>
                      <SearchResultCard
                        hit={hit}
                        mode={mode}
                        query={submittedQuery}
                        documentName={documentName(hit.document_id)}
                        isPreviewed={hit.clause_id === activeHit.clause_id}
                        onPreview={() => setPreviewId(hit.clause_id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <div className="hidden lg:sticky lg:top-20 lg:block">
                <SearchPreview
                  hit={activeHit}
                  mode={mode}
                  documentName={documentName(activeHit.document_id)}
                  onOpen={() => navigate(clauseHref(activeHit))}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
