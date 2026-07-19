// src/context/ThemeContext.tsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_THEME, THEME_STORAGE_KEY, isValidTheme, type ThemeId } from '../shared/lib/themes'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isValidTheme(stored) ? stored : DEFAULT_THEME
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    // Cross-fade: briefly opt the whole tree into color transitions so the
    // token swap reads as a smooth shift, not an instant repaint. The class
    // is removed after the window so it never taxes normal interactions.
    // (Skipped automatically under prefers-reduced-motion via the global
    // guard in index.css.)
    const firstPaint = !root.hasAttribute('data-theme')
    if (!firstPaint) root.classList.add('theme-switching')
    root.setAttribute('data-theme', theme)
    if (firstPaint) return
    const t = window.setTimeout(() => root.classList.remove('theme-switching'), 420)
    return () => { window.clearTimeout(t); root.classList.remove('theme-switching') }
  }, [theme])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id)
    } catch {
      // localStorage unavailable (private mode etc.) — theme still applies for this session
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
