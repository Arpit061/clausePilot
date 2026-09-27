import { FolderOpen } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DocumentsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Upload and browsing will be implemented in a later milestone.
        </p>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="size-4" />
            No documents yet
          </CardTitle>
          <CardDescription>This section is a placeholder for the ingestion milestone.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
