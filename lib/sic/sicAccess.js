import { roleCheck } from '@/lib/middleware/auth'

export const SIC_MINUTES_GRACE_DAYS = 3

export function hasSicAssignment(user) {
  const assignment = user?.sicAssignment
  return Boolean(assignment?.id && assignment?.active && !assignment?.revokedAt)
}

export async function getActiveSicAssignment(db, userId, schoolId) {
  if (!userId || !schoolId) return null
  return db.sicAssignment.findFirst({
    where: {
      userId: String(userId),
      schoolId: String(schoolId),
      active: true,
      revokedAt: null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      assignedBy: { select: { id: true, name: true } },
    },
  })
}

export function isSchoolAdminOrHead(user) {
  return roleCheck(user, ['ADMIN', 'headteacher'])
}

/** meetingDate + grace days */
export function minutesDueAtFromMeeting(meetingDate, graceDays = SIC_MINUTES_GRACE_DAYS) {
  const d = new Date(meetingDate)
  d.setDate(d.getDate() + graceDays)
  return d
}

/**
 * Mark ACCEPTED plans overdue (no minutes after meetingDate + 3 days) as INACTIVE
 * and sync SicDepartmentStatus.
 */
export async function applyOverdueCpdInactivity(db, schoolId) {
  const now = new Date()
  const overdue = await db.sicCpdPlan.findMany({
    where: {
      schoolId: String(schoolId),
      status: 'ACCEPTED',
      minutesSubmittedAt: null,
      OR: [{ minutesDueAt: { lt: now } }, { minutesDueAt: null, meetingDate: { lt: now } }],
    },
  })

  let marked = 0
  for (const plan of overdue) {
    const due =
      plan.minutesDueAt || minutesDueAtFromMeeting(plan.meetingDate, SIC_MINUTES_GRACE_DAYS)
    if (due > now) continue

    await db.sicCpdPlan.update({
      where: { id: plan.id },
      data: {
        status: 'INACTIVE',
        inactiveAt: now,
        inactiveReason: `Minutes not submitted within ${SIC_MINUTES_GRACE_DAYS} days of the scheduled CPD meeting`,
        minutesDueAt: due,
      },
    })

    await db.sicDepartmentStatus.upsert({
      where: {
        schoolId_departmentId: {
          schoolId: plan.schoolId,
          departmentId: plan.departmentId,
        },
      },
      create: {
        schoolId: plan.schoolId,
        departmentId: plan.departmentId,
        inactive: true,
        inactiveAt: now,
        reason: `CPD minutes overdue for plan "${plan.title}"`,
        relatedPlanId: plan.id,
      },
      update: {
        inactive: true,
        inactiveAt: now,
        reason: `CPD minutes overdue for plan "${plan.title}"`,
        relatedPlanId: plan.id,
      },
    })
    marked += 1
  }
  return marked
}
