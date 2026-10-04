import { ArrowLeft, FileText, Layers } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { ClauseTree } from '@/components/documents/clause-tree'
import { ClauseViewer } from '@/components/documents/clause-viewer'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { StatusBadge } from '@/components/common/status-badge'
import { RowsSkeleton, Skeleton } from '@/components/common/skeleton'
import { Button } from '@/components/ui/button'
import { useDocumentQuery } from '@/hooks/use-documents'
import { ApiError, describeError } from '@/lib/api-client'
import { ancestorIds, buildClauseTree } from '@/lib/clause-tree'
import { formatCount, formatDate } from '@/lib/format'

const MOBILE_QUERY = '(max-width: 1023px)'

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading standard">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-border p-3">
          <RowsSkeleton rows={6} />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: doc, isPending, isError, error, refetch, isRefetching } = useDocumentQuery(id)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const viewerRef = useRef<HTMLDivElement>(null)

  const clauses = useMemo(
    () => (doc ? [...doc.clauses].sort((a, b) => a.order_index - b.order_index) : []),
    [doc]
  )
  const tree = useMemo(() => buildClauseTree(clauses), [clauses])

  // The `clause` query param is the single source of truth for selection, so
  // browser back/forward and deep links work without extra state.
  const selectedId = searchParams.get('clause')
  const selectedIndex = clauses.findIndex((clause) => clause.id === selectedId)
  const selected = selectedIndex >= 0 ? clauses[selectedIndex] : null

  // A deep-linked clause must be visible in the tree, so its ancestors are
  // expanded regardless of any earlier manual collapse.
  const expandedAncestors = selected ? new Set(ancestorIds(selected.id, clauses)) : null
  const effectiveCollapsed = expandedAncestors
    ? new Set([...collapsedIds].filter((clauseId) => !expandedAncestors.has(clauseId)))
    : collapsedIds

  function selectClause(clauseId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('clause', clauseId)
        return next
      },
      { replace: false }
    )
    // On narrow screens the tree sits above the viewer, so bring the content into view.
    if (window.matchMedia(MOBILE_QUERY).matches) {
      viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function toggleClause(clauseId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(clauseId)) {
        next.delete(clauseId)
      } else {
        next.add(clauseId)
      }
      return next
    })
  }

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to="/documents">
        <ArrowLeft />
        Back to standards
      </Link>
    </Button>
  )

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <DetailSkeleton />
      </div>
    )
  }

  if (isError || !doc) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        {notFound ? (
          <EmptyState
            icon={FileText}
            title="Standard not found"
            description="This standard may have been removed. Return to the library to choose another."
          />
        ) : (
          <ErrorState
            message={describeError(error, 'Could not load this standard.')}
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {backLink}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold tracking-tight wrap-break-word sm:text-2xl">{doc.filename}</h1>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>Pages</dt>
            <dd className="font-medium text-foreground tabular-nums">{doc.page_count}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Clauses</dt>
            <dd className="font-medium text-foreground tabular-nums">{clauses.length}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Uploaded</dt>
            <dd className="text-foreground">{formatDate(doc.created_at)}</dd>
          </div>
        </dl>

        {doc.status === 'failed' && (
          <ErrorState message={doc.error_message ?? 'Processing failed for this standard.'} />
        )}
      </div>

      {doc.status === 'processing' && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Layers className="size-4 shrink-0" aria-hidden="true" />
          This standard is still being processed. Clauses will appear here when processing completes.
        </div>
      )}

      {doc.status === 'ready' && clauses.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No clauses were detected"
          description="The standard was processed, but no numbered clauses were found in its text."
        />
      )}

      {clauses.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
          <section
            aria-label="Clause navigation"
            className="min-w-0 rounded-lg border border-border lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto"
          >
            <h2 className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Clauses
              <span className="font-normal tabular-nums normal-case">{formatCount(clauses.length, 'clause')}</span>
            </h2>
            <div className="p-2">
              <ClauseTree
                nodes={tree}
                selectedId={selected?.id ?? null}
                collapsedIds={effectiveCollapsed}
                onToggle={toggleClause}
                onSelect={selectClause}
              />
            </div>
          </section>

          <div ref={viewerRef} className="min-w-0 scroll-mt-20 rounded-lg border border-border p-5 sm:p-6">
            {selectedId && !selected && (
              <p className="mb-4 text-sm text-destructive" role="alert">
                That clause is not part of this standard. Select one from the tree.
              </p>
            )}
            <ClauseViewer
              documentName={doc.filename}
              pageCount={doc.page_count}
              clause={selected}
              previous={selectedIndex > 0 ? clauses[selectedIndex - 1] : null}
              next={selectedIndex >= 0 && selectedIndex < clauses.length - 1 ? clauses[selectedIndex + 1] : null}
              onNavigate={selectClause}
            />
          </div>
        </div>
      )}
    </div>
  )
}
