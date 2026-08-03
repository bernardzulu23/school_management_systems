'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] animate-in slide-in-from-top duration-300">
      <div className="bg-amber-600 text-white px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 shadow-md text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          Offline mode — attendance & marks save on this device; AI, payments & SMS need internet.
        </span>
        <Link href="/dashboard/offline" className="underline underline-offset-2 font-semibold">
          Offline & sync
        </Link>
      </div>
    </div>
  )
}
