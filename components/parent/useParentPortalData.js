'use client'

import { useCallback, useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export function useParentPortalData(studentId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!studentId) {
      setData(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await sessionFetch(`/api/parent/child?studentId=${encodeURIComponent(studentId)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json.data)
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

  return { data, loading, error, reload: load }
}
