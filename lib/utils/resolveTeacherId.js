/**
 * Allocations store Teacher.id; MasterTimetableEntry / TeacherAllocation use User.id.
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

/** Resolve Teacher.id or User.id → User.id for FK tables that reference User. */
export async function resolveTeacherUserId(prisma, schoolId, teacherIdOrUserId) {
  const raw = String(teacherIdOrUserId || '').trim()
  if (!raw || !schoolId) return null

  const userDirect = await prisma.user.findFirst({
    where: { id: raw, schoolId },
    select: { id: true, name: true },
  })
  if (userDirect) return userDirect

  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId,
      OR: [{ id: raw }, { userId: raw }],
    },
    select: {
      userId: true,
      user: { select: { id: true, name: true } },
    },
  })
  if (teacher?.user?.id) {
    return { id: teacher.user.id, name: teacher.user.name }
  }
  if (teacher?.userId) {
    const user = await prisma.user.findFirst({
      where: { id: teacher.userId, schoolId },
      select: { id: true, name: true },
    })
    if (user) return user
  }

  return null
}
