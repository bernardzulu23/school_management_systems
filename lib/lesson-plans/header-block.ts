import type { LessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { resolveDepartmentForSubject } from '@/lib/lesson-plans/subject-department'

export type LessonPlanHeaderInput = {
  teacherContext: LessonPlanTeacherContext
  subject: string
  grade: string
  topic: string
  subTopic?: string
  duration: number | string
  term?: string
  planDate?: string
  numberOfBoys?: number | string | null
  numberOfGirls?: number | string | null
  references?: string
  teachingAids?: string
  lessonNumber?: number | string | null
  totalLessonsInUnit?: number | string | null
}

const safe = (v: unknown) => String(v ?? '').trim()

function formatCount(value: unknown): string {
  const n = Number(value)
  if (Number.isFinite(n) && n >= 0) return String(n)
  const s = safe(value)
  return s || '……'
}

function formatDate(value?: string): string {
  if (value) return value
  try {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function lessonLocationText(lessonNumber?: unknown, totalLessons?: unknown): string {
  const n = Number(lessonNumber)
  const total = Number(totalLessons)
  if (Number.isFinite(n) && Number.isFinite(total) && n > 0 && total > 0) {
    return `This is lesson ${n} out of ${total} lessons in this unit/topic sequence.`
  }
  return 'Specify lesson position in the unit when known.'
}

export function buildLessonPlanHeaderBlock(input: LessonPlanHeaderInput): string {
  const ctx = input.teacherContext
  const department =
    ctx.department || resolveDepartmentForSubject(input.subject) || 'General Education'
  const duration = safe(input.duration) || '40'
  const subTopic = safe(input.subTopic) || safe(input.topic)
  const planDate = formatDate(input.planDate)
  const boys = formatCount(input.numberOfBoys)
  const girls = formatCount(input.numberOfGirls)
  const references =
    safe(input.references) ||
    'Learner handbook, teacher notes, syllabus reference, and other approved sources.'
  const teachingAids =
    safe(input.teachingAids) ||
    "Learner's book, teacher's notes, chalkboard, and other relevant TLMs."

  const teacherLine = [
    `NAME OF TEACHER: ${ctx.teacherName}`,
    ctx.teacherGender ? `GENDER: ${ctx.teacherGender}` : '',
    `Date: ${planDate || '…………'}`,
  ]
    .filter(Boolean)
    .join('    ')

  const schoolLine = [
    `SCHOOL: ${ctx.schoolName}`,
    ctx.academicYear ? `ACADEMIC YEAR: ${ctx.academicYear}` : '',
  ]
    .filter(Boolean)
    .join('    ')

  const staffLine = [
    ctx.employeeId ? `EMPLOYEE ID: ${ctx.employeeId}` : '',
    ctx.specialization ? `SPECIALIZATION: ${ctx.specialization}` : '',
  ]
    .filter(Boolean)
    .join('    ')

  return `MINISTRY OF GENERAL EDUCATION
DEPARTMENT OF ${department.toUpperCase()} LESSON PLAN
TEACHER'S LESSON PLAN

${teacherLine}
${schoolLine}${staffLine ? `\n${staffLine}` : ''}

SUBJECT: ${safe(input.subject).toUpperCase()}    DURATION: ${duration} MINUTES
TOPIC: ${safe(input.topic).toUpperCase()}    CLASS: ${safe(input.grade)
    .replace(/^grade\s*/i, '')
    .replace(/^form\s*/i, 'Form ')}
SUBTOPIC: ${subTopic.toUpperCase()}    NO OF BOYS: ${boys}    GIRLS: ${girls}
${input.term ? `TERM: ${safe(input.term)}` : ''}

REFERENCES: ${references}

TEACHING LEARNING AIDS: ${teachingAids}

LOCATION OF THE LESSON: ${lessonLocationText(input.lessonNumber, input.totalLessonsInUnit)}`
}

/** Remove injected or AI-generated MoGE header before re-composing display content. */
export function stripLessonPlanHeaderBlock(text: string): string {
  if (!text) return ''

  const cleaned = text.trim()
  const bodyMarkers = [
    /\nFRAMEWORK ELEMENTS\b/i,
    /\nRATIONALE:\b/i,
    /\nLEARNING OUTCOMES\b/i,
    /\n1\.\s+GENERAL COMPETENCE\b/i,
    /\nLESSON PLAN HEADER\b/i,
  ]

  if (/^MINISTRY OF GENERAL EDUCATION\b/im.test(cleaned)) {
    for (const marker of bodyMarkers) {
      const idx = cleaned.search(marker)
      if (idx >= 0) return cleaned.slice(idx).trim()
    }
    return ''
  }

  return cleaned
}
