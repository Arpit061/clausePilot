import { useRef, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  description?: string
}

/**
 * A single-choice tab group. Arrow keys move between options, following the
 * ARIA tablist pattern, so the control can be used without a mouse.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map())

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = options.findIndex((option) => option.value === value)
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return

    event.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next.value)
    buttonRefs.current.get(next.value)?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="inline-flex w-fit rounded-lg bg-muted p-1 text-sm">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              if (node) buttonRefs.current.set(option.value, node)
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            title={option.description}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'rounded-md px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
