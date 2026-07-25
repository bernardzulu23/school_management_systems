'use client'

import { useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

/**
 * Load curriculum topics for a subject + form/grade (shared teacher/student hook).
 * Uses sessionFetch so anti-scraping headers + session refresh match other AI UIs.
 *
 * @param {string} subject
 * @param {string} gradeOrForm
 * @param {{ parentTopic?: string }} [options] — when set, loads subtopics under that topic
 */
export function useCurriculumTopics(subject, gradeOrForm, options = {}) {
  const parentTopic = String(options?.parentTopic || '').trim()
  const [topics, setTopics] = useState([])
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const subj = String(subject || '').trim()
    const grade = String(gradeOrForm || '').trim()
    if (!subj || !grade) {
      setTopics([])
      setTree([])
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
        if (parentTopic) params.set('parentTopic', parentTopic)
        const res = await sessionFetch(`/api/curriculum-topics?${params}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message || json.error || 'Failed to load topics')
        if (cancelled) return
        const list = Array.isArray(json?.data?.topics)
          ? json.data.topics
          : Array.isArray(json?.data?.subtopics)
            ? json.data.subtopics
            : []
        setTopics(list)
        setTree(Array.isArray(json?.data?.tree) ? json.data.tree : [])
      } catch (e) {
        if (cancelled) return
        setTopics([])
        setTree([])
        setError(e?.message || 'Failed to load topics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [subject, gradeOrForm, parentTopic])

  return { topics, tree, loading, error }
}
