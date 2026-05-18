'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme/AppThemeProvider'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="p-2 rounded-full text-royalPurple-text2 hover:bg-royalPurple-card2 transition-colors"
        aria-label="Toggle dark mode"
      >
        <Sun className="h-5 w-5" />
      </button>
    )
  }

  const activeTheme = resolvedTheme || theme

  return (
    <button
      onClick={() => setTheme(activeTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full text-royalPurple-text2 hover:bg-royalPurple-card2 transition-colors"
      aria-label="Toggle dark mode"
    >
      {activeTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
