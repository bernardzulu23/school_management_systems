import prisma from '@/lib/prisma'
import { resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'

const STAFF_BYPASS_ROLES = new Set(['admin', 'headteacher', 'hod'])

function normalizeSubjectName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

/**
 * Resolve subject names a teacher may index RAG materials for.
 * Headteachers/HODs/admins may use any school subject when bypass is allowed.
 */
export async function getTeacherAssignableSubjects({
  schoolId,
  userId,
  userRole,
  allowStaffBypass = true,
}) {
  const role = String(userRole || '').toLowerCase()
  if (allowStaffBypass && STAFF_BYPASS_ROLES.has(role)) {
    const rows = await prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return rows.map((s) => s.name)
  }

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: String(userId) },
    include: {
      user: { select: { id: true, name: true } },
      classes: true,
      subjects: true,
      teachingAssignments: {
        where: { schoolId },
        include: { class: true, subject: true },
      },
    },
  })

  if (!teacher) return []

  const { assignments } = await resolveTeacherLoad({ schoolId, teacher })
  const names = new Set()
  for (const a of assignments) {
    const name = a?.subject?.name || a?.subjectName
    if (name) names.add(String(name).trim())
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b))
}

/**
 * @returns {{ ok: true } | { ok: false, error: string, status: number }}
 */
export async function assertTeacherMaterialSubject({
  schoolId,
  userId,
  userRole,
  subject,
  requireSubject = true,
}) {
  const subjectName = String(subject || '').trim()
  if (!subjectName) {
    if (requireSubject) {
      return {
        ok: false,
        status: 400,
        error: 'Subject is required. Upload materials only for subjects you teach.',
      }
    }
    return { ok: true }
  }

  const allowed = await getTeacherAssignableSubjects({ schoolId, userId, userRole })
  if (!allowed.length) {
    return {
      ok: false,
      status: 403,
      error:
        'No teaching assignments found. Ask your headteacher to assign your classes and subjects first.',
    }
  }

  const allowedNorm = new Set(allowed.map(normalizeSubjectName))
  if (!allowedNorm.has(normalizeSubjectName(subjectName))) {
    return {
      ok: false,
      status: 403,
      error: `You can only index materials for subjects you teach. Allowed: ${allowed.join(', ')}`,
    }
  }

  return { ok: true }
}
