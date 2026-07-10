'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Download, FileText, Layers, Loader2 } from 'lucide-react'

function downloadBase64Docx(base64, filename) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const SUBJECTS = [
  'Chemistry',
  'Physics',
  'Biology',
  'Mathematics',
  'English',
  'History',
  'Geography',
  'Civic Education',
  'Computer Studies',
  'Agricultural Science',
]

const GRADES = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6', 'Grade 8', 'Grade 9']

export default function TeacherSchemesPage() {
  const [subject, setSubject] = useState('Chemistry')
  const [grade, setGrade] = useState('Form 2')
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [weekCount, setWeekCount] = useState(12)
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState([])

  const loadRecent = async () => {
    try {
      const res = await fetch('/api/curriculum/generate-scheme', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setRecent(Array.isArray(json.data) ? json.data : [])
    } catch {
      setRecent([])
    }
  }

  useEffect(() => {
    loadRecent()
  }, [])

  const handleScheme = async ({ submit = false } = {}) => {
    setBusy(true)
    try {
      const res = await fetch('/api/curriculum/generate-scheme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          grade,
          term,
          year: Number(year),
          weekCount: Number(weekCount) || 12,
          save: true,
          submit,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to generate scheme')
      if (json.downloadUrl) window.location.href = json.downloadUrl
      else if (json.wordBase64) {
        downloadBase64Docx(
          json.wordBase64,
          `scheme-${subject}-${grade}-${term}.docx`.replace(/\s+/g, '-')
        )
      }
      toast.success(submit ? 'Scheme generated and marked submitted' : 'Scheme of work generated')
      await loadRecent()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRecordTemplate = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/curriculum/generate-record-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          grade,
          term,
          year: Number(year),
          weekCount: Number(weekCount) || 12,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to generate template')
      if (json.downloadUrl) window.location.href = json.downloadUrl
      else if (json.wordBase64) {
        downloadBase64Docx(
          json.wordBase64,
          `record-of-work-${subject}-${grade}.docx`.replace(/\s+/g, '-')
        )
      }
      toast.success('Record of work template ready')
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardLayout userRole="teacher" title="Schemes">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher/curriculum">Curriculum Studio</Link>
          </Button>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Schemes of Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <Label>Subject</Label>
              <select
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Grade / Form</Label>
              <select
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Term</Label>
                <select
                  className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                >
                  <option>Term 1</option>
                  <option>Term 2</option>
                  <option>Term 3</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={2020}
                  max={2100}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weeks in term</Label>
              <Input
                type="number"
                min={1}
                max={16}
                value={weekCount}
                onChange={(e) => setWeekCount(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => handleScheme({ submit: false })}>
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Generate Scheme (Word)
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => handleScheme({ submit: true })}
              >
                Generate & mark submitted
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleRecordTemplate}
              >
                <FileText className="h-4 w-4 mr-2" />
                Record of Work template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Recent schemes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-royalPurple-text2">
            {recent.length === 0 ? (
              <p>No saved schemes yet.</p>
            ) : (
              recent.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between gap-2 border border-royalPurple-border/40 rounded-lg p-3"
                >
                  <div>
                    <div className="font-medium text-royalPurple-text1">
                      {s.subject} — {s.gradeOrForm}
                    </div>
                    <div className="text-sm">
                      {s.term} {s.year} · {s.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
