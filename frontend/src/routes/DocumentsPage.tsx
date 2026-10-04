import { FileSearch, FileText, Search as SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { RowsSkeleton, Skeleton } from '@/components/common/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { UploadStandardButton } from '@/components/documents/upload-standard-button'
import { Button } from '@/components/ui/button'
import { useClauseCounts, useDocumentsQuery } from '@/hooks/use-documents'
import { describeError } from '@/lib/api-client'
import type { DocumentStatus, DocumentSummary } from '@/lib/documents'
import { formatDate } from '@/lib/format'

type StatusFilter = 'all' | DocumentStatus

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function ClauseCountCell({ doc, counts, isPending }: { doc: DocumentSummary; counts: Map<string, number>; isPending: boolean }) {
  if (doc.status !== 'ready') return <span className="text-muted-foreground">—</span>
  const count = counts.get(doc.id)
  if (count !== undefined) return <span className="tabular-nums">{count}</span>
  return isPending ? <Skeleton className="h-4 w-8" /> : <span className="text-muted-foreground">—</span>
}

function LibraryRow({
  doc,
  counts,
  countsPending,
}: {
  doc: DocumentSummary
  counts: Map<string, number>
  countsPending: boolean
}) {
  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3 align-top">
        <div className="flex min-w-0 items-start gap-2.5">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            {doc.status === 'ready' ? (
              <Link to={`/documents/${doc.id}`} className="font-medium wrap-break-word hover:underline underline-offset-4">
                {doc.filename}
              </Link>
            ) : (
              <span className="font-medium wrap-break-word">{doc.filename}</span>
            )}
            {doc.status === 'failed' && doc.error_message && (
              <p className="mt-1 text-xs text-destructive">{doc.error_message}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground md:text-left">{doc.page_count}</td>
      <td className="px-3 py-3 text-right md:text-left">
        <ClauseCountCell doc={doc} counts={counts} isPending={countsPending} />
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={doc.status} />
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDate(doc.created_at)}</td>
      <td className="px-4 py-3 text-right">
        {doc.status === 'ready' ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/documents/${doc.id}`}>Open</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Open
          </Button>
        )}
      </td>
    </tr>
  )
}

export function DocumentsPage() {
  const { data: documents, isPending, isError, error, refetch, isRefetching } = useDocumentsQuery()
  const { counts, isPending: countsPending } = useClauseCounts(documents ?? [])
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const needle = nameFilter.trim().toLowerCase()
    return (documents ?? []).filter(
      (doc) =>
        (statusFilter === 'all' || doc.status === statusFilter) &&
        (needle === '' || doc.filename.toLowerCase().includes(needle))
    )
  }, [documents, nameFilter, statusFilter])

  const hasDocuments = (documents?.length ?? 0) > 0
  const isFiltering = nameFilter.trim() !== '' || statusFilter !== 'all'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Engineering Standards"
        description="Manage and explore the engineering standards available in your workspace."
        actions={hasDocuments ? <UploadStandardButton /> : undefined}
      />

      {isPending && (
        <div className="overflow-hidden rounded-lg border border-border">
          <RowsSkeleton rows={5} />
        </div>
      )}

      {isError && (
        <ErrorState
          message={describeError(error, 'Could not load standards.')}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      )}

      {!isPending && !isError && !hasDocuments && (
        <EmptyState
          icon={FileText}
          title="No standards yet"
          description="Upload a PDF engineering standard. ClausePilot will extract its pages and clauses so you can search them."
          action={<UploadStandardButton label="Upload your first standard" />}
        />
      )}

      {!isPending && !isError && hasDocuments && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1 sm:max-w-xs">
              <span className="sr-only">Filter standards by name</span>
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Filter by name"
                className={`${inputClass} w-full pl-8`}
              />
            </label>
            <label className="sr-only" htmlFor="status-filter">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={`${inputClass} sm:w-40`}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            <p className="text-sm text-muted-foreground sm:ml-auto" aria-live="polite">
              {filtered.length} of {documents?.length ?? 0} shown
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No standards match"
              description="Try a different name, or clear the filters to see every standard."
              action={
                isFiltering ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNameFilter('')
                      setStatusFilter('all')
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-160 text-left text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">Standard</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium md:text-left">Pages</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium md:text-left">Clauses</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Uploaded</th>
                    <th scope="col" className="px-4 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <LibraryRow key={doc.id} doc={doc} counts={counts} countsPending={countsPending} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
