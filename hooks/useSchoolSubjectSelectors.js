'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSchool } from '@/lib/context/SchoolContext'
import {
  getSchoolGradeOptions,
  getSchoolSubjectNameOptions,
  resolveAssignmentGradeLabel,
} from '@/lib/subjects/schoolSubjectOptions'

/**
 * School-level grade/subject options for teacher AI and curriculum UIs.
 * Prefer teaching-assignment subjects when present; never fall back to a
 * secondary-only hardcoded list for primary schools.
 */
export function useSchoolSubjectSelectors({ gradeLevel = null } = {}) {
  const { school, isLoading: schoolLoading } = useSchool()
  const schoolLevel = String(school?.level || '').toLowerCase() || null
  const [assignmentSubjects, setAssignmentSubjects] = useState([])
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setAssignmentsLoading(true)
      try {
        const res = await fetch('/api/teaching-assignments', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        const items = Array.isArray(json?.data) ? json.data : []
        setAssignments(items)
        setAssignmentSubjects(
          [...new Set(items.map((a) => String(a.subjectName || '').trim()).filter(Boolean))].sort(
            (a, b) => a.localeCompare(b)
          )
        )
      } catch {
        if (!cancelled) {
          setAssignments([])
          setAssignmentSubjects([])
        }
      } finally {
        if (!cancelled) setAssignmentsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const grades = useMemo(
    () => getSchoolGradeOptions(schoolLevel || 'combined', gradeLevel),
    [schoolLevel, gradeLevel]
  )

  const subjects = useMemo(
    () =>
      getSchoolSubjectNameOptions({
        schoolLevel: schoolLevel || 'combined',
        gradeLevel,
        assignmentSubjects,
        enabledLocalLanguages: school?.enabledLocalLanguages,
      }),
    [schoolLevel, gradeLevel, assignmentSubjects, school?.enabledLocalLanguages]
  )

  return {
    school,
    schoolLevel,
    schoolLoading,
    grades,
    subjects,
    assignments,
    assignmentSubjects,
    assignmentsLoading,
    resolveAssignmentGradeLabel,
  }
}
