import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import {
  type DocumentStatus,
  type DocumentSummary,
  getDocument,
  listDocuments,
  uploadDocument,
} from '@/lib/documents'

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

function ClauseCount({ documentId }: { documentId: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => getDocument(documentId),
    staleTime: 60_000,
  })

  if (isPending) {
    return <span className="text-muted-foreground">…</span>
  }
  return <span>{data?.clauses.length ?? '—'}</span>
}

function DocumentRow({ doc }: { doc: DocumentSummary }) {
  const meta = statusMeta[doc.status]

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{doc.filename}</span>
        </div>
        {doc.status === 'failed' && doc.error_message && (
          <p className="mt-1 text-xs text-destructive">{doc.error_message}</p>
        )}
      </td>
      <td className="px-3 py-3 text-muted-foreground">{doc.page_count}</td>
      <td className="px-3 py-3 text-muted-foreground">
        {doc.status === 'ready' ? <ClauseCount documentId={doc.id} /> : '—'}
      </td>
      <td className="px-3 py-3">
        <span className={`flex items-center gap-1.5 ${meta.className}`}>
          <meta.icon className={`size-3.5 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
          {meta.label}
        </span>
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
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const {
    data: documents,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
  })

  const upload = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      setUploadError(null)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error) => {
      setUploadError(error instanceof ApiError ? error.message : 'Upload failed.')
    },
  })

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      upload.mutate(file)
    }
    event.target.value = ''
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Engineering Standards</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Upload engineering standard documents to extract their clauses and sections for review.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={upload.isPending} size="lg">
            {upload.isPending ? <Loader2 className="animate-spin" /> : <UploadCloud />}
            {upload.isPending ? 'Uploading…' : 'Upload PDF'}
          </Button>
        </div>
      </div>

      {uploadError && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" />
          {uploadError}
        </p>
      )}

      {isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading documents…
        </p>
      )}

      {isError && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" />
          Could not load documents. Is the backend running?
        </p>
      )}

      {!isPending && !isError && documents?.length === 0 && (
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              No documents yet
            </CardTitle>
            <CardDescription>Upload a PDF to get started.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}

      {!isPending && !isError && documents && documents.length > 0 && (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Filename</th>
                <th className="px-3 py-2.5 font-medium">Pages</th>
                <th className="px-3 py-2.5 font-medium">Clauses</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Uploaded</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
