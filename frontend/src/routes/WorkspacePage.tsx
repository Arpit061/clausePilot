import { useQuery } from '@tanstack/react-query'
import { ServerCog } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getHealth } from '@/lib/health'

export function WorkspacePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  })

  const apiStatus = isPending ? 'Checking…' : isError ? 'Unreachable' : data?.status ?? 'Unknown'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="mt-1 text-muted-foreground">
          Document intelligence workspace — coming online.
        </p>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ServerCog className="size-4" />
            Backend status
          </CardTitle>
          <CardDescription>Live check of the FastAPI health endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm font-medium">{apiStatus}</CardContent>
      </Card>
    </div>
  )
}
