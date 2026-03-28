'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { SchoolProvider } from '@/lib/context/SchoolContext'
import { useAuth } from '@/lib/auth'

function AuthSessionSync({ children }) {
  const syncSession = useAuth((s) => s.syncSession)

  useEffect(() => {
    syncSession({ force: true })
  }, [])

  return children
}

export function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SchoolProvider>
        <AuthSessionSync>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </AuthSessionSync>
      </SchoolProvider>
    </QueryClientProvider>
  )
}
