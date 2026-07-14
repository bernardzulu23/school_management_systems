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
const MIN_WEEKS = 1
const MAX_WEEKS = 20

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
    midTermWeekEnd: number
    endOfTermWeek: number
    endOfTermWeekEnd: number
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
  const [midTermWeek, setMidTermWeek] = useState('7')
  const [midTermWeekEnd, setMidTermWeekEnd] = useState('7')
  const [endOfTermWeek, setEndOfTermWeek] = useState('12')
  const [endOfTermWeekEnd, setEndOfTermWeekEnd] = useState('13')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('word')
  const [studioTab, setStudioTab] = useState<StudioTab>('basic')
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState<RecentScheme[]>([])
  const [preview, setPreview] = useState<SchemePreview | null>(null)

  const weeksPerTermNum = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Number(weeksPerTerm) || 12))
  const weekChoices = Array.from({ length: weeksPerTermNum }, (_, i) => i + 1)
  const midStart = Number(midTermWeek) || 7
  const midEnd = Number(midTermWeekEnd) || midStart
  const eotStart = Number(endOfTermWeek) || Math.max(1, weeksPerTermNum - 1)
  const eotEnd = Number(endOfTermWeekEnd) || eotStart
  const midWeeksSet = new Set(
    Array.from(
      { length: Math.max(0, Math.abs(midEnd - midStart) + 1) },
      (_, i) => Math.min(midStart, midEnd) + i
    )
  )
  const eotWeeksSet = new Set(
    Array.from(
      { length: Math.max(0, Math.abs(eotEnd - eotStart) + 1) },
      (_, i) => Math.min(eotStart, eotEnd) + i
    )
  )
  const formatRange = (a: number, b: number) => (a === b ? `Week ${a}` : `Weeks ${a}–${b}`)

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
        const [currRes, assignRes] = await Promise.all([
          fetch('/api/curriculum', { credentials: 'include' }),
          fetch('/api/teaching-assignments', { credentials: 'include' }),
        ])
        const currJson = await currRes.json().catch(() => ({}))
        const assignJson = await assignRes.json().catch(() => ({}))
        if (cancelled) return
        const catalog =
          currRes.ok && Array.isArray(currJson.subjects)
            ? currJson.subjects.map(String).filter(Boolean)
            : []
        const assigned = (Array.isArray(assignJson?.data) ? assignJson.data : [])
          .map((a: { subjectName?: string }) => String(a.subjectName || '').trim())
          .filter(Boolean)
        const list = [...new Set([...assigned, ...catalog, ...FALLBACK_SUBJECTS])]
        if (list.length) {
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
    const clamp = (raw: string, fallback: number) => {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 1 || n > weeksPerTermNum) return String(fallback)
      return String(n)
    }
    const midDefault = Math.min(weeksPerTermNum, Math.ceil(weeksPerTermNum / 2))
    const eotDefault = weeksPerTermNum
    const eotStartDefault = Math.max(1, weeksPerTermNum - 1)
    setMidTermWeek((prev) => clamp(prev, midDefault))
    setMidTermWeekEnd((prev) => clamp(prev, Number(midTermWeek) || midDefault))
    setEndOfTermWeek((prev) => clamp(prev, eotStartDefault))
    setEndOfTermWeekEnd((prev) => clamp(prev, eotDefault))
  }, [weeksPerTermNum])

  const saveTestSchedule = async (schemeId: string | null | undefined) => {
    if (!schemeId) return
    const res = await fetch('/api/teaching/test-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        schemeId,
        midTermWeek: midStart,
        midTermWeekEnd: midEnd,
        endOfTermWeek: eotStart,
        endOfTermWeekEnd: eotEnd,
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
      midTermWeek: midStart,
      midTermWeekEnd: midEnd,
      endOfTermWeek: eotStart,
      endOfTermWeekEnd: eotEnd,
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
          midTermWeek: midStart,
          midTermWeekEnd: midEnd,
          endOfTermWeek: eotStart,
          endOfTermWeekEnd: eotEnd,
          format: exportFormat,
          save: true,
          submit,
        }),
      })

      const baseName = `scheme-${subject}-${grade}-${term}`.replace(/\s+/g, '-')
      const rangeLabel = `Mid-term ${formatRange(midStart, midEnd)} · End-of-term ${formatRange(eotStart, eotEnd)}`

      if (exportFormat === 'csv') {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || 'Failed to generate CSV')
        }
        const schemeIdHeader = res.headers.get('X-Scheme-Id')
        const text = await res.text()
        downloadText(text, `${baseName}.csv`, 'text/csv;charset=utf-8')
        await saveTestSchedule(schemeIdHeader)
        toast.success(`Scheme CSV downloaded · ${rangeLabel}`)
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
        toast.success(`Scheme JSON ready · ${rangeLabel}`)
        await loadRecent()
        notifySaved(schemeId)
        return
      }

      if (json.downloadUrl) window.location.href = json.downloadUrl
      else if (json.wordBase64) downloadBase64Docx(json.wordBase64, `${baseName}.docx`)
      setPreview(json.scheme || null)
      toast.success(
        submit ? `Scheme submitted · ${rangeLabel}` : `Scheme generated · ${rangeLabel}`
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
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(60vh,22rem)]">
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s} className="py-2.5">
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
                  <Label htmlFor="cs-weeks">Weeks per Term</Label>
                  <Input
                    id="cs-weeks"
                    type="number"
                    min={MIN_WEEKS}
                    max={MAX_WEEKS}
                    value={weeksPerTerm}
                    onChange={(e) => {
                      const raw = e.target.value
                      setWeeksPerTerm(raw)
                      const n = Number(raw)
                      if (Number.isFinite(n) && n >= MIN_WEEKS && n <= MAX_WEEKS) {
                        const mid = Math.ceil(n / 2)
                        setMidTermWeek(String(mid))
                        setMidTermWeekEnd(String(mid))
                        setEndOfTermWeek(String(Math.max(1, n - 1)))
                        setEndOfTermWeekEnd(String(n))
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter any length from {MIN_WEEKS}–{MAX_WEEKS} weeks (not fixed to 8/10/12).
                  </p>
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
                      Mid-term and end-of-term weeks are assessment-only (no teaching topics). Use a
                      range when tests span multiple weeks (e.g. end-of-term 12–13).
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mid-Term Test Weeks</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={midTermWeek} onValueChange={setMidTermWeek}>
                      <SelectTrigger>
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekChoices.map((w) => (
                          <SelectItem key={`mid-s-${w}`} value={w.toString()}>
                            Week {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={midTermWeekEnd} onValueChange={setMidTermWeekEnd}>
                      <SelectTrigger>
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekChoices.map((w) => (
                          <SelectItem key={`mid-e-${w}`} value={w.toString()}>
                            Week {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Week {Math.ceil(weeksPerTermNum / 2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>End-of-Term Test Weeks</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={endOfTermWeek} onValueChange={setEndOfTermWeek}>
                      <SelectTrigger>
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekChoices.map((w) => (
                          <SelectItem key={`eot-s-${w}`} value={w.toString()}>
                            Week {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={endOfTermWeekEnd} onValueChange={setEndOfTermWeekEnd}>
                      <SelectTrigger>
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekChoices.map((w) => (
                          <SelectItem key={`eot-e-${w}`} value={w.toString()}>
                            Week {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Weeks {Math.max(1, weeksPerTermNum - 1)}–{weeksPerTermNum}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Schedule Summary:</strong> Mid-term{' '}
                  {formatRange(midStart, midEnd)} · End-of-term {formatRange(eotStart, eotEnd)}{' '}
                  (excluded from teaching coverage)
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
              Mid-term {formatRange(midStart, midEnd)} · End-of-term {formatRange(eotStart, eotEnd)}
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
                    const isMid = midWeeksSet.has(Number(w.week))
                    const isEot = eotWeeksSet.has(Number(w.week))
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
