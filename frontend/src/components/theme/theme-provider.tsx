import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { applyTheme, DARK_QUERY, persistTheme, readStoredTheme, systemTheme, ThemeContext, type Theme } from '@/lib/theme'

/**
 * Owns the theme for the whole app. Until the person chooses one, the theme
 * follows the operating system and keeps following it if it changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? systemTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (readStoredTheme() !== null) return
    const media = window.matchMedia(DARK_QUERY)
    const follow = () => setThemeState(media.matches ? 'dark' : 'light')
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        persistTheme(next)
        setThemeState(next)
      },
      toggleTheme: () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark'
        persistTheme(next)
        setThemeState(next)
      },
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
