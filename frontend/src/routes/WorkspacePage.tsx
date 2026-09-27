import { useQueries, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  FileText,
  FolderOpen,
  Layers,
  Loader2,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { type DocumentStatus, type DocumentSummary, getDocument, listDocuments } from '@/lib/documents'

const RECENT_LIMIT = 5

const statusMeta: Record<DocumentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ready: { label: 'Ready', icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  processing: { label: 'Processing', icon: Loader2, className: 'text-muted-foreground' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-destructive' },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
}

function useTotalClauseCount(documents: DocumentSummary[]) {
  const readyDocs = documents.filter((doc) => doc.status === 'ready')

  const results = useQueries({
    queries: readyDocs.map((doc) => ({
      queryKey: ['documents', doc.id],
      queryFn: () => getDocument(doc.id),
      staleTime: 60_000,
    })),
  })

  const isLoading = results.some((result) => result.isPending)
  const total = results.reduce((sum, result) => sum + (result.data?.clauses.length ?? 0), 0)

  return { total, isLoading, hasReadyDocs: readyDocs.length > 0 }
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentDocumentRow({ doc }: { doc: DocumentSummary }) {
  const meta = statusMeta[doc.status]

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{doc.filename}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{doc.page_count} pages</span>
            <span aria-hidden="true">·</span>
            <span className={`flex items-center gap-1 ${meta.className}`}>
              <meta.icon className={`size-3 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
              {meta.label}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(doc.created_at)}</span>
          </p>
        </div>
      </div>
      {doc.status === 'ready' ? (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to={`/documents/${doc.id}`}>Open</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="shrink-0" disabled>
          Open
        </Button>
      )}
    </div>
  )
}

export function WorkspacePage() {
  const {
    data: documents,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
  })

  const clauseStats = useTotalClauseCount(documents ?? [])

  const readyCount = documents?.filter((d) => d.status === 'ready').length ?? 0
  const processingCount = documents?.filter((d) => d.status === 'processing').length ?? 0
  const recentDocuments = (documents ?? []).slice(0, RECENT_LIMIT)

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Engineering Standards Workspace</h1>
        <p className="mt-1 max-w-xl text-muted-foreground">
          Search, review, and retrieve exact clauses from your engineering standards.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/documents">
              <UploadCloud />
              Upload Standard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/search">
              <FileSearch />
              Search Standards
            </Link>
          </Button>
        </div>
      </div>

      {isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading workspace…
        </p>
      )}

      {isError && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" />
          Could not load documents. Is the backend running?
        </p>
      )}

      {!isPending && !isError && documents && documents.length === 0 && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">What ClausePilot does</CardTitle>
            <CardDescription>
              Upload an engineering standard as a PDF. ClausePilot extracts its pages and clauses, so you
              can search and retrieve the exact clause and page you need, with its source reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/documents">
                <UploadCloud />
                Upload your first standard
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isPending && !isError && documents && documents.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard icon={FolderOpen} label="Standards" value={String(documents.length)} />
            <SummaryCard
              icon={Layers}
              label="Total clauses"
              value={clauseStats.hasReadyDocs && clauseStats.isLoading ? '…' : String(clauseStats.total)}
            />
            <SummaryCard icon={CheckCircle2} label="Ready" value={String(readyCount)} />
            <SummaryCard icon={Loader2} label="Processing" value={String(processingCount)} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Recent standards</h2>
              <Button asChild variant="link" size="sm">
                <Link to="/documents">View all documents</Link>
              </Button>
            </div>
            <Card className="mt-3">
              <CardContent className="divide-y divide-border py-0">
                {recentDocuments.map((doc) => (
                  <RecentDocumentRow key={doc.id} doc={doc} />
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-tight">Quick actions</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Link to="/documents" className="block">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <UploadCloud className="size-4" />
                      Upload standard
                    </CardTitle>
                    <CardDescription>Add a new PDF for clause extraction.</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link to="/search" className="block">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileSearch className="size-4" />
                      Search clauses
                    </CardTitle>
                    <CardDescription>Find clauses by number, title, or text.</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link to="/documents" className="block">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FolderOpen className="size-4" />
                      Browse documents
                    </CardTitle>
                    <CardDescription>Review all uploaded standards.</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">Upload → Index → Search → Find the exact clause.</p>
    </div>
  )
}
