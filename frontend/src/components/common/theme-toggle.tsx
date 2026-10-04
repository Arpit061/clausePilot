import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={toggleTheme} aria-label={label} title={label}>
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
