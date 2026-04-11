'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Users } from 'lucide-react'
import { GRADE_LEVELS } from '@/lib/constants'

function gradeOrderIndex(value) {
  const normalized = String(value || '').trim()
  const idx = GRADE_LEVELS.findIndex(
    (x) => String(x).trim().toLowerCase() === normalized.toLowerCase()
  )
  if (idx >= 0) return idx
  return Number.POSITIVE_INFINITY
}

function sortYearGroups(groups) {
  return groups
    .slice()
    .sort((a, b) => gradeOrderIndex(a) - gradeOrderIndex(b) || String(a).localeCompare(String(b)))
}

export function StudentRosterCard({ title = 'Registered Students by Class' }) {
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [classes, setClasses] = useState([])
  const [selectedYearGroup, setSelectedYearGroup] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true)
      try {
        const res = await fetch('/api/classes', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load classes')
        const json = await res.json().catch(() => ({}))
        const data = Array.isArray(json?.data) ? json.data : []
        setClasses(data)
      } catch {
        setClasses([])
      } finally {
        setLoadingClasses(false)
      }
    }
    load()
  }, [])

  const yearGroups = useMemo(() => {
    const set = new Set(classes.map((c) => String(c.year_group || '').trim()).filter(Boolean))
    return sortYearGroups(Array.from(set))
  }, [classes])

  const classesInYearGroup = useMemo(() => {
    if (!selectedYearGroup) return []
    return classes
      .filter((c) => String(c.year_group || '').trim() === selectedYearGroup)
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  }, [classes, selectedYearGroup])

  useEffect(() => {
    if (!selectedYearGroup && yearGroups.length > 0) {
      setSelectedYearGroup(yearGroups[0])
    }
  }, [yearGroups, selectedYearGroup])

  useEffect(() => {
    if (!selectedYearGroup) return
    const list = classesInYearGroup
    if (list.length === 0) {
      setSelectedClassId('')
      setStudents([])
      return
    }
    const stillValid = list.some((c) => String(c.id) === String(selectedClassId))
    if (!stillValid) setSelectedClassId(String(list[0].id))
  }, [classesInYearGroup, selectedYearGroup, selectedClassId])

  const selectedClass = useMemo(() => {
    return classes.find((c) => String(c.id) === String(selectedClassId)) || null
  }, [classes, selectedClassId])

  useEffect(() => {
    const load = async () => {
      if (!selectedClassId) return
      setLoadingStudents(true)
      try {
        const url = `/api/students?classId=${encodeURIComponent(selectedClassId)}&page=1&limit=5000`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load students')
        const json = await res.json().catch(() => ({}))
        const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
        setStudents(data)
      } catch {
        setStudents([])
      } finally {
        setLoadingStudents(false)
      }
    }
    load()
  }, [selectedClassId])

  const filteredStudents = useMemo(() => {
    if (!search) return students
    const q = search.toLowerCase()
    return students.filter((s) => {
      return (
        String(s?.name || '')
          .toLowerCase()
          .includes(q) ||
        String(s?.exam_number || '')
          .toLowerCase()
          .includes(q) ||
        String(s?.class || '')
          .toLowerCase()
          .includes(q)
      )
    })
  }, [students, search])

  const totalStudentsInYearGroup = useMemo(() => {
    const byClassId = new Map(classesInYearGroup.map((c) => [String(c.id), c]))
    if (!selectedClassId || !byClassId.has(String(selectedClassId))) return null
    return students.length
  }, [classesInYearGroup, selectedClassId, students.length])

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
            {title}
          </span>
          {selectedClass ? (
            <span className="text-sm font-normal text-royalPurple-text2">
              {filteredStudents.length} / {students.length} students
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label>Year / Grade</Label>
              <Select
                value={selectedYearGroup}
                onValueChange={setSelectedYearGroup}
                disabled={loadingClasses}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingClasses ? 'Loading...' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {yearGroups.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
                disabled={loadingClasses || !selectedYearGroup || classesInYearGroup.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingClasses ? 'Loading...' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {classesInYearGroup.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search Students</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name/exam no..."
              />
            </div>
          </div>

          {selectedClass && (
            <div className="text-sm text-royalPurple-text2">
              Showing {selectedClass.name} ({selectedClass.year_group})
              {typeof totalStudentsInYearGroup === 'number'
                ? ` • ${totalStudentsInYearGroup} registered`
                : ''}
            </div>
          )}

          {loadingStudents ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-royalPurple-accentTx" />
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-royalPurple-text2 uppercase bg-royalPurple-page">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Exam No.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-royalPurple-page">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3">{s.class || selectedClass?.name || '-'}</td>
                      <td className="px-4 py-3">{s.exam_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-royalPurple-text3 text-sm">
              {selectedClass ? 'No students found in this class.' : 'No classes found.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
