import { resolveCurriculum, type ResolvedCurriculumUnit } from '@/lib/curriculum/resolveCurriculum'
import {
  enrichActivitiesFromModule,
  enrichResourcesFromModule,
  loadTeachingModule,
} from '@/lib/curriculum/teachingModuleLoader'
import {
  classifyWeek,
  testWeekSetFromSchedule,
  testWeekTopicLabel,
  type TestScheduleLike,
  type WeekKind,
} from '@/lib/teaching/testWeeks'

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
  /** teaching | mid_term_test | end_of_term_test */
  weekType?: WeekKind
}

function makeTestWeekRow(week: number, kind: WeekKind): SchemeWeekRow {
  const topic = testWeekTopicLabel(kind) || `Week ${week} — assessment`
  const assessmentMethods =
    kind === 'mid_term_test' ? ['Mid-term formal test / exam'] : ['End-of-term formal examinations']
  return {
    week,
    topic,
    learningOutcomes: [],
    teachingActivities: [],
    assessmentMethod: assessmentMethods[0],
    assessmentMethods,
    resources: [],
    notes: `${topic} — no new teaching content this week`,
    teacherNotes: 'Assessment week — revise previously taught work; no new scheme topic.',
    homeworkTask: '',
    weekType: kind,
  }
}

function makeTeachingWeekRow(
  week: number,
  unit: ResolvedCurriculumUnit,
  topicIndex: number
): SchemeWeekRow {
  const topics = unit.topics || []
  const topicExtra = topics.length ? topics[topicIndex % topics.length] : ''
  const assessmentMethods =
    (unit.assessment || []).length > 0
      ? (unit.assessment || []).slice(0, 5)
      : ['Formative + end-of-week quiz']
  const notes = `Week ${week}${unit.weekHint ? ` · ${unit.title} (${unit.weekHint}w unit)` : ''}`
  return {
    week,
    topic: topicExtra ? `${unit.title}: ${topicExtra}` : unit.title,
    learningOutcomes: (unit.outcomes || []).slice(0, 5),
    teachingActivities: (unit.activities || []).slice(0, 5),
    assessmentMethod: assessmentMethods[0],
    assessmentMethods,
    resources: (unit.resources || []).slice(0, 5),
    notes,
    teacherNotes: notes,
    homeworkTask: topicExtra ? `Review notes on ${topicExtra}` : `Review notes on ${unit.title}`,
    weekType: 'teaching',
  }
}

/**
 * Spread curriculum units across teachable term weeks only.
 * Mid/EOT (and ranges) get assessment-only rows — no teaching topics.
 */
export function distributeUnitsAcrossTerm(
  units: ResolvedCurriculumUnit[],
  weekCount = 12,
  testSchedule?: TestScheduleLike | null
): SchemeWeekRow[] {
  const weeks = Math.max(1, Math.min(20, Number(weekCount) || 12))
  const testSet = testWeekSetFromSchedule(testSchedule)
  const teachableIndexes: number[] = []
  for (let w = 1; w <= weeks; w++) {
    if (!testSet.has(w)) teachableIndexes.push(w)
  }

  if (!units.length) {
    return Array.from({ length: weeks }, (_, i) => {
      const week = i + 1
      const kind = classifyWeek(week, testSchedule)
      if (kind !== 'teaching') return makeTestWeekRow(week, kind)
      return {
        week,
        topic: `Week ${week} — to be planned`,
        learningOutcomes: [],
        teachingActivities: [],
        assessmentMethod: 'Formative oral / written check',
        assessmentMethods: ['Formative oral / written check'],
        resources: [],
        notes: `Week ${week}`,
        teacherNotes: '',
        homeworkTask: '',
        weekType: 'teaching' as const,
      }
    })
  }

  const teachableCount = Math.max(1, teachableIndexes.length)
  const hasDurations = units.some((u) => typeof u.weekHint === 'number' && u.weekHint > 0)
  const schedule: { unit: ResolvedCurriculumUnit; topicIndex: number }[] = []

  if (hasDurations) {
    for (const unit of units) {
      const span = Math.max(1, Math.min(teachableCount, Number(unit.weekHint) || 1))
      for (let i = 0; i < span; i++) {
        schedule.push({ unit, topicIndex: i })
      }
    }
  } else {
    for (let w = 0; w < teachableCount; w++) {
      const unit = units[w % units.length]
      schedule.push({ unit, topicIndex: w })
    }
  }

  while (schedule.length < teachableCount) {
    const unit = units[schedule.length % units.length]
    schedule.push({ unit, topicIndex: schedule.length })
  }
  const trimmed = schedule.slice(0, teachableCount)

  let teachSlot = 0
  return Array.from({ length: weeks }, (_, i) => {
    const week = i + 1
    const kind = classifyWeek(week, testSchedule)
    if (kind !== 'teaching') return makeTestWeekRow(week, kind)
    const slot = trimmed[teachSlot++] || trimmed[trimmed.length - 1]
    return makeTeachingWeekRow(week, slot.unit, slot.topicIndex)
  })
}

export async function generateSchemeOfWork(input: {
  schoolId?: string | null
  subject: string
  grade: string | number
  term: string | number
  year: number
  weekCount?: number
  midTermWeek?: number | null
  midTermWeekEnd?: number | null
  endOfTermWeek?: number | null
  endOfTermWeekEnd?: number | null
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

  const testSchedule: TestScheduleLike = {
    midTermWeek: input.midTermWeek,
    midTermWeekEnd: input.midTermWeekEnd,
    endOfTermWeek: input.endOfTermWeek,
    endOfTermWeekEnd: input.endOfTermWeekEnd,
  }

  const weeks = distributeUnitsAcrossTerm(curriculum.units, input.weekCount ?? 12, testSchedule)

  const teachingModule = loadTeachingModule({
    subject: curriculum.subject || subject,
    gradeOrForm: curriculum.gradeOrForm || gradeOrForm,
    term,
  })

  const enriched = weeks.map((w) => {
    if (w.weekType && w.weekType !== 'teaching') return w
    return {
      ...w,
      teachingActivities: enrichActivitiesFromModule(w.topic, w.teachingActivities, teachingModule),
      resources: enrichResourcesFromModule(w.topic, w.resources, teachingModule),
      notes: teachingModule ? `${w.notes} · enriched from Teaching Module` : w.notes,
    }
  })

  return {
    subject: curriculum.subject || subject,
    gradeOrForm: curriculum.gradeOrForm || gradeOrForm,
    term,
    year,
    source: teachingModule ? `${curriculum.source}+teaching-module` : curriculum.source,
    weeks: enriched,
  }
}
