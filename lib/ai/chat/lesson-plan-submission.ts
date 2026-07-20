/**
 * Phase 3: generate structured lesson plan → docx → R2 → LessonPlanSubmission DRAFT.
 */
import { randomUUID } from 'crypto'
import type { LessonPlanSubmission } from '@prisma/client'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { generateChatLessonPlanJson } from '@/lib/ai/chat/generate-lesson-plan'
import { renderMermaidToPng } from '@/lib/ai/chat/mermaid-render'
import {
  generateLessonPlanFilename,
  generateLessonPlanWordDocFromStructured,
} from '@/lib/ai/lesson-plan-word-generator'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { resolveReviewerUserId } from '@/lib/lesson-plans/reviewer'
import { uploadLessonPlanDocx, getSignedDownloadUrl, readLessonPlanObject } from '@/lib/storage/r2'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'
import { logger } from '@/lib/utils/logger'

const log = logger({ route: 'chat:lesson-plan-submission' })

export type CreateFromChatInput = {
  schoolId: string
  teacherId: string
  sessionId?: string | null
  subject: string
  grade: string
  topic: string
  subTopic?: string
  duration?: number
  term?: string
  chatContext?: string
}

export async function createLessonPlanSubmissionFromChat(input: CreateFromChatInput): Promise<{
  submission: LessonPlanSubmission
  provider: string
  model: string
  diagramFailed: boolean
}> {
  const schoolId = input.schoolId
  const db = getTenantClient(schoolId)

  const rag = await buildRagContextForQuery({
    schoolId,
    query: `${input.subject} ${input.topic}`,
    subject: input.subject,
    gradeLevel: input.grade,
  }).catch(() => ({ block: '', refs: [] }))

  const { plan, provider, model } = await generateChatLessonPlanJson({
    subject: input.subject,
    form: input.grade,
    topic: input.topic,
    subTopic: input.subTopic,
    duration: input.duration,
    term: input.term,
    ragBlock: rag?.block || '',
    chatContext: input.chatContext,
  })

  let diagramPng: Buffer | null = null
  let diagramFailed = false
  if (plan.mermaidDiagram) {
    diagramPng = await renderMermaidToPng(plan.mermaidDiagram)
    if (!diagramPng) {
      diagramFailed = true
      log.warn('Mermaid diagram skipped — continuing without image', {
        topic: input.topic,
      })
    }
  }

  const teacherCtx = await getLessonPlanTeacherContext(
    input.teacherId,
    schoolId,
    plan.subject || input.subject
  )

  const buffer = await generateLessonPlanWordDocFromStructured({
    schoolName: teacherCtx.schoolName,
    teacherName: teacherCtx.teacherName,
    teacherGender: teacherCtx.teacherGender,
    departmentName: teacherCtx.department,
    date: new Date().toLocaleDateString(),
    structured: plan,
    subject: plan.subject || input.subject,
    form: plan.gradeOrForm || input.grade,
    topic: plan.topic || input.topic,
    subTopic: plan.subTopic || input.subTopic || plan.title,
    duration: plan.duration || input.duration || 40,
    approvalStatus: 'DRAFT',
    diagramPng,
  })

  const submissionId = randomUUID()
  const filename = generateLessonPlanFilename(
    plan.subject || input.subject,
    plan.gradeOrForm || input.grade,
    plan.topic || input.topic
  )

  const uploaded = await uploadLessonPlanDocx({
    schoolId,
    submissionId,
    buffer,
    filename,
  })

  const submission = await db.lessonPlanSubmission.create({
    data: {
      id: submissionId,
      schoolId,
      teacherId: input.teacherId,
      sessionId: input.sessionId || null,
      topic: plan.topic || input.topic,
      subject: plan.subject || input.subject,
      grade: plan.gradeOrForm || input.grade,
      fileUrl: uploaded.key,
      structuredContent: plan as object,
      status: 'DRAFT',
      diagramFailed,
    },
  })

  return { submission, provider, model, diagramFailed }
}

const SUBMITTABLE = new Set(['DRAFT', 'REJECTED'])

export async function submitLessonPlanToHod(params: {
  schoolId: string
  teacherId: string
  submissionId: string
}): Promise<LessonPlanSubmission> {
  const db = getTenantClient(params.schoolId)
  const existing = await db.lessonPlanSubmission.findFirst({
    where: { id: params.submissionId, schoolId: params.schoolId },
  })
  if (!existing) {
    const err = new Error('Submission not found') as Error & { status: number }
    err.status = 404
    throw err
  }
  if (existing.teacherId !== params.teacherId) {
    const err = new Error('Forbidden') as Error & { status: number }
    err.status = 403
    throw err
  }
  if (!SUBMITTABLE.has(existing.status)) {
    const err = new Error(`Cannot submit with status: ${existing.status}`) as Error & {
      status: number
    }
    err.status = 400
    throw err
  }

  const hodId = await resolveReviewerUserId({
    schoolId: params.schoolId,
    teacherUserId: params.teacherId,
    grade: existing.grade,
    subject: existing.subject,
  })
  if (!hodId) {
    const err = new Error(
      'No HOD/reviewer found. Secondary: assign an HOD. Primary: assign a senior teacher, deputy, or headteacher.'
    ) as Error & { status: number }
    err.status = 400
    throw err
  }

  const updated = await db.lessonPlanSubmission.update({
    where: { id: existing.id },
    data: {
      status: 'PENDING_APPROVAL',
      hodId,
      submittedAt: new Date(),
      reviewedAt: null,
      hodComments: null,
    },
  })

  try {
    const { default: prisma } = await import('@/lib/prisma')
    await prisma.timetableNotification.create({
      data: {
        schoolId: params.schoolId,
        fromUserId: params.teacherId,
        toUserId: hodId,
        type: 'lesson_plan',
        title: 'Chat Lesson Plan Pending Approval',
        message: `${updated.subject || ''} • ${updated.grade || ''} • ${updated.topic}`,
        meta: { lessonPlanSubmissionId: updated.id, status: 'PENDING_APPROVAL' },
      },
    })
  } catch (err) {
    log.warn('Notification create failed', {
      message: err instanceof Error ? err.message : String(err),
    })
  }

  return updated
}

export async function reviewLessonPlanSubmission(params: {
  schoolId: string
  reviewerId: string
  submissionId: string
  action: 'approve' | 'reject'
  comments?: string | null
  isAdmin?: boolean
}): Promise<LessonPlanSubmission> {
  const db = getTenantClient(params.schoolId)
  const existing = await db.lessonPlanSubmission.findFirst({
    where: { id: params.submissionId, schoolId: params.schoolId },
  })
  if (!existing) {
    const err = new Error('Submission not found') as Error & { status: number }
    err.status = 404
    throw err
  }
  if (existing.status !== 'PENDING_APPROVAL') {
    const err = new Error(`Cannot review with status: ${existing.status}`) as Error & {
      status: number
    }
    err.status = 400
    throw err
  }

  const isAssignedHod = existing.hodId && existing.hodId === params.reviewerId
  if (!isAssignedHod && !params.isAdmin) {
    const err = new Error('Forbidden — not the assigned HOD for this submission') as Error & {
      status: number
    }
    err.status = 403
    throw err
  }

  if (params.action === 'reject' && !String(params.comments || '').trim()) {
    const err = new Error('Comments are required when rejecting') as Error & { status: number }
    err.status = 400
    throw err
  }

  return db.lessonPlanSubmission.update({
    where: { id: existing.id },
    data: {
      status: params.action === 'approve' ? 'APPROVED' : 'REJECTED',
      hodComments: String(params.comments || '').trim() || null,
      reviewedAt: new Date(),
    },
  })
}

export async function getSubmissionDownload(params: {
  schoolId: string
  userId: string
  submissionId: string
  isAdmin?: boolean
  isHod?: boolean
}): Promise<{
  buffer?: Buffer
  signedUrl?: string
  expiresIn?: number
  filename: string
  backend: 'r2' | 'local'
}> {
  const db = getTenantClient(params.schoolId)
  const existing = await db.lessonPlanSubmission.findFirst({
    where: { id: params.submissionId, schoolId: params.schoolId },
  })
  if (!existing) {
    const err = new Error('Submission not found') as Error & { status: number }
    err.status = 404
    throw err
  }

  const isOwner = existing.teacherId === params.userId
  const isAssignedHod = existing.hodId === params.userId
  if (!isOwner && !isAssignedHod && !params.isAdmin && !params.isHod) {
    const err = new Error('Forbidden') as Error & { status: number }
    err.status = 403
    throw err
  }

  const filename = generateLessonPlanFilename(
    existing.subject || 'Subject',
    existing.grade || 'Form',
    existing.topic
  )

  const signed = await getSignedDownloadUrl(existing.fileUrl, 900)
  if (signed.backend === 'r2' && signed.url) {
    return { signedUrl: signed.url, expiresIn: signed.expiresIn, filename, backend: 'r2' }
  }

  const buffer = await readLessonPlanObject(existing.fileUrl)
  return { buffer, filename, backend: 'local', expiresIn: signed.expiresIn }
}

/** Pure status-transition helper for unit tests. */
export function nextSubmissionStatus(
  current: string,
  event: 'submit' | 'approve' | 'reject' | 'resubmit'
): string | null {
  const c = String(current || '').toUpperCase()
  if (event === 'submit' && (c === 'DRAFT' || c === 'REJECTED')) return 'PENDING_APPROVAL'
  if (event === 'approve' && c === 'PENDING_APPROVAL') return 'APPROVED'
  if (event === 'reject' && c === 'PENDING_APPROVAL') return 'REJECTED'
  if (event === 'resubmit' && c === 'REJECTED') return 'PENDING_APPROVAL'
  return null
}
