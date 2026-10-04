import { BookOpen, FileText, Search, Settings, Workflow } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

import { useDocumentsQuery } from '@/hooks/use-documents'
import { cn } from '@/lib/utils'

const primaryItems = [
  { to: '/', label: 'Workspace', icon: Workflow, end: true },
  { to: '/documents', label: 'Standards', icon: BookOpen, end: false },
  { to: '/search', label: 'Search', icon: Search, end: false },
]

const RECENT_LIMIT = 5

function navClassName(isActive: boolean) {
  return cn(
    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    isActive
      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )
}

function RecentStandards({ onNavigate }: { onNavigate: () => void }) {
  const { data: documents } = useDocumentsQuery()
  const recent = [...(documents ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_LIMIT)

  if (recent.length === 0) {
    return <p className="px-2.5 text-xs text-muted-foreground">No standards uploaded yet.</p>
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {recent.map((doc) => (
        <li key={doc.id}>
          {doc.status === 'ready' ? (
            <NavLink
              to={`/documents/${doc.id}`}
              onClick={onNavigate}
              className={({ isActive }) => navClassName(isActive)}
              title={doc.filename}
            >
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{doc.filename}</span>
            </NavLink>
          ) : (
            <span
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground/70"
              title={`${doc.filename} (${doc.status})`}
            >
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{doc.filename}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Escape closes the mobile drawer; it has no effect while the sidebar is docked.
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out',
          'lg:sticky lg:top-0 lg:z-0 lg:h-svh lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-4" aria-hidden="true" />
          </div>
          <span className="font-semibold tracking-tight">ClausePilot</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-3">
          <nav aria-label="Main" className="flex flex-col gap-0.5">
            {primaryItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} className={({ isActive }) => navClassName(isActive)}>
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <section aria-labelledby="recent-heading" className="flex flex-col gap-1.5">
            <h2 id="recent-heading" className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Recent
            </h2>
            <RecentStandards onNavigate={onClose} />
          </section>
        </div>

        <div className="border-t border-sidebar-border p-3">
          <NavLink to="/settings" onClick={onClose} className={({ isActive }) => navClassName(isActive)}>
            <Settings className="size-4 shrink-0" aria-hidden="true" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  )
}
