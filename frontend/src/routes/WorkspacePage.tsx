import { BookOpen, CheckCircle2, FileSearch, FileText, Layers, Loader2, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Skeleton } from '@/components/common/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { UploadStandardButton } from '@/components/documents/upload-standard-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useClauseCounts, useDocumentsQuery } from '@/hooks/use-documents'
import { describeError } from '@/lib/api-client'
import type { DocumentSummary } from '@/lib/documents'
import { formatDate } from '@/lib/format'

const RECENT_LIMIT = 5

function RecentStandardRow({ doc, clauseCount }: { doc: DocumentSummary; clauseCount: number | undefined }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{doc.filename}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">{doc.page_count} pages</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{doc.status === 'ready' ? `${clauseCount ?? '—'} clauses` : '— clauses'}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(doc.created_at)}</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={doc.status} className="hidden sm:inline-flex" />
        {doc.status === 'ready' ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/documents/${doc.id}`}>Open</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Open
          </Button>
        )}
      </div>
    </li>
  )
}

function QuickAction({ to, icon: Icon, title, description }: { to: string; icon: typeof FileText; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors outline-none hover:border-foreground/20 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

export function WorkspacePage() {
  const { data: documents, isPending, isError, error, refetch, isRefetching } = useDocumentsQuery()
  const { counts, total, isPending: countsPending } = useClauseCounts(documents ?? [])

  const hasDocuments = (documents?.length ?? 0) > 0
  const readyCount = documents?.filter((doc) => doc.status === 'ready').length ?? 0
  const processingCount = documents?.filter((doc) => doc.status === 'processing').length ?? 0
  const recent = [...(documents ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, RECENT_LIMIT)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Engineering Standards Workspace"
        description="Search, review, and retrieve exact clauses from your engineering standards."
        actions={
          <>
            <UploadStandardButton size="lg" />
            <Button asChild variant="outline" size="lg">
              <Link to="/search">
                <FileSearch />
                Search Standards
              </Link>
            </Button>
          </>
        }
      />

      {isPending && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="Loading workspace">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-18.5 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          message={describeError(error, 'Could not load your standards.')}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      )}

      {!isPending && !isError && !hasDocuments && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Upload your first engineering standard to begin finding clauses with ClausePilot.</CardTitle>
            <CardDescription>
              ClausePilot extracts each standard's pages and clauses, so you can search for a requirement and open the
              exact clause, page, and source it came from.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {['Upload', 'Index', 'Search', 'Verify source'].map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden="true">→</span>}
                  <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">{step}</span>
                </li>
              ))}
            </ol>
            <UploadStandardButton label="Upload your first standard" />
          </CardContent>
        </Card>
      )}

      {!isPending && !isError && hasDocuments && (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={BookOpen} label="Standards" value={documents!.length} />
            <StatCard
              icon={Layers}
              label="Total clauses"
              value={countsPending ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : total}
            />
            <StatCard icon={CheckCircle2} label="Ready" value={readyCount} />
            <StatCard icon={Loader2} label="Processing" value={processingCount} />
          </section>

          <section aria-labelledby="recent-standards-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <h2 id="recent-standards-heading" className="text-lg font-semibold tracking-tight">
                Recent standards
              </h2>
              <Button asChild variant="link" size="sm">
                <Link to="/documents">View all standards →</Link>
              </Button>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {recent.map((doc) => (
                <RecentStandardRow key={doc.id} doc={doc} clauseCount={counts.get(doc.id)} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="quick-actions-heading" className="flex flex-col gap-3">
            <h2 id="quick-actions-heading" className="text-lg font-semibold tracking-tight">
              Quick actions
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <QuickAction to="/documents" icon={UploadCloud} title="Upload Standard" description="Add a PDF for clause extraction." />
              <QuickAction to="/search" icon={FileSearch} title="Search Clauses" description="Find clauses by number, title, or text." />
              <QuickAction to="/documents" icon={BookOpen} title="Browse Standards" description="Review every uploaded standard." />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
