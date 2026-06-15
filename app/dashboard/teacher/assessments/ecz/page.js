'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ECZDeadlineTracker } from '@/components/assessments/ECZDeadlineTracker'
import { CreateEczAssessmentForm } from '@/components/assessments/CreateEczAssessmentForm'
import { RecordSbaScoreForm } from '@/components/assessments/RecordSbaScoreForm'
import {
  ArrowLeft,
  Download,
  RefreshCw,
  BookOpen,
  ClipboardList,
  PenLine,
  UserCheck,
  Archive,
  Table2,
  Sheet,
} from 'lucide-react'
import { EczRubricBuilderPanel } from '@/components/assessments/EczRubricBuilderPanel'
import { EczSbaTrackingSheet } from '@/components/assessments/EczSbaTrackingSheet'
import { SpecialAccommodationsPanel } from '@/components/assessments/SpecialAccommodationsPanel'
import { EczEvidencePanel } from '@/components/assessments/EczEvidencePanel'
import { toast } from 'react-hot-toast'
import { TeacherCompliancePanel } from '@/components/compliance/TeacherCompliancePanel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { EczGuidelinesCatalog } from '@/components/assessments/EczGuidelinesCatalog'
import { EczExamScenarioBuilder } from '@/components/assessments/EczExamScenarioBuilder'
import { EczReferencePanel } from '@/components/assessments/EczReferencePanel'
import { EczModerationPanel } from '@/components/assessments/EczModerationPanel'
import { ECZ_GUIDELINES_SUBJECT_COUNT } from '@/lib/ecz/ecz-subjects-data'
import { StaffRouteGuard } from '@/components/auth/StaffRouteGuard'
import { FileText, Target, ShieldCheck } from 'lucide-react'

const HUB_TAB_IDS = [
  'sba',
  'exam',
  'rubric',
  'tracking',
  'accommodations',
  'evidence',
  'reference',
  'moderation',
]

const HUB_TABS = [
  { id: 'sba', label: 'SBA & scores', icon: ClipboardList },
  { id: 'exam', label: 'Exam scenarios', icon: Target },
  { id: 'rubric', label: 'Rubric builder', icon: Table2 },
  { id: 'tracking', label: 'Tracking sheet', icon: Sheet },
  { id: 'accommodations', label: 'Accommodations', icon: UserCheck },
  { id: 'evidence', label: 'Evidence vault', icon: Archive },
  { id: 'reference', label: 'ECSEOL reference', icon: BookOpen },
  { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
]

function EczAssessmentHubContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [schoolLevel, setSchoolLevel] = useState(null)
  const [hubTab, setHubTab] = useState(HUB_TAB_IDS.includes(tabParam) ? tabParam : 'sba')
  const [rubricSubjectId, setRubricSubjectId] = useState('')
  const [rubricFormLevel, setRubricFormLevel] = useState('1')
  const [rubricTitle, setRubricTitle] = useState('')
  const [rubricTaskType, setRubricTaskType] = useState('Project')
  const [rubricDescription, setRubricDescription] = useState('')
  const [tasks, setTasks] = useState([])
  const [scoreCount, setScoreCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showRecord, setShowRecord] = useState(false)
  const createPanelRef = useRef(null)
  const [formLevelFilter, setFormLevelFilter] = useState('all')
  const [seeding, setSeeding] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [exportSubjectId, setExportSubjectId] = useState('')
  const [exportFormLevel, setExportFormLevel] = useState('1')

  useEffect(() => {
    if (HUB_TAB_IDS.includes(tabParam)) {
      setHubTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    fetch('/api/school/current', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { school: null }))
      .then((data) => setSchoolLevel(data?.school?.level || 'combined'))
      .catch(() => setSchoolLevel('combined'))
  }, [])

  const sbaTasks = useMemo(
    () => tasks.filter((t) => String(t.component || '') === 'SBA_TASK'),
    [tasks]
  )

  const learnersWithScores = useMemo(() => {
    const ids = new Set()
    for (const t of sbaTasks) {
      if (t._count?.scores > 0) ids.add(t.id)
    }
    return sbaTasks.reduce((sum, t) => sum + (t._count?.scores || 0), 0)
  }, [sbaTasks])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (formLevelFilter !== 'all') params.set('formLevel', formLevelFilter)
      const [tasksRes, scoresRes, subjectsRes] = await Promise.all([
        fetch(`/api/assessments/sba-tasks?${params}`, { credentials: 'include' }),
        fetch(
          `/api/assessments/sba-scores?academicYear=${new Date().getFullYear()}${
            formLevelFilter !== 'all' ? `&formLevel=${formLevelFilter}` : ''
          }`,
          { credentials: 'include' }
        ),
        fetch('/api/ecz/subjects/seed?sync=true', { credentials: 'include' }),
      ])
      const tasksJson = await tasksRes.json()
      const scoresJson = await scoresRes.json()
      const subjectsJson = await subjectsRes.json()
      if (!tasksRes.ok) throw new Error(tasksJson.error || 'Failed to load')
      setTasks(Array.isArray(tasksJson.data) ? tasksJson.data : [])
      setScoreCount(scoresJson.totalRecords ?? 0)
      const subjList = Array.isArray(subjectsJson.data) ? subjectsJson.data : []
      setSubjects(subjList)
      setExportSubjectId((current) => current || subjList[0]?.id || '')
    } catch (e) {
      toast.error(e.message || 'Failed to load ECZ assessments')
    } finally {
      setLoading(false)
    }
  }, [formLevelFilter])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    if (subjects[0]?.id && !rubricSubjectId) setRubricSubjectId(subjects[0].id)
  }, [subjects, rubricSubjectId])

  useEffect(() => {
    if (showCreate && createPanelRef.current) {
      createPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showCreate])

  const seedSubjects = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/ecz/subjects/seed', {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Seed failed')
      toast.success(
        `ECZ subjects synced: ${json.created} created, ${json.updated} updated (${json.total} total)`
      )
      loadTasks()
    } catch (e) {
      toast.error(e.message || 'Could not seed subjects')
    } finally {
      setSeeding(false)
    }
  }

  const downloadSubmission = async () => {
    if (!exportSubjectId) {
      toast.error('Select a subject for export')
      return
    }
    if (exportFormLevel === '4') {
      toast.error('Form 4 has no SBA submission')
      return
    }
    try {
      const res = await fetch('/api/ecz/submissions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: exportSubjectId,
          formLevel: parseInt(exportFormLevel, 10),
          academicYear: new Date().getFullYear(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Export failed')
      const blob = new Blob([json.csvData], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = json.fileName || 'ecz_submission.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('ECZ CSV downloaded')
      loadTasks()
    } catch (e) {
      toast.error(e.message || 'Submission failed')
    }
  }

  if (schoolLevel === 'primary') {
    return (
      <StaffRouteGuard>
        <DashboardLayout>
          <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ECZ SBA is for secondary schools</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-royalPurple-text2 space-y-3">
                <p>
                  Primary schools use CBC continuous assessment (ECE–Grade 7), not ECZ secondary
                  SBA.
                </p>
                <Link href="/dashboard/teacher/assessments/cbc">
                  <Button>Open CBC Assessment</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </StaffRouteGuard>
    )
  }

  return (
    <StaffRouteGuard>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/teacher/assessments">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Assessments
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <ClipboardList className="h-7 w-7" />
              ECZ School-Based Assessment
            </h1>
          </div>

          <ECZDeadlineTracker />

          <TeacherCompliancePanel domain="ecz_sba" />

          <div className="flex flex-wrap gap-2 border-b border-royalPurple-border/40 pb-4">
            {HUB_TABS.map((t) => {
              const Icon = t.icon
              const active = hubTab === t.id
              return (
                <Button
                  key={t.id}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHubTab(t.id)}
                  className={
                    active ? 'bg-gradient-to-r from-accent to-warn text-royalPurple-text1' : ''
                  }
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {t.label}
                </Button>
              )
            })}
          </div>

          {hubTab === 'exam' ? (
            <Card>
              <CardHeader>
                <CardTitle>Exam scenario builder (ECSEOL)</CardTitle>
              </CardHeader>
              <CardContent>
                <EczExamScenarioBuilder subjects={subjects} />
              </CardContent>
            </Card>
          ) : null}

          {hubTab === 'reference' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  ECSEOL reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EczReferencePanel />
              </CardContent>
            </Card>
          ) : null}

          {hubTab === 'moderation' ? (
            <Card>
              <CardHeader>
                <CardTitle>SBA moderation queue</CardTitle>
              </CardHeader>
              <CardContent>
                <EczModerationPanel />
              </CardContent>
            </Card>
          ) : null}

          {hubTab === 'rubric' ? (
            <Card>
              <CardHeader>
                <CardTitle>ECZ rubric builder</CardTitle>
              </CardHeader>
              <CardContent>
                <EczRubricBuilderPanel
                  subjects={subjects}
                  subjectId={rubricSubjectId}
                  onSubjectIdChange={setRubricSubjectId}
                  formLevel={rubricFormLevel}
                  onFormLevelChange={setRubricFormLevel}
                  title={rubricTitle}
                  onTitleChange={setRubricTitle}
                  taskType={rubricTaskType}
                  onTaskTypeChange={setRubricTaskType}
                  description={rubricDescription}
                  onDescriptionChange={setRubricDescription}
                />
              </CardContent>
            </Card>
          ) : null}

          {hubTab === 'tracking' ? (
            <Card>
              <CardHeader>
                <CardTitle>SBA task tracking sheet</CardTitle>
              </CardHeader>
              <CardContent>
                <EczSbaTrackingSheet subjects={subjects} />
              </CardContent>
            </Card>
          ) : null}

          {hubTab === 'accommodations' ? (
            <Card>
              <CardHeader>
                <CardTitle>Special accommodations (ECZ Rule 6)</CardTitle>
              </CardHeader>
              <CardContent>
                <SpecialAccommodationsPanel />
              </CardContent>
            </Card>
          ) : null}

          {hubTab === 'evidence' ? (
            <Card>
              <CardHeader>
                <CardTitle>SBA evidence vault (ECZ Rule 7)</CardTitle>
              </CardHeader>
              <CardContent>
                <EczEvidencePanel />
              </CardContent>
            </Card>
          ) : null}

          {hubTab === 'sba' ? (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900">
                <strong>ECZ compliance:</strong> Forms 1–3 use SBA (30%) + final exam (70%). Form 4
                has no SBA. Zambian context required. Four-level rubric. Submit by{' '}
                <strong>31 January</strong>. Register <strong>special accommodations</strong> and
                keep <strong>evidence for 2 years</strong> (other tabs).
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">SBA tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{sbaTasks.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Learners with scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{learnersWithScores || scoreCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">ECZ subjects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{subjects.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {subjects.length} of {ECZ_GUIDELINES_SUBJECT_COUNT} from guidelines
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Weighting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold">30% / 70%</p>
                    <p className="text-xs text-muted-foreground">SBA / Final exam</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setShowCreate((v) => !v)
                    setShowRecord(false)
                  }}
                >
                  {showCreate ? 'Hide create' : 'Create assessment'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRecord((v) => !v)
                    setShowCreate(false)
                  }}
                >
                  <PenLine className="h-4 w-4 mr-1" />
                  {showRecord ? 'Hide scoring' : 'Record SBA scores'}
                </Button>
                <Button variant="outline" onClick={seedSubjects} disabled={seeding}>
                  <BookOpen className="h-4 w-4 mr-1" />
                  {seeding ? 'Syncing…' : 'Sync ECZ subjects'}
                </Button>
                <Button variant="ghost" onClick={loadTasks}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Link href="/dashboard/teacher/assessments/question-bank">
                  <Button variant="outline">Question bank</Button>
                </Link>
              </div>

              {showCreate ? (
                <div ref={createPanelRef}>
                  <Card className="ring-2 ring-royalPurple-accent/50">
                    <CardHeader>
                      <CardTitle>New ECZ-compliant assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CreateEczAssessmentForm
                        onSuccess={() => {
                          setShowCreate(false)
                          loadTasks()
                        }}
                        onCancel={() => setShowCreate(false)}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {showRecord ? (
                <Card className="ring-2 ring-royalPurple-accent/50">
                  <CardHeader>
                    <CardTitle>Record SBA score (4-level rubric)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecordSbaScoreForm sbaTasks={sbaTasks} onSuccess={() => loadTasks()} />
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    ECZ Assessment Guidelines (subjects & constructs)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EczGuidelinesCatalog subjects={subjects} loading={loading} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Export to ECZ (CSV)</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                  <div className="min-w-[200px]">
                    <Label>Subject</Label>
                    <Select value={exportSubjectId} onValueChange={setExportSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label>Form</Label>
                    <Select value={exportFormLevel} onValueChange={setExportFormLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Form 1</SelectItem>
                        <SelectItem value="2">Form 2</SelectItem>
                        <SelectItem value="3">Form 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={downloadSubmission}>
                    <Download className="h-4 w-4 mr-1" />
                    Download CSV
                  </Button>
                  <Link href="/dashboard/teacher/ecz/submit">
                    <Button>Review &amp; submit to ECZ</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>SBA tasks & examinations</CardTitle>
                  <div className="w-40">
                    <Label className="sr-only">Form filter</Label>
                    <Select value={formLevelFilter} onValueChange={setFormLevelFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All forms</SelectItem>
                        <SelectItem value="1">Form 1</SelectItem>
                        <SelectItem value="2">Form 2</SelectItem>
                        <SelectItem value="3">Form 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No ECZ assessments yet. Sync subjects ({ECZ_GUIDELINES_SUBJECT_COUNT} from ECZ
                      guidelines), then create an SBA task with Zambian context.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {tasks.map((t) => (
                        <li key={t.id} className="py-3 flex justify-between gap-4">
                          <div>
                            <p className="font-medium">{t.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Grade: {t.class?.name || `Form ${t.formLevel}`} · Subject:{' '}
                              {t.subject?.name || '—'} · Teacher: {t.creator?.name || '—'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t.component?.replace(/_/g, ' ')} · {t.type}
                              {t._count?.scores != null ? ` · ${t._count.scores} score(s)` : ''}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{t.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </StaffRouteGuard>
  )
}

export default function EczAssessmentHubPage() {
  return (
    <Suspense
      fallback={
        <StaffRouteGuard>
          <DashboardLayout>
            <div className="p-6 text-muted-foreground">Loading ECZ hub…</div>
          </DashboardLayout>
        </StaffRouteGuard>
      }
    >
      <EczAssessmentHubContent />
    </Suspense>
  )
}
