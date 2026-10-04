import { ChevronLeft, ChevronRight, Copy, Check, FileSearch } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import type { Clause } from '@/lib/documents'

interface ClauseViewerProps {
  documentName: string
  pageCount: number
  clause: Clause | null
  previous: Clause | null
  next: Clause | null
  onNavigate: (clauseId: string) => void
}

/**
 * Evidence area that states where a clause came from. It is text-only for now;
 * a real page viewer can be mounted in this layout later without changing the
 * selection flow.
 */
function SourcePanel({
  documentName,
  pageCount,
  clause,
}: {
  documentName: string
  pageCount: number
  clause: Clause
}) {
  const [copied, setCopied] = useState(false)
  const citation = `${documentName}, clause ${clause.number}, page ${clause.page_number}`

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(citation)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied (insecure context or permissions); the citation stays readable on screen.
    }
  }

  return (
    <section aria-label="Source" className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Source</p>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Standard</dt>
            <dd className="min-w-0 wrap-break-word font-medium">{documentName}</dd>
            <dt className="text-muted-foreground">Page</dt>
            <dd className="tabular-nums">
              {clause.page_number}
              <span className="text-muted-foreground"> of {pageCount}</span>
            </dd>
            <dt className="text-muted-foreground">Clause</dt>
            <dd className="font-mono">{clause.number}</dd>
          </dl>
        </div>
        <Button variant="outline" size="sm" onClick={copyCitation} className="shrink-0">
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy citation'}
        </Button>
      </div>
    </section>
  )
}

export function ClauseViewer({ documentName, pageCount, clause, previous, next, onNavigate }: ClauseViewerProps) {
  if (!clause) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Select a clause"
        description="Choose a clause from the tree to read its exact text and see where it appears in the standard."
        className="h-full min-h-72"
      />
    )
  }

  const pathSegments = clause.path.split(' > ')

  return (
    <article className="flex flex-col gap-6" aria-labelledby="clause-heading">
      <SourcePanel documentName={documentName} pageCount={pageCount} clause={clause} />

      <header className="flex flex-col gap-2">
        <nav aria-label="Clause path" className="flex flex-wrap items-center gap-1 font-mono text-xs text-muted-foreground">
          {pathSegments.map((segment, index) => (
            <span key={`${segment}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">›</span>}
              <span>{segment}</span>
            </span>
          ))}
        </nav>
        <h2 id="clause-heading" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-semibold tracking-tight">
          <span className="font-mono text-lg text-muted-foreground">{clause.number}</span>
          <span className="wrap-break-word">{clause.title ?? '(untitled clause)'}</span>
        </h2>
      </header>

      <div className="max-w-prose text-[15px] leading-7 whitespace-pre-wrap text-foreground">
        {clause.text || <span className="text-muted-foreground">This clause has no body text.</span>}
      </div>

      <nav aria-label="Clause navigation" className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button variant="ghost" size="sm" disabled={!previous} onClick={() => previous && onNavigate(previous.id)}>
          <ChevronLeft />
          {previous ? previous.number : 'Previous'}
        </Button>
        <Button variant="ghost" size="sm" disabled={!next} onClick={() => next && onNavigate(next.id)}>
          {next ? next.number : 'Next'}
          <ChevronRight />
        </Button>
      </nav>
    </article>
  )
}
