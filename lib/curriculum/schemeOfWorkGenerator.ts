import { resolveCurriculum, type ResolvedCurriculumUnit } from '@/lib/curriculum/resolveCurriculum'
import {
  enrichActivitiesFromModule,
  enrichResourcesFromModule,
  loadTeachingModule,
} from '@/lib/curriculum/teachingModuleLoader'

export type SchemeWeekRow = {
  week: number
  topic: string
  learningOutcomes: string[]
  teachingActivities: string[]
  assessmentMethod: string
  assessmentMethods: string[]
  resources: string[]
  notes: string
  teacherNotes: string
  homeworkTask: string
}

/**
 * Spread curriculum units across a fixed number of term weeks.
 * When units include weekHint (from duration like "3 weeks"), allocate that many weeks per unit in order.
 */
export function distributeUnitsAcrossTerm(
  units: ResolvedCurriculumUnit[],
  weekCount = 12
): SchemeWeekRow[] {
  const weeks = Math.max(1, Math.min(16, Number(weekCount) || 12))
  if (!units.length) {
    return Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      topic: `Week ${i + 1} — to be planned`,
      learningOutcomes: [],
      teachingActivities: [],
      assessmentMethod: 'Formative oral / written check',
      assessmentMethods: ['Formative oral / written check'],
      resources: [],
      notes: `Week ${i + 1}`,
      teacherNotes: '',
      homeworkTask: '',
    }))
  }

  const hasDurations = units.some((u) => typeof u.weekHint === 'number' && u.weekHint > 0)
  const schedule: { unit: ResolvedCurriculumUnit; topicIndex: number }[] = []

  if (hasDurations) {
    for (const unit of units) {
      const span = Math.max(1, Math.min(weeks, Number(unit.weekHint) || 1))
      for (let i = 0; i < span; i++) {
        schedule.push({ unit, topicIndex: i })
      }
    }
  } else {
    for (let w = 0; w < weeks; w++) {
      const unit = units[w % units.length]
      schedule.push({ unit, topicIndex: w })
    }
  }

  // Trim or pad to exact weekCount
  while (schedule.length < weeks) {
    const unit = units[schedule.length % units.length]
    schedule.push({ unit, topicIndex: schedule.length })
  }
  const trimmed = schedule.slice(0, weeks)

  return trimmed.map((slot, w) => {
    const { unit, topicIndex } = slot
    const topics = unit.topics || []
    const topicExtra = topics.length ? topics[topicIndex % topics.length] : ''
    const assessmentMethods =
      (unit.assessment || []).length > 0
        ? (unit.assessment || []).slice(0, 5)
        : ['Formative + end-of-week quiz']
    const notes = `Week ${w + 1}${unit.weekHint ? ` · ${unit.title} (${unit.weekHint}w unit)` : ''}`
    return {
      week: w + 1,
      topic: topicExtra ? `${unit.title}: ${topicExtra}` : unit.title,
      learningOutcomes: (unit.outcomes || []).slice(0, 5),
      teachingActivities: (unit.activities || []).slice(0, 5),
      assessmentMethod: assessmentMethods[0],
      assessmentMethods,
      resources: (unit.resources || []).slice(0, 5),
      notes,
      teacherNotes: notes,
      homeworkTask: topicExtra ? `Review notes on ${topicExtra}` : `Review notes on ${unit.title}`,
    }
  })
}

export async function generateSchemeOfWork(input: {
  schoolId?: string | null
  subject: string
  grade: string | number
  term: string | number
  year: number
  weekCount?: number
}): Promise<{
  subject: string
  gradeOrForm: string
  term: string
  year: number
  source: string
  weeks: SchemeWeekRow[]
}> {
  const subject = String(input.subject || '').trim()
  const gradeOrForm = String(input.grade || '').trim()
  const term =
    typeof input.term === 'number' ? `Term ${input.term}` : String(input.term || 'Term 1').trim()
  const year = Number(input.year) || new Date().getFullYear()

  const curriculum = await resolveCurriculum({
    schoolId: input.schoolId,
    subject,
    gradeOrForm,
  })

  const weeks = distributeUnitsAcrossTerm(curriculum.units, input.weekCount ?? 12)

  const teachingModule = loadTeachingModule({
    subject: curriculum.subject || subject,
    gradeOrForm: curriculum.gradeOrForm || gradeOrForm,
    term,
  })

  const enriched = weeks.map((w) => ({
    ...w,
    teachingActivities: enrichActivitiesFromModule(w.topic, w.teachingActivities, teachingModule),
    resources: enrichResourcesFromModule(w.topic, w.resources, teachingModule),
    notes: teachingModule ? `${w.notes} · enriched from Teaching Module` : w.notes,
  }))

  return {
    subject: curriculum.subject || subject,
    gradeOrForm: curriculum.gradeOrForm || gradeOrForm,
    term,
    year,
    source: teachingModule ? `${curriculum.source}+teaching-module` : curriculum.source,
    weeks: enriched,
  }
}
