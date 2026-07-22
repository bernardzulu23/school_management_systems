'use client'

import { useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

/**
 * Load curriculum topics for a subject + form/grade (shared teacher/student hook).
 * Uses sessionFetch so anti-scraping headers + session refresh match other AI UIs.
 * @param {string} subject
 * @param {string} gradeOrForm
 */
export function useCurriculumTopics(subject, gradeOrForm) {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const subj = String(subject || '').trim()
    const grade = String(gradeOrForm || '').trim()
    if (!subj || !grade) {
      setTopics([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const params = new URLSearchParams({ subject: subj, grade })
        const res = await sessionFetch(`/api/curriculum-topics?${params}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message || json.error || 'Failed to load topics')
        if (cancelled) return
        setTopics(Array.isArray(json?.data?.topics) ? json.data.topics : [])
      } catch (e) {
        if (cancelled) return
        setTopics([])
        setError(e?.message || 'Failed to load topics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [subject, gradeOrForm])

  return { topics, loading, error }
}
