import prisma from '@/lib/prisma'

export async function getStudentSubjectNames(studentId, schoolId) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { selected_subjects: true },
  })
  if (!student) return []

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, pupilId: studentId },
    include: { subject: { select: { id: true, name: true } } },
  })

  const names = new Set()
  for (const e of enrollments) {
    if (e.subject?.name) names.add(String(e.subject.name).trim())
  }
  for (const n of student.selected_subjects || []) {
    if (String(n).trim()) names.add(String(n).trim())
  }

  return [...names].sort((a, b) => a.localeCompare(b))
}

export async function assertStudentSubjectAllowed(studentId, schoolId, subjectName) {
  const allowed = await getStudentSubjectNames(studentId, schoolId)
  const target = String(subjectName || '').trim()
  const match = allowed.find((s) => s.toLowerCase() === target.toLowerCase())
  if (!match) {
    const err = new Error('You can only create flashcards for your enrolled subjects')
    err.status = 403
    throw err
  }
  return match
}
