'use client'

import { useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function GlobalBackButton() {
  const router = useRouter()
  const pathname = usePathname() || ''

  const hidden = useMemo(() => pathname === '/', [pathname])
  if (hidden) return null

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="fixed left-4 bottom-4 z-[9998] inline-flex items-center gap-2 px-3 py-2 rounded-full bg-royalPurple-card/90 border border-royalPurple-border/50 text-sm font-semibold text-royalPurple-text1 backdrop-blur-sm hover:bg-royalPurple-card2 transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  )
}
