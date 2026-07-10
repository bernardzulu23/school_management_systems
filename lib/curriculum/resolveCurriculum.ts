/**
 * Resolve curriculum for a subject/grade: school DB rows first, then built-in JSON.
 */

import { prisma } from '@/lib/prisma'
import {
  getChemistryCurriculumRecords,
  normalizeForm,
  subjectIsChemistry,
} from '@/lib/curriculum/chemistry-cdc-2024'
import { loadJsonCurriculum } from '@/lib/curriculum/jsonCurriculumLoader'
import type { ParsedSyllabusUnit } from '@/lib/curriculum/syllabusParsing'

export type ResolvedCurriculumUnit = ParsedSyllabusUnit & { id?: string }

export type ResolvedCurriculum = {
  subject: string
  gradeOrForm: string
  source: 'db' | 'json'
  curriculumId?: string
  units: ResolvedCurriculumUnit[]
  topics: string[]
}

function chemistryRecordsToUnits(form: number | null): ResolvedCurriculumUnit[] {
  const records = getChemistryCurriculumRecords().filter((r) =>
    form == null ? true : r.form === form
  )
  const byTopic = new Map<string, ResolvedCurriculumUnit>()
  for (const r of records) {
    const key = `${r.topicNumber}|${r.topic}`
    let unit = byTopic.get(key)
    if (!unit) {
      unit = {
        title: r.topic,
        topics: [],
        outcomes: [],
        activities: [],
        assessment: [],
        resources: [],
        sortOrder: byTopic.size,
      }
      byTopic.set(key, unit)
    }
    if (r.subtopic) unit.topics.push(r.subtopic)
    for (const c of r.specificCompetences || []) unit.outcomes.push(c)
    for (const a of r.learningActivities || []) unit.activities.push(a)
    for (const t of r.suggestedAssessmentTypes || []) unit.assessment.push(t)
  }
  return Array.from(byTopic.values())
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v || '').trim()).filter(Boolean)
}

export async function resolveCurriculum(options: {
  schoolId?: string | null
  subject: string
  gradeOrForm: string
}): Promise<ResolvedCurriculum> {
  const subject = String(options.subject || '').trim()
  const gradeOrForm = String(options.gradeOrForm || '').trim()
  const schoolId = options.schoolId ? String(options.schoolId).trim() : null

  if (schoolId) {
    const row = await prisma.curriculum.findFirst({
      where: {
        schoolId,
        subject: { equals: subject, mode: 'insensitive' },
        gradeOrForm: { equals: gradeOrForm, mode: 'insensitive' },
      },
      include: { units: { orderBy: { sortOrder: 'asc' } } },
    })

    if (row && row.units.length > 0) {
      const units: ResolvedCurriculumUnit[] = row.units.map((u) => ({
        id: u.id,
        title: u.title,
        topics: asStringArray(u.topics),
        outcomes: asStringArray(u.outcomes),
        activities: asStringArray(u.activities),
        assessment: asStringArray(u.assessment),
        resources: asStringArray(u.resources),
        durationMinutes: u.durationMinutes ?? undefined,
        weekHint: u.weekHint ?? undefined,
        sortOrder: u.sortOrder,
      }))
      const topics = units.flatMap((u) => [u.title, ...u.topics])
      return {
        subject: row.subject,
        gradeOrForm: row.gradeOrForm,
        source: 'db',
        curriculumId: row.id,
        units,
        topics: Array.from(new Set(topics.filter(Boolean))),
      }
    }
  }

  // Prefer unit-format JSON (schemes) over CDC chunk dataset
  const fromFile = loadJsonCurriculum(subject, gradeOrForm)
  if (fromFile && fromFile.units.length > 0) {
    const topics = fromFile.units.flatMap((u) => [u.title, ...u.topics])
    return {
      subject: fromFile.subject,
      gradeOrForm: gradeOrForm || fromFile.gradeOrForm,
      source: 'json',
      units: fromFile.units,
      topics: Array.from(new Set(topics.filter(Boolean))),
    }
  }

  // CDC Chemistry fallback for RAG-style topic lists when no unit JSON
  if (subjectIsChemistry(subject)) {
    const form = normalizeForm(gradeOrForm)
    const units = chemistryRecordsToUnits(form)
    if (units.length > 0) {
      const topics = units.flatMap((u) => [u.title, ...u.topics])
      return {
        subject: 'Chemistry',
        gradeOrForm: form ? `Form ${form}` : gradeOrForm || 'Form 1',
        source: 'json',
        units,
        topics: Array.from(new Set(topics.filter(Boolean))),
      }
    }
  }

  return {
    subject,
    gradeOrForm,
    source: 'json',
    units: [],
    topics: [],
  }
}
