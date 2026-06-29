import { safeStringId } from '@/lib/security/safeQueryValue'

export async function deleteStudentCascade({ tx, schoolId, studentId }) {
  const id = safeStringId(studentId)
  const sid = safeStringId(schoolId)
  if (!id || !sid) return

  const profile = await tx.gamificationProfile.findUnique({
    where: { studentId: id },
    select: { id: true },
  })

  if (profile?.id) {
    await tx.studentBadge.deleteMany({ where: { profileId: profile.id } })
  }

  await tx.assignmentSubmission.deleteMany({ where: { schoolId: sid, studentId: id } })
  await tx.studentMaterial.deleteMany({ where: { schoolId: sid, studentId: id } })
  await tx.studentGame.deleteMany({ where: { schoolId: sid, studentId: id } })
  await tx.studentWork.deleteMany({ where: { schoolId: sid, studentId: id } })
  await tx.goal.deleteMany({ where: { schoolId: sid, studentId: id } })
  await tx.attendance.deleteMany({ where: { schoolId: sid, studentId: id } })
  await tx.result.deleteMany({ where: { schoolId: sid, studentId: id } })
  await tx.pupilSubjectEnrollment.deleteMany({ where: { schoolId: sid, pupilId: id } })
  await tx.gamificationProfile.deleteMany({ where: { studentId: id } })

  await tx.student.delete({ where: { id } })
}

export async function deleteTeacherCascade({ tx, schoolId, teacherId }) {
  const id = safeStringId(teacherId)
  const sid = safeStringId(schoolId)
  if (!id || !sid) return

  await tx.teachingAssignment.deleteMany({ where: { schoolId: sid, teacherId: id } })
  await tx.teacherDepartment.deleteMany({ where: { teacherId: id } })
  await tx.class.updateMany({ where: { schoolId: sid, teacherId: id }, data: { teacherId: null } })
  await tx.subject.updateMany({
    where: { schoolId: sid, teacherId: id },
    data: { teacherId: null },
  })
  await tx.teacher.update({ where: { id }, data: { classes: { set: [] } } })
  await tx.teacher.delete({ where: { id } })
}

export async function deleteUserCascade({ tx, schoolId, userId }) {
  const id = safeStringId(userId)
  const sid = safeStringId(schoolId)
  if (!id || !sid) return

  const user = await tx.user.findFirst({
    where: { id, schoolId: sid },
    include: {
      studentProfile: true,
      teacherProfile: true,
      hodProfile: true,
      guidanceAssignment: true,
    },
  })
  if (!user) return

  if (user.hodProfile?.id) {
    await tx.headOfDepartment.delete({ where: { id: user.hodProfile.id } })
  }

  if (user.guidanceAssignment?.id) {
    await tx.guidanceAssignment.delete({ where: { id: user.guidanceAssignment.id } })
  }

  if (user.teacherProfile?.id) {
    await deleteTeacherCascade({ tx, schoolId: sid, teacherId: user.teacherProfile.id })
  }

  if (user.studentProfile?.id) {
    await deleteStudentCascade({ tx, schoolId: sid, studentId: user.studentProfile.id })
  }

  await tx.activityParticipant.deleteMany({ where: { schoolId: sid, userId: id } })
  await tx.activity.deleteMany({ where: { schoolId: sid, organizerId: id } })
  await tx.note.deleteMany({ where: { schoolId: sid, userId: id } })
  await tx.bookLoan.deleteMany({ where: { schoolId: sid, userId: id } })

  await tx.user.delete({ where: { id } })
}
