'use client'

import { createContext, useContext, useState, useEffect } from 'react'

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
      try {
        if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') {
          setSchool(null)
          setError(null)
          return
        }

        // Explicitly pass subdomain from client to bypass potential proxy header stripping
        let subdomain = ''
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname
          const parts = hostname.split('.')
          if (parts.length >= 3) {
            // Handle www.subdomain.domain.com vs subdomain.domain.com
            subdomain = parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
          }
        }

        const url = subdomain ? `/api/school/current?subdomain=${subdomain}` : '/api/school/current'
        const res = await fetch(url, { cache: 'no-store' })
        let data = null
        try {
          data = await res.json()
        } catch {
          data = null
        }

        setSchool(data?.school ?? null)
        setError(res.ok ? null : 'Failed to fetch school data')

        // Dynamic Title & Favicon Update
        if (data?.school) {
          document.title = data.school.name

          // Update favicon
          const link = document.querySelector("link[rel~='icon']")
          if (link) {
            link.href = data.school.logo_url || '/favicon.ico'
          } else {
            const newLink = document.createElement('link')
            newLink.rel = 'icon'
            newLink.href = data.school.logo_url || '/favicon.ico'
            document.head.appendChild(newLink)
          }
        }
      } catch (err) {
        setSchool(null)
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
