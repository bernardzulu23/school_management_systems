'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

/**
 * Enforces server-verified auth for protected client routes.
 * Prevents forged/persisted local auth state from unlocking dashboard tabs.
 */
export default function ServerSessionGuard({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { syncSession, isAuthenticated } = useAuth()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function verify() {
      setChecking(true)
      const result = await syncSession?.({ force: true, strict: true })
      if (cancelled) return

      if (!result?.success) {
        const from = encodeURIComponent(pathname || '/dashboard')
        router.replace(`/login?from=${from}`)
        return
      }

      setChecking(false)
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [pathname, router, syncSession])

  if (checking || !isAuthenticated) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-royalPurple-text2">
        Verifying session...
      </div>
    )
  }

  return children
}
