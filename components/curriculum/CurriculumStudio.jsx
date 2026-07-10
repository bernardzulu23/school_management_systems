'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, FileText, Layers, Loader2 } from 'lucide-react'

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

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function CurriculumStudio() {
  const [subject, setSubject] = useState('Chemistry')
  const [grade, setGrade] = useState('Form 2')
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [weekCount, setWeekCount] = useState(12)
  const [format, setFormat] = useState('word')
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState([])
  const [preview, setPreview] = useState(null)

  const loadRecent = async () => {
    try {
      const res = await fetch('/api/curriculum/scheme', { credentials: 'include' })
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
    setPreview(null)
    try {
      const res = await fetch('/api/curriculum/scheme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          grade,
          term,
          year: Number(year),
          weekCount: Number(weekCount) || 12,
          format,
          save: true,
          submit,
        }),
      })

      const baseName = `scheme-${subject}-${grade}-${term}`.replace(/\s+/g, '-')

      if (format === 'csv') {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || 'Failed to generate CSV')
        }
        const text = await res.text()
        downloadText(text, `${baseName}.csv`, 'text/csv;charset=utf-8')
        toast.success('Scheme CSV downloaded')
        await loadRecent()
        return
      }

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to generate scheme')

      if (format === 'json') {
        setPreview(json.scheme || null)
        downloadText(JSON.stringify(json.scheme, null, 2), `${baseName}.json`, 'application/json')
        toast.success('Scheme JSON ready')
        await loadRecent()
        return
      }

      if (json.downloadUrl) window.location.href = json.downloadUrl
      else if (json.wordBase64) downloadBase64Docx(json.wordBase64, `${baseName}.docx`)
      setPreview(json.scheme || null)
      toast.success(submit ? 'Scheme generated and marked submitted' : 'Scheme of work generated')
      await loadRecent()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRecordTemplate = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/curriculum/templates', {
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
      toast.success('Record of work template downloaded')
    } catch (err) {
      toast.error(err?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Generate scheme of work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cs-subject">Subject</Label>
              <select
                id="cs-subject"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <Label htmlFor="cs-grade">Grade / Form</Label>
              <select
                id="cs-grade"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            <div className="space-y-2">
              <Label htmlFor="cs-term">Term</Label>
              <select
                id="cs-term"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-year">Academic year</Label>
              <Input
                id="cs-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-weeks">Weeks / term</Label>
              <Input
                id="cs-weeks"
                type="number"
                min={1}
                max={16}
                value={weekCount}
                onChange={(e) => setWeekCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-format">Export format</Label>
              <select
                id="cs-format"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="word">Word (.docx)</option>
                <option value="csv">CSV (spreadsheet)</option>
                <option value="json">JSON (preview + download)</option>
              </select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Chemistry uses the built-in CDC 2024 dataset. Other subjects use JSON under{' '}
            <code className="text-xs">data/curriculum/</code> when present, or school-uploaded
            syllabi. Need a lesson plan from a week? Use{' '}
            <Link href="/dashboard/teacher/curriculum" className="underline">
              Curriculum Studio (lessons)
            </Link>
            .
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => handleScheme({ submit: false })}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Generate scheme of work
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => handleScheme({ submit: true })}
            >
              Generate &amp; mark submitted
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={handleRecordTemplate}
            >
              <FileText className="mr-2 h-4 w-4" />
              Record of work template
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview?.weeks?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Preview — {preview.subject} {preview.gradeOrForm} ({preview.source || 'json'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto rounded border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2">Week</th>
                    <th className="p-2">Topic</th>
                    <th className="p-2">Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.weeks.map((w) => (
                    <tr key={w.week} className="border-t">
                      <td className="p-2 align-top">{w.week}</td>
                      <td className="p-2 align-top">{w.topic}</td>
                      <td className="p-2 align-top text-muted-foreground">
                        {w.assessmentMethod || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent schemes</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved schemes yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"
                >
                  <span>
                    {r.subject} · {r.gradeOrForm} · {r.term} {r.year}
                  </span>
                  <span className="text-muted-foreground">
                    {r.status} · {new Date(r.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
