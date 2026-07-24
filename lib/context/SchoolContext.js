'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

const SchoolContext = createContext({
  school: null,
  isLoading: true,
  error: null,
})

export function SchoolProvider({ children }) {
  const [school, setSchool] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSchool() {
      let subdomain = ''
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const parts = hostname.split('.')
        if (parts.length >= 3) {
          subdomain = parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
        }
      }

      const cacheKey = subdomain ? `school-cache:v3:${subdomain}` : 'school-cache:v3:default'
      let cachedSchool = null
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(cacheKey)
          cachedSchool = raw ? JSON.parse(raw) : null
          if (cachedSchool && cachedSchool.ownershipType == null) {
            cachedSchool = null
          }
          if (cachedSchool) {
            setSchool((prev) => prev ?? cachedSchool)
            setIsLoading(false)
          }
        }
      } catch {
        cachedSchool = null
      }

      try {
        if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') {
          setSchool(null)
          setError(null)
          setIsLoading(false)
          return
        }

        // Explicitly pass subdomain from client to bypass potential proxy header stripping
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
          } catch {}
        } else {
          setSchool(cachedSchool ?? null)
          setError(res.ok ? null : 'Failed to fetch school data')
        }

        // Dynamic Title & Favicon Update
        const schoolForUi = nextSchool || cachedSchool
        if (schoolForUi) {
          document.title = schoolForUi.name

          // Update favicon
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
      } catch (err) {
        setSchool(cachedSchool ?? null)
        setError('Failed to fetch school data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchool()
  }, [])

  return (
    <SchoolContext.Provider value={{ school, isLoading, error }}>{children}</SchoolContext.Provider>
  )
}

export function useSchool() {
  return useContext(SchoolContext)
}
