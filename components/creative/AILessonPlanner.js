'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIStream } from '@/hooks/useAIStream'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildFrameworkElementsBlock, LESSON_PLAN_TEMPLATE_OPTIONS } from '@/lib/lessonPlanTemplate'
import { buildLessonPlanHeaderBlock } from '@/lib/lesson-plans/header-block'
import { composeLessonPlanDisplay } from '@/lib/lesson-plans/text'
import { LessonPlanDownloadButton } from '@/components/lesson-plans/LessonPlanViewer'
import { RagReferencesPanel } from '@/components/ai/RagReferencesPanel'
import { Download, FileText, Printer } from 'lucide-react'
import { sessionFetch, authErrorMessage } from '@/lib/auth/sessionFetch'

const GRADE_GROUPS = [
  {
    label: 'Primary (Grades 1–7)',
    grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
  },
  {
    label: 'Senior Secondary (Grades 10–12)',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
  },
  {
    label: 'CBC Secondary — New Structure (Forms 1–6)',
    grades: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
  },
]

const SUBJECT_GROUPS = [
  {
    label: 'Languages',
    subjects: ['English Language', 'French', 'Zambian Languages'],
  },
  {
    label: 'Mathematics & Sciences',
    subjects: ['Mathematics', 'Integrated Science', 'Biology', 'Chemistry', 'Physics'],
  },
  {
    label: 'Humanities & Social Sciences',
    subjects: ['Social Studies', 'History', 'Geography', 'Civic Education', 'Religious Education'],
  },
  {
    label: 'Business & Commerce',
    subjects: ['Business Studies', 'Principles of Accounts', 'Commerce', 'Financial Literacy'],
  },
  {
    label: 'Technology & Computing',
    subjects: ['Computer Studies / ICT', 'Technical Drawing'],
  },
  {
    label: 'Practical & Applied Subjects',
    subjects: ['Agriculture', 'Home Economics', 'Art & Design', 'Music', 'Physical Education'],
  },
  {
    label: 'Vocational & Technical Pathway',
    subjects: [
      'Carpentry & Joinery',
      'Plumbing',
      'Electrical Installation',
      'Motor Vehicle Technology',
      'Fashion & Fabrics',
      'Building & Construction',
      'Food & Nutrition Technology',
    ],
  },
  {
    label: 'Special & Inclusive Education',
    subjects: ['Special Needs Education'],
  },
]

const CBC_COMPETENCIES = [
  'Critical Thinking & Problem Solving',
  'Collaboration & Communication',
  'Creativity & Innovation',
  'Digital & ICT Literacy',
  'Citizenship & Civic Engagement',
]

const CROSS_CUTTING_THEMES = [
  'Sustainability & Environmental Care',
  'Gender Equality & Inclusion',
  'HIV/AIDS & Health',
  'Financial Literacy',
  'Entrepreneurship',
]

const ASSESSMENT_METHODS = [
  'Continuous Formative Assessment',
  'Criterion-Referenced Assessment',
  'School-Based Assessment (SBA)',
  'Portfolio Assessment',
  'Peer & Self Assessment',
]

const LEARNING_PATHWAYS = ['Academic', 'Vocational/Technical', 'Mixed (Academic + Vocational)']

const INSTRUCTION_LANGUAGES = [
  'English (Grade 5 and above)',
  'Bemba',
  'Nyanja',
  'Tonga',
  'Lozi',
  'Kaonde',
  'Luvale',
  'Lunda',
  'Other Local Language',
]

const RESOURCE_LEVELS = [
  'Well-resourced (projector, internet, printed materials)',
  'Moderate (textbooks, chalkboard, some printed materials)',
  'Low-resource (chalkboard only, limited or no textbooks)',
]

export default function AILessonPlanner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [useCustomSubject, setUseCustomSubject] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState(null)
  const [professionalContent, setProfessionalContent] = useState('')
  const [professionalRagReferences, setProfessionalRagReferences] = useState([])
  const [teacherContext, setTeacherContext] = useState(null)
  const [contextLoading, setContextLoading] = useState(true)
  const [schemeLink, setSchemeLink] = useState({
    schemeId: '',
    weekNumber: null,
    topicKey: '',
    lockedFromScheme: false,
  })

  const [form, setForm] = useState({
    grade: 'Grade 5',
    subject: 'English Language',
    customSubject: '',
    topic: '',
    subTopic: '',
    term: 'Term 1',
    duration: 40,
    planDate: new Date().toISOString().slice(0, 10),
    numberOfBoys: '',
    numberOfGirls: '',
    references: '',
    teachingAids: '',
    lessonNumber: '',
    totalLessonsInUnit: '',
    learningStyle: 'mixed',
    priorKnowledge: '',
    templateType: 'standard',
    // CBC Framework fields
    coreCompetencies: ['Critical Thinking & Problem Solving'],
    crossCuttingThemes: ['Sustainability & Environmental Care'],
    learningPathway: 'Academic',
    assessmentMethod: 'Continuous Formative Assessment',
    realWorldContext: '',
    inclusiveStrategies: true,
    practicalActivities: true,
    // New fields from curriculum corrections
    languageOfInstruction: 'English (Grade 5 and above)',
    resourceLevel: 'Moderate (textbooks, chalkboard, some printed materials)',
    sbaTaskType: 'Project',
    constructStatement: '',
    constructElementIds: [],
  })

  const [eczReference, setEczReference] = useState(null)

  const { text, loading, error, done, ragReferences, start, reset, stop } =
    useAIStream('/api/ai/lesson-planner')

  const activeSubject = useCustomSubject ? form.customSubject : form.subject
  const isProfessional = form.templateType === 'professional'
  const rawContent = isProfessional ? professionalContent : text
  const activeRagReferences = isProfessional ? professionalRagReferences : ragReferences

  const handleReset = () => {
    reset()
    setProfessionalContent('')
    setProfessionalRagReferences([])
    setSavedPlanId(null)
  }

  // Prefill from Teaching Studio deep-link: ?schemeId=&week=
  useEffect(() => {
    const schemeId = String(searchParams?.get('schemeId') || '').trim()
    const weekRaw = searchParams?.get('week') || searchParams?.get('weekNumber')
    const weekNumber = weekRaw != null && Number.isFinite(Number(weekRaw)) ? Number(weekRaw) : null
    if (!schemeId) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/curriculum/scheme?id=${encodeURIComponent(schemeId)}`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return
        const list = Array.isArray(json.data) ? json.data : json.data ? [json.data] : []
        const scheme = list.find((s) => s.id === schemeId) || list[0]
        if (!scheme) return
        const weeks = Array.isArray(scheme.weeks) ? scheme.weeks : []
        const weekRow =
          (weekNumber != null ? weeks.find((w) => Number(w.week) === weekNumber) : null) ||
          weeks.find((w) => !w.weekType || w.weekType === 'teaching') ||
          weeks[0]
        if (!weekRow) return

        const topicFull = String(weekRow.topic || '').trim()
        const unitTitle = String(weekRow.unitTitle || '').trim()
        const topicTitle = String(weekRow.topicTitle || '').trim()
        let topic = topicFull
        let subTopic = topicTitle || ''
        if (topicFull.includes(':')) {
          const [u, ...rest] = topicFull.split(':')
          topic = (unitTitle || u || topicFull).trim()
          subTopic = (topicTitle || rest.join(':').trim() || '').trim()
        } else if (unitTitle && topicTitle) {
          topic = unitTitle
          subTopic = topicTitle
        }

        setForm((prev) => ({
          ...prev,
          grade: scheme.gradeOrForm || prev.grade,
          subject: scheme.subject || prev.subject,
          term: scheme.term || prev.term,
          topic: topic || prev.topic,
          subTopic: subTopic || prev.subTopic,
        }))
        setUseCustomSubject(false)
        setSchemeLink({
          schemeId: scheme.id,
          weekNumber: Number(weekRow.week) || weekNumber,
          topicKey: String(weekRow.topicKey || '').trim(),
          lockedFromScheme: true,
        })
      } catch {
        // ignore prefill errors
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    const loadContext = async () => {
      setContextLoading(true)
      try {
        const qs = activeSubject.trim()
          ? `?subject=${encodeURIComponent(activeSubject.trim())}`
          : ''
        const res = await fetch(`/api/lesson-plans/context${qs}`, { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && json?.success) {
          setTeacherContext(json.data)
        }
      } finally {
        if (!cancelled) setContextLoading(false)
      }
    }
    loadContext()
    return () => {
      cancelled = true
    }
  }, [activeSubject])

  useEffect(() => {
    fetch('/api/ecz/reference', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setEczReference(json))
      .catch(() => setEczReference(null))
  }, [])

  const subjectConstruct = useMemo(() => {
    const list = eczReference?.subjectConstructs || []
    return list.find(
      (s) => String(s.subjectName || '').toLowerCase() === activeSubject.trim().toLowerCase()
    )
  }, [eczReference, activeSubject])

  const headerBlock = useMemo(() => {
    if (!teacherContext) return null
    return buildLessonPlanHeaderBlock({
      teacherContext,
      subject: activeSubject,
      grade: form.grade,
      topic: form.topic || 'Lesson Topic',
      subTopic: form.subTopic || form.topic,
      duration: form.duration,
      term: form.term,
      planDate: form.planDate,
      numberOfBoys: form.numberOfBoys,
      numberOfGirls: form.numberOfGirls,
      references: form.references,
      teachingAids: form.teachingAids || undefined,
      lessonNumber: form.lessonNumber,
      totalLessonsInUnit: form.totalLessonsInUnit,
    })
  }, [
    teacherContext,
    activeSubject,
    form.grade,
    form.topic,
    form.subTopic,
    form.duration,
    form.term,
    form.planDate,
    form.numberOfBoys,
    form.numberOfGirls,
    form.references,
    form.teachingAids,
    form.lessonNumber,
    form.totalLessonsInUnit,
  ])

  const frameworkBlock = useMemo(() => {
    if (isProfessional) return null
    return buildFrameworkElementsBlock({
      coreCompetencies: form.coreCompetencies,
      crossCuttingThemes: form.crossCuttingThemes,
      learningPathway: form.learningPathway,
      assessmentMethod: form.assessmentMethod,
      languageOfInstruction: form.languageOfInstruction,
      resourceLevel: form.resourceLevel,
      learningStyle: form.learningStyle,
      priorKnowledge: form.priorKnowledge,
      realWorldContext: form.realWorldContext,
      includePractical: form.practicalActivities,
      includeInclusive: form.inclusiveStrategies,
    })
  }, [
    isProfessional,
    form.coreCompetencies,
    form.crossCuttingThemes,
    form.learningPathway,
    form.assessmentMethod,
    form.languageOfInstruction,
    form.resourceLevel,
    form.learningStyle,
    form.priorKnowledge,
    form.realWorldContext,
    form.practicalActivities,
    form.inclusiveStrategies,
  ])

  const displayContent = useMemo(() => {
    if (!String(rawContent || '').trim()) return ''
    return composeLessonPlanDisplay(rawContent, {
      headerBlock,
      frameworkBlock: isProfessional ? null : frameworkBlock,
    })
  }, [rawContent, headerBlock, frameworkBlock, isProfessional])

  const canGenerate = useMemo(
    () => form.topic.trim() && activeSubject.trim() && form.coreCompetencies.length > 0,
    [form.topic, activeSubject, form.coreCompetencies]
  )

  const generate = async () => {
    if (!canGenerate) return
    setSavedPlanId(null)

    await start({
      grade: form.grade,
      subject: activeSubject,
      topic: form.topic,
      subtopic: form.subTopic || undefined,
      duration: Number(form.duration),
      learningStyle: form.learningStyle,
      priorKnowledge: form.priorKnowledge || undefined,
      templateType: form.templateType,
      coreCompetencies: form.coreCompetencies,
      crossCuttingThemes: form.crossCuttingThemes,
      learningPathway: form.learningPathway,
      assessmentMethod: form.assessmentMethod,
      languageOfInstruction: form.languageOfInstruction,
      resourceLevel: form.resourceLevel,
      realWorldContext: form.realWorldContext?.trim() || undefined,
      includePractical: form.practicalActivities,
      includeInclusive: form.inclusiveStrategies,
      references: form.references?.trim() || undefined,
      teachingAids: form.teachingAids?.trim() || undefined,
      lessonNumber: form.lessonNumber ? Number(form.lessonNumber) : undefined,
      totalLessonsInUnit: form.totalLessonsInUnit ? Number(form.totalLessonsInUnit) : undefined,
      numberOfBoys: form.numberOfBoys !== '' ? Number(form.numberOfBoys) : undefined,
      numberOfGirls: form.numberOfGirls !== '' ? Number(form.numberOfGirls) : undefined,
      planDate: form.planDate || undefined,
      schemeId: schemeLink.schemeId || undefined,
      weekNumber: schemeLink.weekNumber || undefined,
      topicKey: schemeLink.topicKey || undefined,
      term: form.term,
      learners:
        form.numberOfBoys !== '' || form.numberOfGirls !== ''
          ? Number(form.numberOfBoys || 0) + Number(form.numberOfGirls || 0)
          : undefined,
    })
  }

  const copy = async () => {
    await navigator.clipboard.writeText(displayContent || '')
  }

  const ensureSavedPlan = async () => {
    const content = String(displayContent || '').trim()
    if (!content) {
      toast.error('Generate a lesson plan first')
      return null
    }
    if (savedPlanId) return savedPlanId

    const res = await fetch('/api/lesson-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        grade: form.grade,
        subject: activeSubject,
        topic: form.topic,
        subTopic: form.subTopic || form.topic,
        duration: Number(form.duration),
        term: form.term,
        templateType: form.templateType,
        schemeId: schemeLink.schemeId || undefined,
        weekNumber: schemeLink.weekNumber || undefined,
        topicKey: schemeLink.topicKey || undefined,
        content,
        submit: false,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.success) {
      console.warn('[lesson-planner] save before export failed', res.status, json)
      toast.error('Could not save the lesson plan. Please try again.')
      return null
    }
    setSavedPlanId(json.data.id)
    return json.data.id
  }

  const downloadWordDoc = async () => {
    setSaving(true)
    try {
      const planId = await ensureSavedPlan()
      if (!planId) return
      const response = await fetch(`/api/lesson-plans/${planId}/export?format=word`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson?.error || errJson?.message || 'Download failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeSubject}_${form.grade}_${form.topic.replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Downloaded as Word document')
    } catch {
      toast.error('Could not download the Word document. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const downloadAsText = async () => {
    const planId = await ensureSavedPlan()
    if (!planId) return
    try {
      const response = await fetch(`/api/lesson-plans/${planId}/export?format=clean-text`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Download failed')
      const data = await response.json()
      const element = document.createElement('a')
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(data.content || '')
      )
      element.setAttribute('download', data.filename || 'lesson-plan.txt')
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      toast.success('Downloaded as text')
    } catch {
      toast.error('Could not download the text file. Please try again.')
    }
  }

  const handlePrint = () => {
    const clean = displayContent
    if (!clean) return
    const printWindow = window.open('', '', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${activeSubject} - ${form.topic}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; margin: 24px; line-height: 1.6; color: #111; }
      h1 { color: #1F4788; border-bottom: 2px solid #1F4788; padding-bottom: 8px; }
      pre { white-space: pre-wrap; font-size: 14px; }
      @media print { body { margin: 12mm; } }
    </style>
  </head>
  <body>
    <h1>${activeSubject} — ${form.topic}</h1>
    <p><strong>Grade:</strong> ${form.grade}</p>
    <pre>${clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const generateProfessional = async () => {
    if (!canGenerate) return
    setSaving(true)
    setProfessionalContent('')
    setProfessionalRagReferences([])
    setSavedPlanId(null)
    try {
      const res = await sessionFetch('/api/lesson-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: form.grade,
          form: form.grade,
          subject: activeSubject,
          topic: form.topic,
          subTopic: form.subTopic?.trim() || form.topic,
          duration: Number(form.duration),
          term: form.term,
          templateType: 'professional',
          schemeId: schemeLink.schemeId || undefined,
          weekNumber: schemeLink.weekNumber || undefined,
          topicKey: schemeLink.topicKey || undefined,
          planDate: form.planDate || undefined,
          numberOfBoys: form.numberOfBoys !== '' ? Number(form.numberOfBoys) : undefined,
          numberOfGirls: form.numberOfGirls !== '' ? Number(form.numberOfGirls) : undefined,
          references: form.references?.trim() || undefined,
          teachingAids: form.teachingAids?.trim() || undefined,
          lessonNumber: form.lessonNumber ? Number(form.lessonNumber) : undefined,
          totalLessonsInUnit: form.totalLessonsInUnit ? Number(form.totalLessonsInUnit) : undefined,
          sbaTaskType: form.sbaTaskType || undefined,
          constructStatement: form.constructStatement?.trim() || subjectConstruct?.construct,
          constructElementIds:
            form.constructElementIds?.length > 0 ? form.constructElementIds : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        const msg = authErrorMessage(res.status, json)
        if (res.status === 401 || res.status === 403) {
          toast.error(msg)
          router.push('/login')
        } else {
          console.warn('[lesson-planner] generate failed', res.status, json)
          toast.error('Could not generate the lesson plan. Please try again.')
        }
        return
      }
      setProfessionalRagReferences(Array.isArray(json?.ragReferences) ? json.ragReferences : [])
      const detail = await sessionFetch(`/api/lesson-plans/${encodeURIComponent(json.data.id)}`)
      const detailJson = await detail.json().catch(() => ({}))
      if (detailJson?.data?.content) {
        setProfessionalContent(detailJson.data.content)
      }
      setSavedPlanId(json.data.id)
      toast.success(json.message || 'Professional lesson plan saved as draft')
    } catch (e) {
      console.error(e)
      toast.error('Generation failed')
    } finally {
      setSaving(false)
    }
  }

  const saveDraft = async () => {
    const content = String(displayContent || '').trim()
    if (!content) {
      toast.error('Generate a lesson plan first')
      return
    }
    setSaving(true)
    try {
      if (savedPlanId) {
        const res = await fetch(`/api/lesson-plans/${encodeURIComponent(savedPlanId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content,
            topic: form.topic,
            subTopic: form.subTopic || form.topic,
            grade: form.grade,
            subject: activeSubject,
            schemeId: schemeLink.schemeId || undefined,
            weekNumber: schemeLink.weekNumber || undefined,
            topicKey: schemeLink.topicKey || undefined,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          console.warn('[lesson-planner] draft update failed', res.status, json)
          toast.error('Could not save draft. Please try again.')
          return
        }
        toast.success('Draft updated')
        return
      }
      const res = await fetch('/api/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grade: form.grade,
          subject: activeSubject,
          topic: form.topic,
          subTopic: form.subTopic || form.topic,
          duration: Number(form.duration),
          term: form.term,
          templateType: form.templateType,
          schemeId: schemeLink.schemeId || undefined,
          weekNumber: schemeLink.weekNumber || undefined,
          topicKey: schemeLink.topicKey || undefined,
          content,
          submit: false,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        console.warn('[lesson-planner] draft create failed', res.status, json)
        toast.error('Could not save draft. Please try again.')
        return
      }
      setSavedPlanId(json.data.id)
      toast.success('Saved as draft')
    } finally {
      setSaving(false)
    }
  }

  const submitToHod = async () => {
    const content = String(displayContent || '').trim()
    if (!content) {
      toast.error('Generate a lesson plan first')
      return
    }
    setSaving(true)
    try {
      let planId = savedPlanId
      if (!planId) {
        const createRes = await fetch('/api/lesson-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            grade: form.grade,
            subject: activeSubject,
            topic: form.topic,
            subTopic: form.subTopic || form.topic,
            duration: Number(form.duration),
            term: form.term,
            templateType: form.templateType,
            schemeId: schemeLink.schemeId || undefined,
            weekNumber: schemeLink.weekNumber || undefined,
            topicKey: schemeLink.topicKey || undefined,
            content,
            submit: false,
          }),
        })
        const createJson = await createRes.json().catch(() => ({}))
        if (!createRes.ok || !createJson?.success) {
          console.warn('[lesson-planner] save before submit failed', createRes.status, createJson)
          toast.error('Could not save the lesson plan. Please try again.')
          return
        }
        planId = createJson.data.id
        setSavedPlanId(planId)
      }
      const res = await fetch(`/api/lesson-plans/${encodeURIComponent(planId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        console.warn('[lesson-planner] submit failed', res.status, json)
        toast.error('Could not submit for approval. Please try again.')
        return
      }
      toast.success(json.message || 'Submitted for HOD approval')
      router.push(`/dashboard/teacher/lesson-plans/${planId}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleMultiSelect = (field, value) => {
    const current = Array.isArray(form[field]) ? form[field] : []
    if (current.includes(value)) {
      setForm((p) => ({ ...p, [field]: current.filter((item) => item !== value) }))
    } else {
      setForm((p) => ({ ...p, [field]: [...current, value] }))
    }
  }

  const selectClass =
    'w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-6">
        <h2 className="text-lg font-semibold mb-1 text-royalPurple-text1">
          Zambia CBC Lesson Plan Generator
        </h2>
        <p className="text-xs text-royalPurple-text2 mb-6">
          Aligned with the 2023 Zambia Competency-Based Curriculum Framework · MoGE lesson plan
          format · Implementation 2025
        </p>

        {schemeLink.lockedFromScheme && schemeLink.weekNumber != null ? (
          <div className="mb-4 rounded-lg border border-sky-500/40 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
            Prefills from scheme week {schemeLink.weekNumber}. Subject, grade, term, and topic are
            linked for record of work and coverage.
          </div>
        ) : null}

        <div className="mb-6 rounded-lg border border-royalPurple-border/50 bg-royalPurple-deep/40 p-4">
          <div className="text-sm font-semibold text-royalPurple-text1 mb-2">
            Teacher &amp; School (from your profile)
          </div>
          {contextLoading ? (
            <p className="text-xs text-royalPurple-text2">Loading profile…</p>
          ) : teacherContext ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-royalPurple-text2">
              <div>
                <dt className="text-royalPurple-text2/70">Teacher</dt>
                <dd className="text-royalPurple-text1 font-medium">
                  {teacherContext.teacherName}
                  {teacherContext.teacherGender ? ` (${teacherContext.teacherGender})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-royalPurple-text2/70">School</dt>
                <dd className="text-royalPurple-text1 font-medium">{teacherContext.schoolName}</dd>
              </div>
              <div>
                <dt className="text-royalPurple-text2/70">Department</dt>
                <dd className="text-royalPurple-text1 font-medium">
                  {teacherContext.department || '—'}
                </dd>
              </div>
              {teacherContext.employeeId ? (
                <div>
                  <dt className="text-royalPurple-text2/70">Employee ID</dt>
                  <dd className="text-royalPurple-text1 font-medium">
                    {teacherContext.employeeId}
                  </dd>
                </div>
              ) : null}
              {teacherContext.academicYear ? (
                <div>
                  <dt className="text-royalPurple-text2/70">Academic Year</dt>
                  <dd className="text-royalPurple-text1 font-medium">
                    {teacherContext.academicYear}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-xs text-amber-200/90">
              Could not load your profile. Name and school will appear after you sign in again.
            </p>
          )}
          <p className="text-xs text-royalPurple-text2/60 mt-3">
            Phone numbers and date of birth are never shown on lesson plans.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 pt-1">
            <SectionHeading>Basic Lesson Information</SectionHeading>
          </div>

          <div className="space-y-2">
            <Label>Grade / Form Level</Label>
            <select
              className={selectClass}
              value={form.grade}
              onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
            >
              {GRADE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-royalPurple-text2/60">
              Note: Grades 8 &amp; 9 are phased out under the 2023 CBC and are not listed.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Language of Instruction</Label>
            <select
              className={selectClass}
              value={form.languageOfInstruction}
              onChange={(e) => setForm((p) => ({ ...p, languageOfInstruction: e.target.value }))}
            >
              {INSTRUCTION_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <p className="text-xs text-royalPurple-text2/60">
              Local languages are the medium of instruction for Grades 1–4.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Subject</Label>
              <button
                type="button"
                onClick={() => setUseCustomSubject((v) => !v)}
                className="text-xs text-royalPurple-text2 underline underline-offset-2"
              >
                {useCustomSubject ? '← Choose from list' : 'Type a custom subject →'}
              </button>
            </div>

            {useCustomSubject ? (
              <Input
                value={form.customSubject}
                onChange={(e) => setForm((p) => ({ ...p, customSubject: e.target.value }))}
                placeholder="e.g., Entrepreneurship, Local Craft Studies…"
              />
            ) : (
              <select
                className={selectClass}
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              >
                {SUBJECT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Topic / Lesson Title</Label>
            <Input
              value={form.topic}
              onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
              placeholder="e.g., Water Resources Management, Budgeting for Household Needs"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Sub-Topic <span className="font-normal opacity-60">(Ministry format — optional)</span>
            </Label>
            <Input
              value={form.subTopic}
              onChange={(e) => setForm((p) => ({ ...p, subTopic: e.target.value }))}
              placeholder="e.g., 1.5.1 Algebraic Expressions"
            />
          </div>

          <div className="space-y-2">
            <Label>Term</Label>
            <select
              className={selectClass}
              value={form.term}
              onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={10}
              max={240}
              value={form.duration}
              onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <SectionHeading>MoGE Header Details</SectionHeading>
            <p className="text-xs text-royalPurple-text2/70 mb-2">
              Matches the Ministry of General Education lesson plan format — teacher and school come
              from your profile automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Lesson Date</Label>
            <Input
              type="date"
              value={form.planDate}
              onChange={(e) => setForm((p) => ({ ...p, planDate: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Number of Boys</Label>
            <Input
              type="number"
              min={0}
              value={form.numberOfBoys}
              onChange={(e) => setForm((p) => ({ ...p, numberOfBoys: e.target.value }))}
              placeholder="e.g., 18"
            />
          </div>

          <div className="space-y-2">
            <Label>Number of Girls</Label>
            <Input
              type="number"
              min={0}
              value={form.numberOfGirls}
              onChange={(e) => setForm((p) => ({ ...p, numberOfGirls: e.target.value }))}
              placeholder="e.g., 22"
            />
          </div>

          <div className="space-y-2">
            <Label>Lesson Number in Unit</Label>
            <Input
              type="number"
              min={1}
              value={form.lessonNumber}
              onChange={(e) => setForm((p) => ({ ...p, lessonNumber: e.target.value }))}
              placeholder="e.g., 4"
            />
          </div>

          <div className="space-y-2">
            <Label>Total Lessons in Unit</Label>
            <Input
              type="number"
              min={1}
              value={form.totalLessonsInUnit}
              onChange={(e) => setForm((p) => ({ ...p, totalLessonsInUnit: e.target.value }))}
              placeholder="e.g., 6"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>References</Label>
            <Input
              value={form.references}
              onChange={(e) => setForm((p) => ({ ...p, references: e.target.value }))}
              placeholder="e.g., Learner handbook, teacher notes, syllabus page…"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Teaching / Learning Aids</Label>
            <Input
              value={form.teachingAids}
              onChange={(e) => setForm((p) => ({ ...p, teachingAids: e.target.value }))}
              placeholder="e.g., Learner book, chalkboard, charts, practical materials…"
            />
          </div>

          <div className="space-y-2">
            <Label>Learning Style Preference</Label>
            <select
              className={selectClass}
              value={form.learningStyle}
              onChange={(e) => setForm((p) => ({ ...p, learningStyle: e.target.value }))}
            >
              <option value="mixed">Mixed</option>
              <option value="visual">Visual</option>
              <option value="auditory">Auditory</option>
              <option value="kinesthetic">Kinesthetic / Hands-on</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>School Resource Level</Label>
            <select
              className={selectClass}
              value={form.resourceLevel}
              onChange={(e) => setForm((p) => ({ ...p, resourceLevel: e.target.value }))}
            >
              {RESOURCE_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-xs text-royalPurple-text2/60">
              Activities will be tailored to what is realistically available in your school.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Prior Knowledge / Prerequisites{' '}
              <span className="font-normal opacity-60">(optional)</span>
            </Label>
            <Input
              value={form.priorKnowledge}
              onChange={(e) => setForm((p) => ({ ...p, priorKnowledge: e.target.value }))}
              placeholder="e.g., Learners already know the water cycle basics"
            />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-royalPurple-border">
            <SectionHeading>Zambia CBC 2023 Framework Elements</SectionHeading>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Core Competencies <span className="font-normal opacity-60">(select one or more)</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CBC_COMPETENCIES.map((comp) => (
                <CheckItem
                  key={comp}
                  label={comp}
                  checked={form.coreCompetencies.includes(comp)}
                  onChange={() => toggleMultiSelect('coreCompetencies', comp)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Cross-Cutting Themes{' '}
              <span className="font-normal opacity-60">(select one or more)</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CROSS_CUTTING_THEMES.map((theme) => (
                <CheckItem
                  key={theme}
                  label={theme}
                  checked={form.crossCuttingThemes.includes(theme)}
                  onChange={() => toggleMultiSelect('crossCuttingThemes', theme)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Learning Pathway</Label>
            <select
              className={selectClass}
              value={form.learningPathway}
              onChange={(e) => setForm((p) => ({ ...p, learningPathway: e.target.value }))}
            >
              {LEARNING_PATHWAYS.map((pathway) => (
                <option key={pathway} value={pathway}>
                  {pathway}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Assessment Method</Label>
            <select
              className={selectClass}
              value={form.assessmentMethod}
              onChange={(e) => setForm((p) => ({ ...p, assessmentMethod: e.target.value }))}
            >
              {ASSESSMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>SBA task type (ECSEOL)</Label>
            <select
              className={selectClass}
              value={form.sbaTaskType}
              onChange={(e) => setForm((p) => ({ ...p, sbaTaskType: e.target.value }))}
            >
              {(eczReference?.sbaTaskTypes || ['Project', 'Practical task', 'Fieldwork']).map(
                (t) => (
                  <option key={typeof t === 'string' ? t : t} value={typeof t === 'string' ? t : t}>
                    {typeof t === 'string' ? t : t}
                  </option>
                )
              )}
            </select>
          </div>

          {subjectConstruct ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Element of construct (ECZ)</Label>
              <p className="text-xs text-muted-foreground">{subjectConstruct.construct}</p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(subjectConstruct.elementsOfConstruct)
                  ? subjectConstruct.elementsOfConstruct
                  : []
                ).map((el, idx) => {
                  const id = String(el.id || el.elementNumber || idx)
                  const label = el.statement || el.label || String(el)
                  const checked = form.constructElementIds.includes(id)
                  return (
                    <label
                      key={id}
                      className="flex items-start gap-2 text-xs border rounded px-2 py-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setForm((p) => ({
                            ...p,
                            constructElementIds: checked
                              ? p.constructElementIds.filter((x) => x !== id)
                              : [...p.constructElementIds, id],
                          }))
                        }}
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <Label>
              Real-World Zambian Context <span className="font-normal opacity-60">(optional)</span>
            </Label>
            <Input
              value={form.realWorldContext}
              onChange={(e) => setForm((p) => ({ ...p, realWorldContext: e.target.value }))}
              placeholder="e.g., Local copper mining, Community health initiatives, Smallholder farming"
            />
          </div>

          <div className="space-y-2">
            <Label>Include Practical Activities?</Label>
            <CheckItem
              label="Yes — include hands-on, real-world activities"
              checked={form.practicalActivities}
              onChange={(e) => setForm((p) => ({ ...p, practicalActivities: e.target.checked }))}
              single
            />
          </div>

          <div className="space-y-2">
            <Label>Include Inclusive / Differentiated Strategies?</Label>
            <CheckItem
              label="Yes — include strategies for diverse and special needs learners"
              checked={form.inclusiveStrategies}
              onChange={(e) => setForm((p) => ({ ...p, inclusiveStrategies: e.target.checked }))}
              single
            />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-royalPurple-border">
            <SectionHeading>Lesson Plan Format</SectionHeading>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Template Style</Label>
            <select
              className={selectClass}
              value={form.templateType}
              onChange={(e) => setForm((p) => ({ ...p, templateType: e.target.value }))}
            >
              {LESSON_PLAN_TEMPLATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-300/50 bg-red-950/30 p-4">
            {[
              'PLAN_EXPIRED',
              'PLAN_UPGRADE_REQUIRED',
              'UPGRADE_REQUIRED',
              'AI_LIMIT_REACHED',
              'AI_QUOTA_EXCEEDED',
            ].includes(String(error?.code || '').toUpperCase()) ? (
              <UpgradePrompt error={error} onDismiss={reset} />
            ) : (
              <>
                <p className="font-semibold text-red-200">AI generation failed</p>
                <p className="text-sm text-red-100/90 mt-1">
                  The AI service could not complete your request. Try again in a moment.
                </p>
                <Button variant="outline" className="mt-3" onClick={handleReset}>
                  Dismiss
                </Button>
              </>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mt-6">
          {isProfessional ? (
            <Button onClick={generateProfessional} disabled={saving || !canGenerate}>
              {saving ? 'Generating…' : 'Generate Ministry Lesson Plan'}
            </Button>
          ) : (
            <>
              <Button onClick={generate} disabled={loading || !canGenerate}>
                {loading ? 'Generating…' : 'Generate CBC Lesson Plan'}
              </Button>
              {loading ? (
                <Button variant="outline" onClick={stop}>
                  Stop
                </Button>
              ) : null}
            </>
          )}
          <Button variant="outline" onClick={handleReset} disabled={loading || saving}>
            Reset
          </Button>
          <Button variant="outline" onClick={copy} disabled={!displayContent}>
            Copy
          </Button>
          {displayContent ? (
            <>
              <Button variant="outline" onClick={saveDraft} disabled={saving}>
                Save Draft
              </Button>
              {savedPlanId ? (
                <LessonPlanDownloadButton
                  planId={savedPlanId}
                  subject={activeSubject}
                  form={form.grade}
                  topic={form.topic}
                  label="Download Word"
                />
              ) : (
                <Button variant="outline" disabled={saving} onClick={downloadWordDoc}>
                  <Download className="h-4 w-4 mr-2" />
                  Save &amp; Download Word
                </Button>
              )}
              <Button
                variant="outline"
                onClick={downloadAsText}
                disabled={saving || !displayContent}
              >
                <FileText className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={submitToHod} disabled={saving}>
                Submit to HOD
              </Button>
            </>
          ) : null}
          {savedPlanId ? (
            <Link href={`/dashboard/teacher/lesson-plans/${savedPlanId}`}>
              <Button variant="outline">View saved plan</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <RagReferencesPanel references={activeRagReferences} className="mb-4" />

      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-6">
        <div className="text-royalPurple-text1 font-semibold mb-3">Lesson Plan Preview</div>
        <div className="whitespace-pre-wrap text-sm text-royalPurple-text2">
          {displayContent ||
            (isProfessional
              ? 'Select Ministry Format above, then click "Generate Ministry Lesson Plan" for a full Bernard Tito / Mr Banda style plan with worked examples and HOD workflow.'
              : 'No output yet. Fill in the form above and click "Generate CBC Lesson Plan" to create a lesson aligned with Zambia\'s 2023 Competency-Based Curriculum Framework.')}
        </div>
      </div>

      <div className="rounded-xl border border-blue-border/40 bg-blue-card p-6">
        <h3 className="font-semibold text-blue-text1 mb-3">About Zambia's 2023 CBC Framework</h3>
        <ul className="text-sm text-blue-text2 space-y-2">
          <li>✓ Shifts from outcome-based to competency-based learning</li>
          <li>
            ✓ Grades 1–7 (Primary) still active; Grades 8 &amp; 9 phased out; Grades 10–12
            transitioning
          </li>
          <li>✓ Forms 1–6 introduced as the new CBC secondary structure</li>
          <li>
            ✓ Local language is medium of instruction for Grades 1–4; English from Grade 5 upward
          </li>
          <li>
            ✓ Emphasises practical skills, real-world application, and learner-centred pedagogy
          </li>
          <li>
            ✓ Develops 5 core competencies: Critical Thinking, Collaboration, Creativity, ICT
            Literacy, Civic Engagement
          </li>
          <li>
            ✓ Integrates cross-cutting themes: sustainability, gender equality, health, financial
            literacy, entrepreneurship
          </li>
          <li>✓ Uses continuous formative assessment and School-Based Assessment (SBA)</li>
          <li>✓ Includes academic and vocational/technical learning pathways</li>
          <li>✓ Supports inclusive, differentiated learning for all students</li>
        </ul>
      </div>
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <h3 className="font-semibold text-royalPurple-text1 text-sm uppercase tracking-wide mb-1">
      {children}
    </h3>
  )
}

function CheckItem({ label, checked, onChange, single = false }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={single ? onChange : () => onChange()}
        className="rounded mt-0.5 shrink-0"
      />
      <span className="text-sm text-royalPurple-text2 leading-snug">{label}</span>
    </label>
  )
}
