import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { resolveEducationLevelFromGrade } from '@/lib/subjects/resolveSubjectCatalog'

function normalizeLevel(level) {
  return String(level || '')
    .trim()
    .toLowerCase()
}

export function canUseSeniorTeacherFeatures(schoolLevel) {
  const level = normalizeLevel(schoolLevel)
  return level === 'primary' || level === 'combined'
}

export function isPrimaryClassRecord(classItem) {
  const yearGroup = String(classItem?.year_group || classItem?.yearGroup || '').trim()
  const name = String(classItem?.name || '').trim()
  const raw = `${yearGroup} ${name}`.toLowerCase()
  if (/\b(ece|reception)\b/.test(raw)) return true
  return (
    resolveEducationLevelFromGrade(yearGroup) === 'primary' ||
    resolveEducationLevelFromGrade(name) === 'primary'
  )
}

export async function getActiveSeniorTeacherAssignment(db, userId, schoolId) {
  if (!userId) return null
  return db.seniorTeacherAssignment.findFirst({
    where: {
      userId: String(userId),
      active: true,
      revokedAt: null,
      ...(schoolId ? { schoolId: String(schoolId) } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          teacherProfile: { select: { id: true, department: true } },
        },
      },
      assignedBy: { select: { id: true, name: true } },
    },
  })
}

export async function hasActiveSeniorTeacherAssignment(db, userId, schoolId) {
  const row = await getActiveSeniorTeacherAssignment(db, userId, schoolId)
  return Boolean(row?.id)
}

export async function resolvePrimaryClassScope(db, schoolId) {
  const classes = await db.class.findMany({
    where: { schoolId, isActive: true },
    select: {
      id: true,
      name: true,
      year_group: true,
      section: true,
      teacherId: true,
      departmentId: true,
      _count: { select: { students: true, teachingAssignments: true } },
    },
    orderBy: [{ year_group: 'asc' }, { name: 'asc' }],
  })

  const primaryClasses = classes.filter(isPrimaryClassRecord)
  const classIds = primaryClasses.map((row) => row.id)

  return {
    classes: primaryClasses,
    classIds,
  }
}

export async function resolvePrimaryTeacherUserIds(db, schoolId) {
  const { classIds } = await resolvePrimaryClassScope(db, schoolId)
  if (classIds.length === 0) return []

  const assignments = await db.teachingAssignment.findMany({
    where: { schoolId, classId: { in: classIds } },
    select: { teacher: { select: { userId: true } } },
    take: 5000,
  })

  const ids = new Set()
  for (const row of assignments) {
    const userId = String(row?.teacher?.userId || '').trim()
    if (userId) ids.add(userId)
  }
  return Array.from(ids)
}

export async function authorizeSeniorTeacherAdmin(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, level: true },
  })
  if (!canUseSeniorTeacherFeatures(school?.level)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Senior Teacher assignment is only available for primary or combined schools' },
        { status: 403 }
      ),
    }
  }

  return { ok: true, auth, schoolId, school }
}

export async function authorizeSeniorTeacherAccess(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, level: true },
  })
  if (!canUseSeniorTeacherFeatures(school?.level)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Senior Teacher access is unavailable here' },
        { status: 403 }
      ),
    }
  }

  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const isSeniorTeacherRole = roleCheck(auth.user, [
    'SENIOR_TEACHER',
    'senior_teacher',
    'seniorteacher',
  ])
  const assignment = await getActiveSeniorTeacherAssignment(prisma, auth.user.id, schoolId)
  if (!isAdmin && !assignment && !isSeniorTeacherRole && !auth.user?.isSeniorTeacher) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return {
    ok: true,
    auth,
    schoolId,
    school,
    isAdmin,
    assignment,
    isSeniorTeacher: Boolean(assignment || isSeniorTeacherRole || auth.user?.isSeniorTeacher),
  }
}
