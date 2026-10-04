import { FileText } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { clauseHref, modeScoreLabel, type SearchHit, type SearchMode } from '@/lib/search'
import { formatScore } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Wraps each occurrence of a query term in <mark>. Plain text only, so snippets can never inject markup. */
function highlight(text: string, query: string): ReactNode {
  const terms = [...new Set(query.split(/\s+/).filter((term) => term.length >= 2))]
  if (terms.length === 0) return text

  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-sm bg-amber-200/70 px-0.5 text-foreground dark:bg-amber-400/25">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  )
}

export function ScoreBreakdown({ hit }: { hit: SearchHit }) {
  if (!hit.breakdown) return null
  return (
    <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
      <div className="flex gap-1">
        <dt>Keyword</dt>
        <dd className="text-foreground">{hit.breakdown.keyword === null ? '—' : formatScore(hit.breakdown.keyword)}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Semantic</dt>
        <dd className="text-foreground">{hit.breakdown.semantic === null ? '—' : formatScore(hit.breakdown.semantic)}</dd>
      </div>
    </dl>
  )
}

interface SearchResultCardProps {
  hit: SearchHit
  mode: SearchMode
  query: string
  documentName: string
  isPreviewed: boolean
  onPreview: () => void
}

export function SearchResultCard({ hit, mode, query, documentName, isPreviewed, onPreview }: SearchResultCardProps) {
  return (
    <Link
      to={clauseHref(hit)}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className={cn(
        'group flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        isPreviewed ? 'border-primary/40 bg-primary/3' : 'border-border hover:border-foreground/20 hover:bg-muted/30'
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-2 text-sm font-semibold">
          <span className="font-mono text-muted-foreground">{hit.number}</span>
          <span className="wrap-break-word group-hover:underline underline-offset-4">{hit.title ?? '(untitled clause)'}</span>
        </h3>
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
          {modeScoreLabel[mode]} {formatScore(hit.score)}
        </span>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1">
          <FileText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{documentName}</span>
        </span>
        <span className="tabular-nums">Page {hit.page_number}</span>
      </p>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{highlight(hit.snippet, query)}</p>
    </Link>
  )
}

interface SearchPreviewProps {
  hit: SearchHit
  mode: SearchMode
  documentName: string
  onOpen: () => void
}

/** Shows the matched excerpt for the focused result. Full text is read on the source page. */
export function SearchPreview({ hit, mode, documentName, onOpen }: SearchPreviewProps) {
  return (
    <section aria-label="Result preview" className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Matched clause</p>
        <h2 className="flex flex-wrap items-baseline gap-2 text-base font-semibold">
          <span className="font-mono text-muted-foreground">{hit.number}</span>
          <span className="wrap-break-word">{hit.title ?? '(untitled clause)'}</span>
        </h2>
      </div>

      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Standard</dt>
        <dd className="wrap-break-word font-medium">{documentName}</dd>
        <dt className="text-muted-foreground">Page</dt>
        <dd className="tabular-nums">{hit.page_number}</dd>
        <dt className="text-muted-foreground">{modeScoreLabel[mode]}</dt>
        <dd className="tabular-nums">{formatScore(hit.score)}</dd>
      </dl>

      <ScoreBreakdown hit={hit} />

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Excerpt</p>
        <p className="text-sm leading-relaxed">{hit.snippet}</p>
      </div>

      <Button onClick={onOpen} className="w-full">
        Open clause in standard
      </Button>
      <p className="text-xs text-muted-foreground">The excerpt is a fragment. Open the clause to read the full requirement.</p>
    </section>
  )
}
