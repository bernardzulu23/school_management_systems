'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Load enrolled subjects + curriculum topics for the authenticated student.
 */
export function useStudentEnrolledSubjects() {
  const [subjects, setSubjects] = useState([])
  const [gradeOrForm, setGradeOrForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/student/subjects', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load subjects')
      setSubjects(Array.isArray(json?.data) ? json.data : [])
      setGradeOrForm(json?.meta?.gradeOrForm || null)
    } catch (e) {
      setSubjects([])
      setError(e?.message || 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { subjects, gradeOrForm, loading, error, reload }
}

/**
 * Load curriculum topics for an enrolled subject (server rejects out-of-enrollment).
 * @param {string} subjectName
 */
export function useStudentCurriculumTopics(subjectName) {
  const [topics, setTopics] = useState([])
  const [gradeOrForm, setGradeOrForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const subject = String(subjectName || '').trim()
    if (!subject) {
      setTopics([])
      setGradeOrForm(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(
          `/api/student/curriculum-topics?subject=${encodeURIComponent(subject)}`,
          { credentials: 'include' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message || json.error || 'Failed to load topics')
        if (cancelled) return
        setTopics(Array.isArray(json?.data?.topics) ? json.data.topics : [])
        setGradeOrForm(json?.data?.gradeOrForm || null)
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
  }, [subjectName])

  return { topics, gradeOrForm, loading, error }
}
