'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

const GRADES = [
  { grade: 10, canonicalLevel: 'SS1', label: 'Grade 10 (SS1)' },
  { grade: 11, canonicalLevel: 'SS2', label: 'Grade 11 (SS2)' },
  { grade: 12, canonicalLevel: 'SS3', label: 'Grade 12 (SS3)' },
]

export default function OldSyllabusLandingPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [subjects, setSubjects] = useState([])
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear())
  const [resolution, setResolution] = useState(null)
  const [selectedGrade, setSelectedGrade] = useState(GRADES[0])
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) {
      router.replace('/login')
      return
    }
    const role = String(user.role || '').toLowerCase()
    if (!['teacher', 'headteacher', 'hod', 'admin'].includes(role)) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, user, router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/curriculum/old-syllabus', { credentials: 'include' })
        const json = await res.json()
        if (!cancelled && res.ok) setSubjects(json.subjects || [])
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      try {
        const qs = new URLSearchParams({
          canonicalLevel: selectedGrade.canonicalLevel,
          academicYear: String(academicYear),
        })
        const res = await fetch(`/api/curriculum/resolve-syllabus?${qs}`, {
          credentials: 'include',
        })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Failed to resolve syllabus')
          setResolution(null)
          return
        }
        setResolution(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Resolve failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedGrade, academicYear])

  if (isLoading || !user) {
    return (
      <DashboardLayout title="Old Syllabus">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Old Syllabus (Grades 10–12)">
      <div className="space-y-6 max-w-4xl">
        <p className="text-sm text-muted-foreground">
          Pre-CBC O-Level curriculum (Topic → Sub-topic → Outcomes with Knowledge / Skills /
          Values). Assessment structure comes from validated past papers.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            <span className="font-medium">Academic year</span>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={academicYear}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="font-medium">Grade / level</span>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={selectedGrade.grade}
              onChange={(e) => {
                const g = GRADES.find((x) => x.grade === Number(e.target.value))
                if (g) setSelectedGrade(g)
              }}
            >
              {GRADES.map((g) => (
                <option key={g.grade} value={g.grade}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {resolution ? (
          <div className="rounded-lg border p-4 text-sm space-y-1">
            <div>
              <strong>Resolved:</strong> {resolution.displayLabel} ·{' '}
              <code>{resolution.syllabusVersion}</code>
            </div>
            {resolution.syllabusVersion === 'CBC' ? (
              <p className="text-amber-700">
                CBC is active for this level/year. Use{' '}
                <Link className="underline" href="/dashboard/teacher/teaching-studio">
                  Teaching Studio
                </Link>{' '}
                instead of the old-syllabus generator.
              </p>
            ) : (
              <p className="text-emerald-700">Old syllabus is active — browse subjects below.</p>
            )}
          </div>
        ) : null}

        <div className="flex gap-3">
          <Link
            href="/dashboard/teacher/old-syllabus/generate"
            className="inline-flex items-center rounded-md bg-black text-white px-4 py-2 text-sm"
          >
            Open generator
          </Link>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Subjects (validated)</h2>
          {!subjects.length ? (
            <p className="text-sm text-muted-foreground">
              No VALID OldSyllabusDocument rows yet. Run{' '}
              <code>npx tsx scripts/ingest-old-syllabus.ts --fixture</code>.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {subjects.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{s.subject}</span>
                  <Link
                    className="underline"
                    href={`/dashboard/teacher/old-syllabus/${encodeURIComponent(s.subject)}/${selectedGrade.grade}`}
                  >
                    Browse Grade {selectedGrade.grade}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
