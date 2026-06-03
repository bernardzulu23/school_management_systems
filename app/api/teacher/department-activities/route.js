export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { resolveTeacherDepartmentId } from '@/lib/hod/resolveTeacherDepartment'
import { activityStartsAt, countdownMeta } from '@/lib/hod/activitySchedule'
import { mapHodFileRow } from '@/lib/hod/hodFiles'

function mapActivity(base) {
  const startsAt = activityStartsAt(base.date, base.time)
  const countdown = startsAt ? countdownMeta(startsAt) : null
  return {
    ...base,
    startsAt: countdown?.startsAt || null,
    countdown,
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { departmentId, departmentName } = await resolveTeacherDepartmentId(schoolId, auth.user.id)

  if (!departmentId) {
    return NextResponse.json({
      success: true,
      data: {
        departmentName,
        activities: [],
        upcomingCount: 0,
      },
    })
  }

  const db = getTenantClient(schoolId)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + 30)

  const [meetings, routineTasks, files] = await Promise.all([
    db.hodMeeting.findMany({
      where: {
        departmentId,
        status: 'scheduled',
        meetingDate: { gte: startOfToday },
      },
      orderBy: { meetingDate: 'asc' },
      take: 20,
    }),
    db.hodDailyRoutineTask.findMany({
      where: {
        departmentId,
        status: { notIn: ['completed'] },
        taskDate: { gte: now, lte: horizon },
      },
      orderBy: [{ taskDate: 'asc' }, { taskTime: 'asc' }],
      take: 30,
    }),
    db.hodFile.findMany({
      where: {
        departmentId,
        label: { in: ['schedule', 'minutes', 'agenda'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const filesByMeeting = new Map()
  for (const f of files) {
    if (f.entityType !== 'meeting') continue
    const list = filesByMeeting.get(f.entityId) || []
    list.push(mapHodFileRow(f))
    filesByMeeting.set(f.entityId, list)
  }

  const activities = []

  for (const m of meetings) {
    activities.push(
      mapActivity({
        id: m.id,
        kind: 'meeting',
        title: m.title,
        subtitle: m.meetingType,
        scope: m.meetingScope,
        location: m.location || '',
        date: m.meetingDate,
        time: m.meetingTime,
        status: m.status,
        departmentName,
        files: filesByMeeting.get(m.id) || [],
        href:
          m.meetingScope === 'staff' ? '/dashboard/hod/staff-meetings' : '/dashboard/hod/meetings',
      })
    )
  }

  for (const t of routineTasks) {
    activities.push(
      mapActivity({
        id: t.id,
        kind: 'routine',
        title: t.title,
        subtitle: t.category || 'Department activity',
        scope: 'department',
        location: '',
        date: t.taskDate,
        time: t.taskTime,
        status: t.status,
        priority: t.priority,
        departmentName,
        files: [],
        href: '/dashboard/hod/daily-routine',
      })
    )
  }

  activities.sort((a, b) => {
    const ta = a.countdown?.msUntil ?? Infinity
    const tb = b.countdown?.msUntil ?? Infinity
    return ta - tb
  })

  const upcoming = activities.filter((a) => a.countdown && !a.countdown.isPast)

  return NextResponse.json({
    success: true,
    data: {
      departmentName,
      activities: upcoming.slice(0, 12),
      upcomingCount: upcoming.length,
      nextActivity: upcoming[0] || null,
    },
  })
})
