'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'theme'

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
  systemTheme: 'light',
  themes: ['light', 'dark', 'system'],
})

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme) {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyThemeClass(resolved) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

export function AppThemeProvider({ children, defaultTheme = 'system', enableSystem = true }) {
  const [theme, setThemeState] = useState(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  const apply = useCallback((nextTheme) => {
    const resolved = resolveTheme(nextTheme)
    setResolvedTheme(resolved)
    applyThemeClass(resolved)
  }, [])

  useEffect(() => {
    setMounted(true)
    let stored = defaultTheme
    try {
      stored = localStorage.getItem(STORAGE_KEY) || defaultTheme
    } catch {}
    setThemeState(stored)
    apply(stored)
  }, [apply, defaultTheme])

  useEffect(() => {
    if (!mounted) return
    apply(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme, mounted, apply])

  useEffect(() => {
    if (!mounted || !enableSystem || theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme, mounted, enableSystem, apply])

  useEffect(() => {
    if (!mounted) return
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setThemeState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [mounted])

  const setTheme = useCallback((value) => {
    setThemeState((prev) => (typeof value === 'function' ? value(prev) : value))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme: getSystemTheme(),
      themes: enableSystem ? ['light', 'dark', 'system'] : ['light', 'dark'],
    }),
    [theme, setTheme, resolvedTheme, enableSystem]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Drop-in replacement for `useTheme` from next-themes in this app. */
export function useTheme() {
  return useContext(ThemeContext)
}
