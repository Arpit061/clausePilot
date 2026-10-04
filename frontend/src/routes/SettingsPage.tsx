import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, RotateCw, XCircle } from 'lucide-react'

import { PageHeader } from '@/components/common/page-header'
import { Skeleton } from '@/components/common/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL } from '@/lib/api-client'
import { getHealth } from '@/lib/health'

const retrievalModes = [
  { name: 'Keyword', detail: 'Matches clause numbers, titles and text.' },
  { name: 'Semantic', detail: 'Matches meaning using embeddings.' },
  { name: 'Hybrid', detail: 'Combines keyword and semantic scores.' },
]

function BackendStatus() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, retry: false })

  if (health.isPending) {
    return <Skeleton className="h-5 w-40" />
  }

  if (health.isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="size-4" aria-hidden="true" />
          Unreachable. Check that the backend is running at the address above.
        </p>
        <Button variant="outline" size="sm" onClick={() => health.refetch()} disabled={health.isFetching}>
          <RotateCw className={health.isFetching ? 'animate-spin' : undefined} />
          Check again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Operational · {health.data.service}
      </p>
      <Button variant="outline" size="sm" onClick={() => health.refetch()} disabled={health.isFetching}>
        <RotateCw className={health.isFetching ? 'animate-spin' : undefined} />
        Check again
      </Button>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm wrap-break-word">{children}</dd>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Information about this ClausePilot installation and its connection to the backend." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application</CardTitle>
          <CardDescription>Read-only details for this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            <Row label="Name">ClausePilot</Row>
            <Row label="Purpose">Engineering standards intelligence workspace</Row>
            <Row label="API address">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{API_BASE_URL}</code>
            </Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backend status</CardTitle>
          <CardDescription>Checked against the API health endpoint.</CardDescription>
        </CardHeader>
        <CardContent>
          <BackendStatus />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search modes</CardTitle>
          <CardDescription>
            The retrieval modes available in Search. Embedding provider and model settings are configured on the server
            and are not exposed by the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {retrievalModes.map((mode) => (
              <Row key={mode.name} label={mode.name}>
                {mode.detail}
              </Row>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
