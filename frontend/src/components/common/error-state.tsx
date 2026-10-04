import { AlertCircle, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ErrorState({
  message,
  onRetry,
  isRetrying = false,
}: {
  message: string
  onRetry?: () => void
  isRetrying?: boolean
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying} className="shrink-0">
          <RotateCw className={isRetrying ? 'animate-spin' : undefined} />
          Try again
        </Button>
      )}
    </div>
  )
}
