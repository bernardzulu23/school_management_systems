import { safeStringId } from '@/lib/security/safeQueryValue'

export async function deleteStudentCascade({ tx, schoolId, studentId, actor, studentLabel }) {
  const id = safeStringId(studentId)
  const sid = safeStringId(schoolId)
  if (!id || !sid) return

  const existing = !studentLabel
    ? await tx.student.findFirst({
        where: { id, schoolId: sid },
        select: { name: true, class: true },
      })
    : null
  const label =
    studentLabel ||
    (existing?.name
      ? `Student record: ${existing.name}${existing.class ? ` (${existing.class})` : ''}`
      : `Student ${id}`)

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
  // Biometric + consent ledger (CASCADE also covers ConsentRecord; explicit clear for audit safety)
  await tx.consentRecord.deleteMany({ where: { schoolId: sid, pupilId: id } })
  await tx.student.update({
    where: { id },
    data: { faceEmbedding: null, faceEmbeddingEnrolledAt: null },
  })

  await tx.student.delete({ where: { id } })

  if (actor) {
    const { recordChangeLog, actorFromUser } = await import('@/lib/changelog/record')
    const { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULES, buildActorLabel } =
      await import('@/lib/changelog/constants')
    const a = actorFromUser(actor)
    await recordChangeLog({
      db: tx,
      schoolId: sid,
      actor: a,
      action: CHANGE_LOG_ACTIONS.DELETED,
      module: CHANGE_LOG_MODULES.STUDENTS,
      entityType: 'Student',
      entityId: id,
      entityLabel: label,
      summary: `${buildActorLabel(a)} deleted ${label}`,
      before: existing ? { name: existing.name, class: existing.class } : { id },
      metadata: { studentId: id },
    })
  }
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

export async function deleteUserCascade({ tx, schoolId, userId, actor }) {
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
    await deleteStudentCascade({
      tx,
      schoolId: sid,
      studentId: user.studentProfile.id,
      actor,
      studentLabel: user.studentProfile.name
        ? `Student record: ${user.studentProfile.name}`
        : undefined,
    })
  }

  await tx.activityParticipant.deleteMany({ where: { schoolId: sid, userId: id } })
  await tx.activity.deleteMany({ where: { schoolId: sid, organizerId: id } })
  await tx.note.deleteMany({ where: { schoolId: sid, userId: id } })
  await tx.bookLoan.deleteMany({ where: { schoolId: sid, userId: id } })

  await tx.user.delete({ where: { id } })

  if (actor && !user.studentProfile?.id) {
    const { recordChangeLog, actorFromUser } = await import('@/lib/changelog/record')
    const { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULES, buildActorLabel } =
      await import('@/lib/changelog/constants')
    const a = actorFromUser(actor)
    await recordChangeLog({
      db: tx,
      schoolId: sid,
      actor: a,
      action: CHANGE_LOG_ACTIONS.DELETED,
      module: CHANGE_LOG_MODULES.USERS,
      entityType: 'User',
      entityId: id,
      entityLabel: `User: ${user.name || user.email || id}`,
      summary: `${buildActorLabel(a)} deleted user ${user.name || user.email || id}`,
      before: { name: user.name, email: user.email, role: user.role },
    })
  }
}
