'use client'

import React, { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Initial check
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
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-md text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        <span>
          You are currently offline. Changes will sync automatically when connection returns.
        </span>
      </div>
    </div>
  )
}
