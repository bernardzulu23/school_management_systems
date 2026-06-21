'use client'

import { useCallback, useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

/**
 * @param {string} path
 * @param {unknown[]} [deps]
 */
export function useHodApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await sessionFetch(path, { credentials: 'include', cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || json.message || `Request failed (${res.status})`)
      }
      setData(json.data ?? null)
    } catch (e) {
      setError(e?.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps])

  return { data, loading, error, reload }
}
