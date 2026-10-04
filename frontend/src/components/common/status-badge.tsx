import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import type { DocumentStatus } from '@/lib/documents'
import { cn } from '@/lib/utils'

const statusMeta: Record<
  DocumentStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  ready: {
    label: 'Ready',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-400/20',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-400/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-400/20',
  },
}

export function StatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const meta = statusMeta[status]
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        meta.className,
        className
      )}
    >
      <Icon className={cn('size-3.5', status === 'processing' && 'animate-spin')} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
