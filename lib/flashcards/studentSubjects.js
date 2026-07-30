import prisma from '@/lib/prisma'
import { ApiError } from '@/lib/middleware/errorHandler'
import { parseYearGroupSectionFromClassName } from '@/lib/services/registrationHelpers'
import { basePrisma } from '@/lib/prisma/client'
import { resolveSubjectCatalog } from '@/lib/subjects/resolveSubjectCatalog'

/**
 * Resolve the authenticated student's enrolled subject names.
 * Sources (union): pupilSubjectEnrollment → selected_subjects → class.subjects.
 * Filtered to the school-level / grade catalog so secondary names never leak
 * into primary student UIs.
 */
export async function getStudentSubjectNames(studentId, schoolId) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      selected_subjects: true,
      classId: true,
      class: true,
      classRef: { select: { year_group: true } },
    },
  })
  if (!student) return []

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, pupilId: studentId },
    include: { subject: { select: { id: true, name: true, educationLevel: true } } },
  })

  const names = new Set()
  for (const e of enrollments) {
    if (e.subject?.name) names.add(String(e.subject.name).trim())
  }
  for (const n of student.selected_subjects || []) {
    if (String(n).trim()) names.add(String(n).trim())
  }

  if (student.classId) {
    const cls = await prisma.class.findFirst({
      where: { id: student.classId, schoolId },
      include: { subjects: { select: { name: true, educationLevel: true } } },
    })
    for (const s of cls?.subjects || []) {
      if (s?.name) names.add(String(s.name).trim())
    }
  }

  const school = await basePrisma.school.findUnique({
    where: { id: schoolId },
    select: { level: true, enabledLocalLanguages: true },
  })
  const gradeLevel = resolveStudentGradeLabel(student)
  const catalog = resolveSubjectCatalog({
    schoolLevel: school?.level,
    gradeLevel,
    enabledLocalLanguages: school?.enabledLocalLanguages,
  })
  if (!catalog.subjects.length) {
    return [...names].sort((a, b) => a.localeCompare(b))
  }
  const allowed = new Set(catalog.subjects.map((s) => String(s.name).trim().toLowerCase()))
  return [...names]
    .filter((name) => allowed.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Grade/form label for curriculum grounding (e.g. "Form 1", "Grade 7").
 * Prefers Class.year_group, then parses Student.class ("Form 1A" → "Form 1").
 *
 * @param {{ class?: string | null, classRef?: { year_group?: string | null } | null } | null | undefined} student
 */
export function resolveStudentGradeLabel(student) {
  const fromRef = String(student?.classRef?.year_group || '').trim()
  if (fromRef) return fromRef
  const className = String(student?.class || '').trim()
  if (!className) return ''
  const parsed = parseYearGroupSectionFromClassName(className)
  return String(parsed.year_group || className).trim()
}

/**
 * @param {string} studentId
 * @param {string} schoolId
 * @param {string} subjectName
 * @param {{ action?: string }} [options]
 */
export async function assertStudentSubjectAllowed(studentId, schoolId, subjectName, options = {}) {
  const allowed = await getStudentSubjectNames(studentId, schoolId)
  const target = String(subjectName || '').trim()
  const match = allowed.find((s) => s.toLowerCase() === target.toLowerCase())
  if (!match) {
    const action = options.action || 'use'
    throw new ApiError(`You can only ${action} your enrolled subjects`, 403)
  }
  return match
}
