'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

const ParentChildContext = createContext(null)

const STORAGE_KEY = 'zsms_parent_active_student'

export function ParentChildProvider({ children }) {
  const [list, setList] = useState([])
  const [studentId, setStudentIdState] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await sessionFetch('/api/parent/children')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load children')
      const kids = Array.isArray(json.children) ? json.children : []
      setList(kids)
      const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(STORAGE_KEY) : ''
      const preferred =
        kids.find((c) => c.student?.id === stored)?.student?.id || kids[0]?.student?.id || ''
      setStudentIdState(preferred)
      if (preferred && typeof window !== 'undefined') {
        window.sessionStorage.setItem(STORAGE_KEY, preferred)
      }
    } catch (e) {
      setError(e?.message || 'Failed to load children')
      setList([])
      setStudentIdState('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStudentId = useCallback((id) => {
    setStudentIdState(id)
    if (typeof window !== 'undefined' && id) {
      window.sessionStorage.setItem(STORAGE_KEY, id)
    }
  }, [])

  const activeChild = useMemo(
    () => list.find((c) => c.student?.id === studentId) || null,
    [list, studentId]
  )

  const value = useMemo(
    () => ({
      children: list,
      studentId,
      setStudentId,
      activeChild,
      loading,
      error,
      reload: load,
    }),
    [list, studentId, setStudentId, activeChild, loading, error, load]
  )

  return <ParentChildContext.Provider value={value}>{children}</ParentChildContext.Provider>
}

export function useParentChild() {
  const ctx = useContext(ParentChildContext)
  if (!ctx) throw new Error('useParentChild must be used within ParentChildProvider')
  return ctx
}

export function ParentChildSwitcher({ className = '' }) {
  const { children, studentId, setStudentId, loading } = useParentChild()
  if (loading) return null
  if (!children.length) {
    return (
      <p className={`text-sm text-ink/70 ${className}`}>
        No linked children yet. Ask the school to send a parent invite.
      </p>
    )
  }
  if (children.length === 1) {
    return (
      <p className={`text-sm font-medium ${className}`}>
        Viewing: {children[0].student?.name} ({children[0].student?.class})
      </p>
    )
  }
  return (
    <label className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <span className="font-medium">Child</span>
      <select
        className="rounded border border-ink/20 bg-paper px-2 py-1.5"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      >
        {children.map((c) => (
          <option key={c.student.id} value={c.student.id}>
            {c.student.name} — {c.student.class}
          </option>
        ))}
      </select>
    </label>
  )
}
