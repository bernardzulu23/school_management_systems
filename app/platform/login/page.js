'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/** Platform admins sign in at /login (same as school staff). */
export default function PlatformLoginRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper text-ink">
      <Loader2 className="h-8 w-8 animate-spin text-ink/50" aria-label="Redirecting to login" />
    </main>
  )
}
