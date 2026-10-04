import type { Clause } from '@/lib/documents'

export interface ClauseNode {
  clause: Clause
  level: number
  children: ClauseNode[]
}

/**
 * Builds the hierarchy from `parent_id`, the source of truth for nesting.
 * A clause whose parent is missing from the payload is treated as a root,
 * so no clause is ever dropped from the navigation.
 */
export function buildClauseTree(clauses: Clause[]): ClauseNode[] {
  const sorted = [...clauses].sort((a, b) => a.order_index - b.order_index)
  const nodes = new Map<string, ClauseNode>()
  sorted.forEach((clause) => nodes.set(clause.id, { clause, level: 0, children: [] }))

  const roots: ClauseNode[] = []
  sorted.forEach((clause) => {
    const node = nodes.get(clause.id)!
    const parent = clause.parent_id ? nodes.get(clause.parent_id) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const assignLevels = (list: ClauseNode[], level: number) => {
    list.forEach((node) => {
      node.level = level
      assignLevels(node.children, level + 1)
    })
  }
  assignLevels(roots, 0)

  return roots
}

/** IDs of every ancestor of a clause, used to expand the tree down to a deep-linked clause. */
export function ancestorIds(clauseId: string, clauses: Clause[]): string[] {
  const byId = new Map(clauses.map((clause) => [clause.id, clause]))
  const ancestors: string[] = []
  let parentId = byId.get(clauseId)?.parent_id ?? null
  while (parentId && byId.has(parentId) && !ancestors.includes(parentId)) {
    ancestors.push(parentId)
    parentId = byId.get(parentId)?.parent_id ?? null
  }
  return ancestors
}
