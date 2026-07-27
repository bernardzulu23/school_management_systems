import { resolveSyllabus } from '@/lib/curriculum/resolveSyllabus'
import {
  generateFromCBC,
  generateFromOldSyllabus,
} from '@/lib/curriculum/generators/oldSyllabusGenerate'

export type ContentType =
  | 'scheme'
  | 'recordOfWork'
  | 'quiz'
  | 'test'
  | 'termAssessment'
  | 'flashcards'
  | 'lessonPlan'

export async function routeGeneration(params: {
  contentType: ContentType
  canonicalLevel: string
  academicYear: number
  subject: string
  tenantId: string
  schoolId?: string
  teacherId?: string
  grade?: number
  selectedTopicIds?: string[]
  questionCount?: number
  weekCount?: number
  term?: string
  midTermWeek?: number | null
  midTermWeekEnd?: number | null
  endOfTermWeek?: number | null
  endOfTermWeekEnd?: number | null
  carryOverTopics?: Array<Record<string, unknown>>
}) {
  const { syllabusVersion, displayLabel } = await resolveSyllabus(
    params.canonicalLevel,
    params.academicYear
  )

  if (syllabusVersion === 'OLD_SYLLABUS') {
    return generateFromOldSyllabus({ ...params, displayLabel, syllabusVersion })
  }
  return generateFromCBC({ ...params, displayLabel, syllabusVersion })
}
