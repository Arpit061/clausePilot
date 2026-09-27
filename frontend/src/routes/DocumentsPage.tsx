import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { type DocumentStatus, listDocuments, uploadDocument } from '@/lib/documents'

const statusMeta: Record<DocumentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ready: { label: 'Ready', icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  processing: { label: 'Processing', icon: Loader2, className: 'text-muted-foreground' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-destructive' },
}

export function DocumentsPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: documents, isPending } = useQuery({
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-muted-foreground">
            Upload an engineering standard (PDF) to extract its pages for search.
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
          <Button onClick={() => fileInputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="animate-spin" /> : <UploadCloud />}
            {upload.isPending ? 'Uploading…' : 'Upload PDF'}
          </Button>
        </div>
      </div>

      {uploadError && (
        <p className="text-sm text-destructive" role="alert">
          {uploadError}
        </p>
      )}

      {isPending && <p className="text-sm text-muted-foreground">Loading documents…</p>}

      {!isPending && documents?.length === 0 && (
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

      {documents && documents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const meta = statusMeta[doc.status]
            return (
              <Card key={doc.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4 shrink-0" />
                    <span className="truncate">{doc.filename}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <meta.icon className={`size-3.5 ${meta.className}`} />
                    <span className={meta.className}>{meta.label}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {doc.status === 'failed' ? (
                    <span className="text-destructive">{doc.error_message}</span>
                  ) : (
                    <span>{doc.page_count} page{doc.page_count === 1 ? '' : 's'}</span>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
