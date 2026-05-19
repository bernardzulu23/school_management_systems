/**
 * Allocations store Teacher.id; the UI often has User.id from /api/users.
 */
export async function resolveTeacherRecordId(prisma, schoolId, teacherIdOrUserId) {
  const raw = String(teacherIdOrUserId || '').trim()
  if (!raw || !schoolId) return null

  const byTeacher = await prisma.teacher.findFirst({
    where: { id: raw, schoolId },
    select: { id: true },
  })
  if (byTeacher) return byTeacher.id

  const byUser = await prisma.teacher.findFirst({
    where: { userId: raw, schoolId },
    select: { id: true },
  })
  return byUser?.id || null
}
