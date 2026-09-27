import { useQuery } from '@tanstack/react-query'
import { AlertCircle, FileText, Loader2, Search as SearchIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDocument, listDocuments } from '@/lib/documents'
import { ApiError } from '@/lib/api-client'
import { type ClauseSearchResult, searchClauses } from '@/lib/search'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [expanded, setExpanded] = useState<{ documentId: string; clauseId: string } | null>(null)

  const { data: documents } = useQuery({ queryKey: ['documents'], queryFn: listDocuments })

  const {
    data: searchResponse,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['search', submittedQuery, documentId],
    queryFn: () => searchClauses({ q: submittedQuery, documentId: documentId || undefined }),
    enabled: submittedQuery.length > 0,
  })

  const expandedDetail = useQuery({
    queryKey: ['documents', expanded?.documentId],
    queryFn: () => getDocument(expanded!.documentId),
    enabled: expanded !== null,
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmittedQuery(query.trim())
    setExpanded(null)
  }

  function toggleExpanded(result: ClauseSearchResult) {
    setExpanded((current) =>
      current?.clauseId === result.clause_id
        ? null
        : { documentId: result.document_id, clauseId: result.clause_id }
    )
  }

  function documentFilename(id: string) {
    return documents?.find((doc) => doc.id === id)?.filename ?? 'Unknown document'
  }

  const hasSearched = submittedQuery.length > 0
  const results = searchResponse?.results ?? []

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-muted-foreground">
          Search clause numbers, titles, and text across your uploaded standards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. corrosion resistant, 1.1.1, Annex A"
          className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          value={documentId}
          onChange={(event) => setDocumentId(event.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm sm:w-56"
        >
          <option value="">All documents</option>
          {documents?.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.filename}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={query.trim().length === 0}>
          <SearchIcon />
          Search
        </Button>
      </form>

      {!hasSearched && (
        <p className="text-sm text-muted-foreground">Enter a query above to search your clauses.</p>
      )}

      {hasSearched && isFetching && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching…
        </p>
      )}

      {hasSearched && isError && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" />
          {error instanceof ApiError ? error.message : 'Search failed.'}
        </p>
      )}

      {hasSearched && !isFetching && !isError && results.length === 0 && (
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="text-base">No matching clauses</CardTitle>
            <CardDescription>Try a different query or clause number.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}

      {hasSearched && !isFetching && !isError && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((result) => {
            const isExpanded = expanded?.clauseId === result.clause_id
            return (
              <Card key={result.clause_id}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(result)}
                  className="w-full text-left"
                >
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-baseline gap-2 text-base">
                      <span className="font-mono text-sm text-muted-foreground">{result.number}</span>
                      <span>{result.title ?? '(untitled clause)'}</span>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" />
                        {documentFilename(result.document_id)}
                      </span>
                      <span>Page {result.page_number}</span>
                      <span>Relevance {result.score.toFixed(0)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{result.snippet}</CardContent>
                </button>

                {isExpanded && (
                  <CardContent className="border-t pt-4 text-sm">
                    {expandedDetail.isFetching && (
                      <p className="text-muted-foreground">Loading full clause…</p>
                    )}
                    {expandedDetail.data &&
                      (() => {
                        const clause = expandedDetail.data.clauses.find((c) => c.id === result.clause_id)
                        if (!clause) {
                          return <p className="text-muted-foreground">Clause detail unavailable.</p>
                        }
                        return (
                          <div className="flex flex-col gap-2">
                            <p className="font-mono text-xs text-muted-foreground">{clause.path}</p>
                            <p className="whitespace-pre-wrap">{clause.text || '(no body text)'}</p>
                          </div>
                        )
                      })()}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
