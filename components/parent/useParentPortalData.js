'use client'

import { useCallback, useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { fetchParentChildWithCache } from '@/lib/offline/parent-ops'

export function useParentPortalData(studentId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)

  const load = useCallback(async () => {
    if (!studentId) {
      setData(null)
      setFromCache(false)
      return
    }
    setLoading(true)
    setError('')
    setFromCache(false)
    try {
      const { data: payload, fromCache: cached } = await fetchParentChildWithCache(
        studentId,
        sessionFetch
      )
      setData(payload)
      setFromCache(Boolean(cached))
    } catch (e) {
      setError(e?.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, fromCache, reload: load }
}
