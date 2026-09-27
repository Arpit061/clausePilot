import { useQuery } from '@tanstack/react-query'
import { AlertCircle, FileText, Loader2, Search as SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { listDocuments } from '@/lib/documents'
import {
  type HybridSearchResponse,
  type SearchResponse,
  type SemanticSearchResponse,
  searchClauses,
  searchClausesHybrid,
  searchClausesSemantic,
} from '@/lib/search'

type SearchMode = 'keyword' | 'semantic' | 'hybrid'

interface NormalizedResult {
  clause_id: string
  document_id: string
  number: string
  title: string | null
  snippet: string
  page_number: number
  relevanceLabel: string
  breakdown?: { keyword: number | null; semantic: number | null }
}

const modeOptions: { value: SearchMode; label: string; description: string }[] = [
  { value: 'keyword', label: 'Keyword', description: 'Exact and partial text matches.' },
  { value: 'semantic', label: 'Semantic', description: 'Meaning-based, embedding similarity.' },
  { value: 'hybrid', label: 'Hybrid', description: 'Combines keyword and semantic retrieval.' },
]

export function SearchPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<SearchMode>('keyword')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [documentId, setDocumentId] = useState('')

  const { data: documents } = useQuery({ queryKey: ['documents'], queryFn: listDocuments })

  const {
    data: searchResponse,
    isFetching,
    isError,
    error,
  } = useQuery<SearchResponse | SemanticSearchResponse | HybridSearchResponse>({
    queryKey: ['search', mode, submittedQuery, documentId],
    queryFn: () => {
      const params = { q: submittedQuery, documentId: documentId || undefined }
      if (mode === 'keyword') return searchClauses(params)
      if (mode === 'semantic') return searchClausesSemantic(params)
      return searchClausesHybrid(params)
    },
    enabled: submittedQuery.length > 0,
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmittedQuery(query.trim())
  }

  function openResult(resultDocumentId: string, clauseId: string) {
    navigate(`/documents/${resultDocumentId}?clause=${clauseId}`)
  }

  function documentFilename(id: string) {
    return documents?.find((doc) => doc.id === id)?.filename ?? 'Unknown document'
  }

  const hasSearched = submittedQuery.length > 0

  const rawResults = searchResponse?.results ?? []
  const results: NormalizedResult[] = rawResults.map((result) => {
    if ('hybrid_score' in result) {
      return {
        ...result,
        relevanceLabel: `Hybrid relevance: ${result.hybrid_score.toFixed(2)}`,
        breakdown: { keyword: result.keyword_score, semantic: result.semantic_score },
      }
    }
    if ('similarity' in result) {
      return { ...result, relevanceLabel: `Similarity ${(result.similarity * 100).toFixed(0)}%` }
    }
    return { ...result, relevanceLabel: `Relevance ${result.score.toFixed(0)}` }
  })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-muted-foreground">
          Search clause numbers, titles, and text across your uploaded standards.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="inline-flex w-fit rounded-lg bg-muted p-1 text-sm">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              title={option.description}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                mode === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              mode === 'keyword' ? 'e.g. corrosion resistant, 1.1.1, Annex A' : 'Describe what you need, in plain language'
            }
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
      </div>

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
            <CardDescription>Try a different query, clause number, or search mode.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}

      {hasSearched && !isFetching && !isError && results.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          {results.map((result) => (
            <Card key={result.clause_id}>
              <button
                type="button"
                onClick={() => openResult(result.document_id, result.clause_id)}
                className="w-full text-left"
              >
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-baseline gap-2 text-base">
                    <span className="font-mono text-sm text-muted-foreground">{result.number}</span>
                    <span>{result.title ?? '(untitled clause)'}</span>
                  </CardTitle>
                  <CardDescription className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" />
                        {documentFilename(result.document_id)}
                      </span>
                      <span>Page {result.page_number}</span>
                      <span className="font-medium text-foreground">{result.relevanceLabel}</span>
                    </span>
                    {result.breakdown && (
                      <span className="text-xs text-muted-foreground/80">
                        Keyword: {result.breakdown.keyword === null ? '—' : result.breakdown.keyword.toFixed(2)}
                        {'  ·  '}
                        Semantic: {result.breakdown.semantic === null ? '—' : result.breakdown.semantic.toFixed(2)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{result.snippet}</CardContent>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
