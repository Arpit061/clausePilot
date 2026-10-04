import { ChevronRight } from 'lucide-react'

import { type ClauseNode } from '@/lib/clause-tree'
import { cn } from '@/lib/utils'

interface ClauseTreeProps {
  nodes: ClauseNode[]
  selectedId: string | null
  collapsedIds: Set<string>
  onToggle: (clauseId: string) => void
  onSelect: (clauseId: string) => void
}

export function ClauseTree({ nodes, selectedId, collapsedIds, onToggle, onSelect }: ClauseTreeProps) {
  return (
    <ul role="tree" aria-label="Clauses" className="flex flex-col gap-px">
      {nodes.map((node) => (
        <ClauseTreeItem
          key={node.clause.id}
          node={node}
          selectedId={selectedId}
          collapsedIds={collapsedIds}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

function ClauseTreeItem({
  node,
  selectedId,
  collapsedIds,
  onToggle,
  onSelect,
}: Omit<ClauseTreeProps, 'nodes'> & { node: ClauseNode }) {
  const { clause, level, children } = node
  const hasChildren = children.length > 0
  const isExpanded = !collapsedIds.has(clause.id)
  const isSelected = clause.id === selectedId

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
      <div className="group relative flex items-center" style={{ paddingLeft: `${level * 14}px` }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(clause.id)}
            aria-label={isExpanded ? `Collapse ${clause.number}` : `Expand ${clause.number}`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronRight className={cn('size-3.5 transition-transform', isExpanded && 'rotate-90')} aria-hidden="true" />
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={() => onSelect(clause.id)}
          aria-current={isSelected ? 'true' : undefined}
          className={cn(
            'flex min-w-0 flex-1 items-baseline gap-2 rounded-md py-1.5 pr-2 pl-1 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            isSelected
              ? 'bg-primary/8 font-medium text-foreground dark:bg-primary/15'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {isSelected && <span className="absolute top-1 bottom-1 -left-px w-0.5 rounded-full bg-primary" aria-hidden="true" />}
          <span className={cn('shrink-0 font-mono text-xs', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
            {clause.number}
          </span>
          <span className="truncate">{clause.title ?? '(untitled)'}</span>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <ul role="group" className="flex flex-col gap-px">
          {children.map((child) => (
            <ClauseTreeItem
              key={child.clause.id}
              node={child}
              selectedId={selectedId}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
