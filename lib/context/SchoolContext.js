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
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch school data')
        const data = await res.json()
        setSchool(data.school)

        // Dynamic Title & Favicon Update
        if (data.school) {
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
        console.error('Error fetching school context:', err)
        setError(err.message)
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
