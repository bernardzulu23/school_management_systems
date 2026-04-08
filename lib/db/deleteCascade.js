export async function deleteStudentCascade({ tx, schoolId, studentId }) {
  const id = String(studentId || '').trim()
  if (!id) return

  const profile = await tx.gamificationProfile.findUnique({
    where: { studentId: id },
    select: { id: true },
  })

  if (profile?.id) {
    await tx.studentBadge.deleteMany({ where: { profileId: profile.id } })
  }

  await tx.assignmentSubmission.deleteMany({ where: { schoolId, studentId: id } })
  await tx.studentMaterial.deleteMany({ where: { schoolId, studentId: id } })
  await tx.studentGame.deleteMany({ where: { schoolId, studentId: id } })
  await tx.studentWork.deleteMany({ where: { schoolId, studentId: id } })
  await tx.goal.deleteMany({ where: { schoolId, studentId: id } })
  await tx.attendance.deleteMany({ where: { schoolId, studentId: id } })
  await tx.result.deleteMany({ where: { schoolId, studentId: id } })
  await tx.pupilSubjectEnrollment.deleteMany({ where: { schoolId, pupilId: id } })
  await tx.gamificationProfile.deleteMany({ where: { studentId: id } })

  await tx.student.delete({ where: { id } })
}

export async function deleteTeacherCascade({ tx, schoolId, teacherId }) {
  const id = String(teacherId || '').trim()
  if (!id) return

  await tx.teachingAssignment.deleteMany({ where: { schoolId, teacherId: id } })
  await tx.teacherDepartment.deleteMany({ where: { teacherId: id } })
  await tx.class.updateMany({ where: { schoolId, teacherId: id }, data: { teacherId: null } })
  await tx.subject.updateMany({ where: { schoolId, teacherId: id }, data: { teacherId: null } })
  await tx.teacher.update({ where: { id }, data: { classes: { set: [] } } })
  await tx.teacher.delete({ where: { id } })
}

export async function deleteUserCascade({ tx, schoolId, userId }) {
  const id = String(userId || '').trim()
  if (!id) return

  const user = await tx.user.findFirst({
    where: { id, schoolId },
    include: { studentProfile: true, teacherProfile: true, hodProfile: true },
  })
  if (!user) return

  if (user.hodProfile?.id) {
    await tx.headOfDepartment.delete({ where: { id: user.hodProfile.id } })
  }

  if (user.teacherProfile?.id) {
    await deleteTeacherCascade({ tx, schoolId, teacherId: user.teacherProfile.id })
  }

  if (user.studentProfile?.id) {
    await deleteStudentCascade({ tx, schoolId, studentId: user.studentProfile.id })
  }

  await tx.activityParticipant.deleteMany({ where: { schoolId, userId: id } })
  await tx.activity.deleteMany({ where: { schoolId, organizerId: id } })
  await tx.note.deleteMany({ where: { schoolId, userId: id } })
  await tx.bookLoan.deleteMany({ where: { schoolId, userId: id } })

  await tx.user.delete({ where: { id } })
}
