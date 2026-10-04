import { Menu, Search } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button'
import { useDocumentQuery } from '@/hooks/use-documents'

const DOCUMENT_PATH = /^\/documents\/([^/]+)/

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Breadcrumb segments for the current route. The standard's own name comes from the detail query. */
function Breadcrumb({ pathname }: { pathname: string }) {
  const documentMatch = DOCUMENT_PATH.exec(pathname)
  const documentId = documentMatch?.[1]
  const { data: doc } = useDocumentQuery(documentId)

  const segments: { label: string; to?: string }[] = []

  if (pathname === '/') {
    segments.push({ label: 'Workspace' })
  } else if (pathname.startsWith('/documents')) {
    segments.push({ label: 'Standards', to: documentId ? '/documents' : undefined })
    if (documentId) segments.push({ label: doc?.filename ?? 'Standard' })
  } else if (pathname.startsWith('/search')) {
    segments.push({ label: 'Search' })
  } else if (pathname.startsWith('/settings')) {
    segments.push({ label: 'Settings' })
  } else {
    segments.push({ label: 'Not found' })
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {segments.map((segment, index) => (
        <span key={`${segment.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
          {index > 0 && <span className="text-muted-foreground/60" aria-hidden="true">/</span>}
          {segment.to ? (
            <Link to={segment.to} className="text-muted-foreground hover:text-foreground">
              {segment.label}
            </Link>
          ) : (
            <span className="truncate font-medium" aria-current={index === segments.length - 1 ? 'page' : undefined}>
              {segment.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  // "/" focuses global search from anywhere that isn't already a text field.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || isEditableTarget(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    navigate(`/search?${new URLSearchParams({ q: trimmed }).toString()}`)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onOpenNav} aria-label="Open navigation">
        <Menu />
      </Button>

      <Breadcrumb pathname={location.pathname} />

      <form onSubmit={handleSubmit} role="search" className="ml-auto hidden w-full max-w-xs sm:block">
        <label className="relative block">
          <span className="sr-only">Search standards</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search standards"
            className="h-8 w-full rounded-md border border-input bg-background pr-8 pl-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
            /
          </kbd>
        </label>
      </form>

      <Button asChild variant="ghost" size="icon" className="shrink-0 sm:hidden">
        <Link to="/search" aria-label="Search">
          <Search />
        </Link>
      </Button>

      <ThemeToggle />
    </header>
  )
}
