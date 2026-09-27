import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { type Clause, type DocumentStatus, getDocument } from '@/lib/documents'

const statusMeta: Record<DocumentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ready: { label: 'Ready', icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  processing: { label: 'Processing', icon: Loader2, className: 'text-muted-foreground' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-destructive' },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function ClauseNavItem({
  clause,
  isSelected,
  onSelect,
}: {
  clause: Clause
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ paddingLeft: `${(clause.depth - 1) * 14 + 12}px` }}
      className={`flex w-full items-baseline gap-2 rounded-md py-1.5 pr-3 text-left text-sm transition-colors ${
        isSelected
          ? 'bg-primary/10 text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span className="shrink-0 font-mono text-xs">{clause.number}</span>
      <span className="truncate">{clause.title ?? '(untitled)'}</span>
    </button>
  )
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    data: doc,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => getDocument(id!),
    enabled: Boolean(id),
  })

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading document…
      </p>
    )
  }

  if (isError || !doc) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" />
          Could not load this document.
        </p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to="/documents">Back to documents</Link>
        </Button>
      </div>
    )
  }

  const meta = statusMeta[doc.status]
  const clauses = [...doc.clauses].sort((a, b) => a.order_index - b.order_index)

  // The URL's `clause` query param is the single source of truth for the
  // selection, so it stays in sync with browser back/forward automatically.
  // An id that doesn't belong to this document (or no param at all) simply
  // falls back to "nothing selected" rather than crashing.
  const clauseIdParam = searchParams.get('clause')
  const selectedClause = clauses.find((c) => c.id === clauseIdParam) ?? null

  function selectClause(clauseId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('clause', clauseId)
        return next
      },
      { replace: false }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/documents">← Back to documents</Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight break-all">{doc.filename}</h1>
          </div>
          <span className={`flex items-center gap-1.5 text-sm ${meta.className}`}>
            <meta.icon className={`size-4 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
            {meta.label}
          </span>
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>Pages:</dt>
            <dd>{doc.page_count}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Clauses:</dt>
            <dd>{clauses.length}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Uploaded:</dt>
            <dd>{formatDate(doc.created_at)}</dd>
          </div>
        </dl>

        {doc.status === 'failed' && doc.error_message && (
          <p className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {doc.error_message}
          </p>
        )}
      </div>

      <Separator />

      {clauses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No clauses were detected in this document.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <nav
            aria-label="Clause navigation"
            className="min-w-0 rounded-xl ring-1 ring-foreground/10 md:sticky md:top-20 md:max-h-[calc(100vh-11rem)] md:overflow-y-auto"
          >
            <h2 className="border-b border-border px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Clauses
            </h2>
            <div className="flex flex-col gap-0.5 p-2">
              {clauses.map((clause) => (
                <ClauseNavItem
                  key={clause.id}
                  clause={clause}
                  isSelected={clause.id === selectedClause?.id}
                  onSelect={() => selectClause(clause.id)}
                />
              ))}
            </div>
          </nav>

          <div className="min-w-0 rounded-xl p-4 ring-1 ring-foreground/10">
            {selectedClause ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{selectedClause.path}</p>
                  <h2 className="mt-1 flex flex-wrap items-baseline gap-2 text-lg font-semibold">
                    <span className="font-mono text-base text-muted-foreground">{selectedClause.number}</span>
                    <span>{selectedClause.title ?? '(untitled clause)'}</span>
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">Page {selectedClause.page_number}</p>
                </div>
                <Separator />
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedClause.text || 'This clause has no body text.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a clause from the list to view its content.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
