'use client'

import { useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export type DepartmentClassOption = {
  id: string
  name: string
  label: string
  form?: string
  departmentId?: string | null
}

interface Props {
  departmentId: string
  teacherUserId?: string
  selectedClassIds?: string[]
  selectedClassNames?: string[]
  multiple?: boolean
  onChange: (values: { ids: string[]; names: string[] }) => void
  className?: string
}

export function DepartmentFilteredClassDropdown({
  departmentId,
  teacherUserId = '',
  selectedClassIds = [],
  selectedClassNames = [],
  multiple = true,
  onChange,
  className = 'zsms-input w-full',
}: Props) {
  const [classes, setClasses] = useState<DepartmentClassOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!departmentId) {
      setClasses([])
      return
    }
    setLoading(true)
    const qs = new URLSearchParams({ departmentId })
    if (teacherUserId) qs.set('teacherUserId', teacherUserId)
    sessionFetch(`/api/timetable/classes?${qs.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false))
  }, [departmentId, teacherUserId])

  if (!departmentId) {
    return <p className="text-sm text-royalPurple-text3">Select a department to see its classes.</p>
  }

  if (loading) {
    return <p className="text-sm text-royalPurple-text3">Loading classes…</p>
  }

  if (classes.length === 0) {
    return (
      <p className="text-sm text-royalPurple-text3">
        {teacherUserId
          ? 'No classes found for this teacher in your department. Check their teaching assignments in User Management, or set a department on each class.'
          : 'No classes linked to this department. Select a teacher first, assign teachers to classes in User Management, or set a department on each class.'}
      </p>
    )
  }

  if (multiple) {
    return (
      <div
        className="grid gap-2 max-h-40 overflow-y-auto p-2 border border-royalPurple-border/40 rounded-lg"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
      >
        {classes.map((c) => {
          const name = c.label || c.name
          const checked = selectedClassNames.includes(name) || selectedClassIds.includes(c.id)
          return (
            <label
              key={c.id}
              className="flex items-center gap-2 text-sm cursor-pointer text-royalPurple-text1"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const ids = checked
                    ? selectedClassIds.filter((id) => id !== c.id)
                    : [...selectedClassIds, c.id]
                  const names = checked
                    ? selectedClassNames.filter((n) => n !== name)
                    : [...selectedClassNames, name]
                  onChange({ ids, names })
                }}
              />
              {name}
            </label>
          )
        })}
      </div>
    )
  }

  const value = selectedClassIds[0] || ''

  return (
    <select
      className={className}
      value={value}
      onChange={(e) => {
        const id = e.target.value
        const row = classes.find((c) => c.id === id)
        onChange({
          ids: id ? [id] : [],
          names: row ? [row.label || row.name] : [],
        })
      }}
    >
      <option value="">Select a class…</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label || c.name}
          {c.form ? ` (${c.form})` : ''}
        </option>
      ))}
    </select>
  )
}
