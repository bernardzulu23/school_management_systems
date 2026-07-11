'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Download, FileText, Layers, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const FALLBACK_SUBJECTS = [
  'Agricultural Science',
  'Art and Design',
  'Biology',
  'Chemistry',
  'Civic Education',
  'Commerce and Principles of Accounts',
  'Computer Science',
  'Design and Technology Studies',
  'English',
  'Fashion and Fabrics',
  'Food and Nutrition',
  'French Language',
  'Geography',
  'History',
  'Hospitality Management',
  'ICT',
  'Literature in English',
  'Mathematics',
  'Mathematics II',
  'Music Arts',
  'Physical Education',
  'Physics',
  'Religious Education',
  'Travel and Tourism',
  'Zambian Languages',
]

const GRADES = [
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
]

const TERMS = ['Term 1', 'Term 2', 'Term 3'] as const
const WEEK_OPTIONS = [8, 10, 12, 14, 16] as const

type ExportFormat = 'word' | 'csv' | 'json'
type StudioTab = 'basic' | 'tests'

type SchemeWeek = {
  week: number
  topic: string
  assessmentMethod?: string
}

type SchemePreview = {
  subject: string
  gradeOrForm: string
  source?: string
  weeks?: SchemeWeek[]
}

type RecentScheme = {
  id: string
  subject: string
  gradeOrForm: string
  term: string
  year: number
  status: string
  updatedAt: string
}

function downloadBase64Docx(base64: string, filename: string) {
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

function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type CurriculumStudioProps = {
  /** When true, hide the outer page chrome (used inside Teaching Studio) */
  embedded?: boolean
  /** Called after a scheme is saved (JSON/word/csv paths that return schemeId) */
  onSchemeSaved?: (schemeId: string | null) => void
  /** Alias used by Teaching Studio consumers */
  onSchemeGenerated?: (meta: {
    schemeId: string | null
    subject: string
    grade: string
    term: string
    academicYear: number
    midTermWeek: number
    endOfTermWeek: number
  }) => void
}

export function CurriculumStudio({
  embedded = false,
  onSchemeSaved,
  onSchemeGenerated,
}: CurriculumStudioProps) {
  const [subjects, setSubjects] = useState<string[]>(FALLBACK_SUBJECTS)
  const [subject, setSubject] = useState('Chemistry')
  const [grade, setGrade] = useState('Form 2')
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [weeksPerTerm, setWeeksPerTerm] = useState('12')
  const [midTermWeek, setMidTermWeek] = useState('6')
  const [endOfTermWeek, setEndOfTermWeek] = useState('12')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('word')
  const [studioTab, setStudioTab] = useState<StudioTab>('basic')
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState<RecentScheme[]>([])
  const [preview, setPreview] = useState<SchemePreview | null>(null)

  const weeksPerTermNum = Number(weeksPerTerm) || 12
  const weekChoices = Array.from({ length: weeksPerTermNum }, (_, i) => i + 1)

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
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/curriculum', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && Array.isArray(json.subjects) && json.subjects.length) {
          const list = json.subjects.map(String).filter(Boolean)
          setSubjects(list)
          setSubject((prev) => (list.includes(prev) ? prev : list[0]))
        }
      } catch {
        // keep fallback
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const mid = Number(midTermWeek)
    const eot = Number(endOfTermWeek)
    if (!Number.isFinite(mid) || mid < 1 || mid > weeksPerTermNum) {
      setMidTermWeek(String(Math.ceil(weeksPerTermNum / 2)))
    }
    if (!Number.isFinite(eot) || eot < 1 || eot > weeksPerTermNum) {
      setEndOfTermWeek(String(weeksPerTermNum))
    }
  }, [weeksPerTermNum, midTermWeek, endOfTermWeek])

  const saveTestSchedule = async (schemeId: string | null | undefined) => {
    if (!schemeId) return
    const res = await fetch('/api/teaching/test-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        schemeId,
        midTermWeek: Number(midTermWeek) || null,
        endOfTermWeek: Number(endOfTermWeek) || null,
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to save test schedule')
    }
  }

  const notifySaved = (schemeId: string | null) => {
    onSchemeSaved?.(schemeId)
    onSchemeGenerated?.({
      schemeId,
      subject,
      grade,
      term,
      academicYear: Number(year),
      midTermWeek: Number(midTermWeek),
      endOfTermWeek: Number(endOfTermWeek),
    })
  }

  const handleGenerateScheme = async ({ submit = false }: { submit?: boolean } = {}) => {
    if (!subject || !grade || !term) {
      toast.error('Please select subject, grade, and term')
      return
    }

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
          academicYear: Number(year),
          weeksPerTerm: weeksPerTermNum,
          format: exportFormat,
          save: true,
          submit,
        }),
      })

      const baseName = `scheme-${subject}-${grade}-${term}`.replace(/\s+/g, '-')

      if (exportFormat === 'csv') {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || 'Failed to generate CSV')
        }
        const schemeIdHeader = res.headers.get('X-Scheme-Id')
        const text = await res.text()
        downloadText(text, `${baseName}.csv`, 'text/csv;charset=utf-8')
        await saveTestSchedule(schemeIdHeader)
        toast.success(
          `Scheme CSV downloaded · Mid-term W${midTermWeek} · End-of-term W${endOfTermWeek}`
        )
        await loadRecent()
        notifySaved(schemeIdHeader || null)
        return
      }

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to generate scheme')

      const schemeId = (json.schemeId as string | null) || null
      await saveTestSchedule(schemeId)

      if (exportFormat === 'json') {
        setPreview(json.scheme || null)
        downloadText(JSON.stringify(json.scheme, null, 2), `${baseName}.json`, 'application/json')
        toast.success(
          `Scheme JSON ready · Mid-term W${midTermWeek} · End-of-term W${endOfTermWeek}`
        )
        await loadRecent()
        notifySaved(schemeId)
        return
      }

      if (json.downloadUrl) window.location.href = json.downloadUrl
      else if (json.wordBase64) downloadBase64Docx(json.wordBase64, `${baseName}.docx`)
      setPreview(json.scheme || null)
      toast.success(
        submit
          ? `Scheme submitted · Mid-term W${midTermWeek} · End-of-term W${endOfTermWeek}`
          : `Scheme generated · Mid-term W${midTermWeek} · End-of-term W${endOfTermWeek}`
      )
      await loadRecent()
      notifySaved(schemeId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
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
          weekCount: weeksPerTermNum,
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {embedded && (
        <p className="text-sm text-muted-foreground">
          Generate a scheme here (with mid-term / end-of-term weeks), then mark weeks complete in
          the progress sidebar.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Scheme of Work Generator
          </CardTitle>
          <CardDescription>
            Generate term-long teaching plans with mid-term and end-of-term test scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setStudioTab('basic')}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                studioTab === 'basic'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              Basic Setup
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('tests')}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                studioTab === 'tests'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              Test Schedule
            </button>
          </div>

          {studioTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Grade / Form</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={term} onValueChange={setTerm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>Weeks per Term</Label>
                  <Select
                    value={weeksPerTerm}
                    onValueChange={(v) => {
                      setWeeksPerTerm(v)
                      const n = Number(v) || 12
                      setMidTermWeek(String(Math.ceil(n / 2)))
                      setEndOfTermWeek(String(n))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select weeks" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_OPTIONS.map((w) => (
                        <SelectItem key={w} value={w.toString()}>
                          {w} weeks
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(v) => setExportFormat(v as ExportFormat)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="word">Word (.docx) — Best for printing</SelectItem>
                      <SelectItem value="csv">CSV — For spreadsheets</SelectItem>
                      <SelectItem value="json">JSON — Preview in app</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Subjects load from ingested curriculum JSON when available. Need a lesson plan from
                a week? Use{' '}
                <Link href="/dashboard/teacher/curriculum" className="underline">
                  Curriculum Studio (lessons)
                </Link>
                .
              </p>
            </div>
          )}

          {studioTab === 'tests' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                  <div>
                    <h4 className="font-medium text-sky-900">Test Schedule Setup</h4>
                    <p className="mt-1 text-sm text-sky-700">
                      Select which weeks will have your mid-term and end-of-term tests. These are
                      saved with the scheme for Teaching Studio planning.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mid-Term Test Week</Label>
                  <Select value={midTermWeek} onValueChange={setMidTermWeek}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekChoices.map((w) => (
                        <SelectItem key={w} value={w.toString()}>
                          Week {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Week {Math.ceil(weeksPerTermNum / 2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>End-of-Term Test Week</Label>
                  <Select value={endOfTermWeek} onValueChange={setEndOfTermWeek}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekChoices.map((w) => (
                        <SelectItem key={w} value={w.toString()}>
                          Week {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Week {weeksPerTermNum}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Schedule Summary:</strong> Mid-term in Week{' '}
                  {midTermWeek} · End-of-term in Week {endOfTermWeek}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              disabled={busy || !subject || !grade || !term}
              onClick={() => handleGenerateScheme({ submit: false })}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {busy ? 'Generating...' : 'Generate Scheme of Work'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !subject || !grade || !term}
              onClick={() => handleGenerateScheme({ submit: true })}
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
            <CardDescription>
              Mid-term Week {midTermWeek} · End-of-term Week {endOfTermWeek}
            </CardDescription>
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
                  {preview.weeks.map((w) => {
                    const isMid = Number(w.week) === Number(midTermWeek)
                    const isEot = Number(w.week) === Number(endOfTermWeek)
                    return (
                      <tr
                        key={w.week}
                        className={cn('border-t', (isMid || isEot) && 'bg-amber-50')}
                      >
                        <td className="p-2 align-top">
                          {w.week}
                          {isMid ? ' · Mid-term' : ''}
                          {isEot ? ' · End-of-term' : ''}
                        </td>
                        <td className="p-2 align-top">{w.topic}</td>
                        <td className="p-2 align-top text-muted-foreground">
                          {w.assessmentMethod || '—'}
                        </td>
                      </tr>
                    )
                  })}
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
