'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen, Download, Layers, Loader2, Upload } from 'lucide-react'

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

export default function TeacherCurriculumStudioPage() {
  const [subject, setSubject] = useState('Chemistry')
  const [grade, setGrade] = useState('Form 2')
  const [topic, setTopic] = useState('')
  const [unit, setUnit] = useState('')
  const [duration, setDuration] = useState(40)
  const [topics, setTopics] = useState([])
  const [units, setUnits] = useState([])
  const [loadingCurriculum, setLoadingCurriculum] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [lastPlanId, setLastPlanId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingCurriculum(true)
      try {
        const res = await fetch(
          `/api/curriculum?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`,
          { credentials: 'include' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load curriculum')
        if (cancelled) return
        setTopics(Array.isArray(json?.data?.topics) ? json.data.topics : [])
        setUnits(Array.isArray(json?.data?.units) ? json.data.units : [])
      } catch (e) {
        if (!cancelled) {
          setTopics([])
          setUnits([])
        }
      } finally {
        if (!cancelled) setLoadingCurriculum(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [subject, grade])

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!topic.trim()) {
      toast.error('Enter a topic')
      return
    }
    setGenerating(true)
    setLastPlanId(null)
    try {
      const res = await fetch('/api/curriculum/generate-lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          grade,
          topic: topic.trim(),
          unit: unit.trim() || undefined,
          duration: Number(duration) || 40,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setLastPlanId(json.lessonPlanId || null)
      if (json.downloadUrl) {
        window.location.href = json.downloadUrl
      } else if (json.wordBase64) {
        downloadBase64Docx(
          json.wordBase64,
          `${subject}-${grade}-${topic}.docx`.replace(/\s+/g, '-')
        )
      }
      toast.success(json.fromCache ? 'Loaded from cache' : 'Lesson plan generated')
    } catch (err) {
      toast.error(err.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleIngestFile = async (file) => {
    if (!file) return
    setIngesting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('subject', subject)
      form.append('gradeOrForm', grade)
      const res = await fetch('/api/curriculum/ingest', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Ingest failed')
      toast.success('Syllabus ingested')
      setTopics(
        (json.curriculum?.units || [])
          .flatMap((u) => [u.title, ...(u.topics || [])])
          .filter(Boolean)
      )
      setUnits(json.curriculum?.units || [])
    } catch (err) {
      toast.error(err.message || 'Ingest failed')
    } finally {
      setIngesting(false)
    }
  }

  const handleIngestUrl = async () => {
    if (!pdfUrl.trim()) {
      toast.error('Enter a PDF URL')
      return
    }
    setIngesting(true)
    try {
      const res = await fetch('/api/curriculum/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pdfUrl: pdfUrl.trim(),
          subject,
          gradeOrForm: grade,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Ingest failed')
      toast.success('Syllabus ingested from URL')
      setUnits(json.curriculum?.units || [])
      setTopics(
        (json.curriculum?.units || [])
          .flatMap((u) => [u.title, ...(u.topics || [])])
          .filter(Boolean)
      )
    } catch (err) {
      toast.error(err.message || 'Ingest failed')
    } finally {
      setIngesting(false)
    }
  }

  return (
    <DashboardLayout userRole="teacher" title="Curriculum Studio">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher/schemes">
              <Layers className="h-4 w-4 mr-2" />
              Schemes of Work
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher/lesson-planner">AI Lesson Planner</Link>
          </Button>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lesson Plan Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4 max-w-xl">
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
              <div className="space-y-2">
                <Label>Unit (optional)</Label>
                <select
                  className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value)
                    if (e.target.value) setTopic(e.target.value)
                  }}
                >
                  <option value="">Select unit…</option>
                  {units.map((u) => (
                    <option key={u.id || u.title} value={u.title}>
                      {u.title}
                    </option>
                  ))}
                </select>
                {loadingCurriculum && (
                  <p className="text-sm text-royalPurple-text3">Loading curriculum topics…</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input
                  list="curriculum-topics"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Atomic Structure"
                  required
                />
                <datalist id="curriculum-topics">
                  {topics.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={20}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Lesson Plan
                  </>
                )}
              </Button>
              {lastPlanId && (
                <p className="text-sm text-royalPurple-text2">
                  Saved plan:{' '}
                  <Link
                    className="underline"
                    href={`/dashboard/teacher/lesson-plans/${lastPlanId}`}
                  >
                    open in My Lesson Plans
                  </Link>
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload syllabus PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <p className="text-sm text-royalPurple-text2">
              Optional: ingest a MoGE/CDC syllabus PDF for this subject and grade. Built-in
              Chemistry CDC JSON is used when no school syllabus is uploaded.
            </p>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              disabled={ingesting}
              onChange={(e) => handleIngestFile(e.target.files?.[0])}
            />
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Or PDF URL</Label>
                <Input
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={ingesting}
                onClick={handleIngestUrl}
              >
                {ingesting ? 'Ingesting…' : 'Ingest URL'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
