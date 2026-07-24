'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

const SchoolContext = createContext({
  school: null,
  isLoading: true,
  error: null,
  refreshSchool: async () => null,
})

function resolveSubdomain() {
  if (typeof window === 'undefined') return ''
  const hostname = window.location.hostname
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
  }
  return ''
}

export function SchoolProvider({ children }) {
  const [school, setSchool] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSchool = useCallback(async ({ allowCache = true } = {}) => {
    const subdomain = resolveSubdomain()
    // v4: invalidate caches that may still hold pre-pilot-extension expiry fields
    const cacheKey = subdomain ? `school-cache:v4:${subdomain}` : 'school-cache:v4:default'
    let cachedSchool = null

    if (allowCache && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(cacheKey)
        cachedSchool = raw ? JSON.parse(raw) : null
        if (cachedSchool && cachedSchool.ownershipType == null) {
          cachedSchool = null
        }
        if (cachedSchool) {
          setSchool((prev) => prev ?? cachedSchool)
          setIsLoading(false)
        }
      } catch {
        cachedSchool = null
      }
    }

    try {
      if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') {
        setSchool(null)
        setError(null)
        setIsLoading(false)
        return null
      }

      const url = subdomain ? `/api/school/current?subdomain=${subdomain}` : '/api/school/current'
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 10000)
      let res
      try {
        res = await sessionFetch(url, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      let data = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      const nextSchool = data?.school ?? null
      if (nextSchool) {
        setSchool(nextSchool)
        setError(null)
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify(nextSchool))
          }
        } catch {
          /* ignore quota */
        }
      } else {
        setSchool(cachedSchool ?? null)
        setError(res.ok ? null : 'Failed to fetch school data')
      }

      const schoolForUi = nextSchool || cachedSchool
      if (schoolForUi && typeof document !== 'undefined') {
        document.title = schoolForUi.name
        const link = document.querySelector("link[rel~='icon']")
        if (link) {
          link.href = schoolForUi.logo_url || '/favicon.ico'
        } else {
          const newLink = document.createElement('link')
          newLink.rel = 'icon'
          newLink.href = schoolForUi.logo_url || '/favicon.ico'
          document.head.appendChild(newLink)
        }
      }

      return nextSchool
    } catch {
      setSchool(cachedSchool ?? null)
      setError('Failed to fetch school data')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchool({ allowCache: true })
  }, [fetchSchool])

  // Re-fetch when the tab becomes visible so pilot extensions take effect without a hard reload.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        fetchSchool({ allowCache: false })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchSchool])

  return (
    <SchoolContext.Provider value={{ school, isLoading, error, refreshSchool: fetchSchool }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  return useContext(SchoolContext)
}
