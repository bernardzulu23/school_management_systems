export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateHodMeetingSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'

function mapMeeting(m) {
  return {
    id: m.id,
    title: m.title,
    type: m.meetingType,
    status: m.status,
    date: m.meetingDate,
    time: m.meetingTime || '',
    duration: m.duration || '',
    location: m.location || '',
    attendees: m.attendees || [],
    agenda: m.agenda || [],
    minutes: m.minutesStatus || (m.minutes ? 'Recorded' : 'Pending'),
    minutesText: m.minutes || '',
    actionItems: m.actionItems || 0,
    meetingScope: m.meetingScope,
  }
}

function splitMeetings(meetings) {
  const now = Date.now()
  const upcoming = []
  const completed = []
  for (const m of meetings) {
    const mapped = mapMeeting(m)
    if (m.status === 'completed' || m.status === 'cancelled') {
      completed.push(mapped)
    } else if (new Date(m.meetingDate).getTime() < now && m.status === 'scheduled') {
      completed.push({ ...mapped, status: 'completed' })
    } else if (m.status === 'scheduled') {
      upcoming.push(mapped)
    } else {
      completed.push(mapped)
    }
  }
  return { upcoming, completed }
}

export const GET = withErrorHandler(async function GET(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { searchParams } = new URL(request.url)
  const meetingScope = searchParams.get('scope') || 'department'
  const minutesOnly = searchParams.get('minutes') === '1'

  const { db, departmentId } = scope
  const where = {
    ...hodDepartmentWhere(departmentId),
    meetingScope,
  }

  if (minutesOnly) {
    where.OR = [{ minutes: { not: null } }, { minutesStatus: { not: null } }]
  }

  const rows = await db.hodMeeting.findMany({
    where,
    orderBy: { meetingDate: 'desc' },
    take: 200,
  })

  const meetingsData = splitMeetings(rows)

  if (minutesOnly) {
    const withMinutes = rows.filter((m) => m.minutes || m.minutesStatus).map(mapMeeting)
    return NextResponse.json({ success: true, data: { meetings: withMinutes } })
  }

  return NextResponse.json({ success: true, data: meetingsData })
})

export const POST = withErrorHandler(async function POST(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { data: body, error: validationError } = await validateBody(request, CreateHodMeetingSchema)
  if (validationError) return validationError

  const { db, departmentId } = scope
  const created = await db.hodMeeting.create({
    data: {
      departmentId,
      title: body.title,
      meetingType: body.meetingType || 'Department',
      meetingScope: body.meetingScope || 'department',
      meetingDate: new Date(body.meetingDate),
      meetingTime: body.meetingTime,
      duration: body.duration,
      location: body.location,
      status: body.status || 'scheduled',
      attendees: body.attendees || [],
      agenda: body.agenda || [],
      minutes: body.minutes,
      actionItems: body.actionItems ?? 0,
      minutesStatus: body.minutesStatus,
    },
  })

  if (departmentId) {
    const { scheduleDepartmentMeetingReminders } = await import('@/lib/notifications/integrations')
    await scheduleDepartmentMeetingReminders({
      schoolId: scope.schoolId,
      departmentId,
      meetingId: created.id,
      title: created.title,
      meetingDate: created.meetingDate,
      meetingTime: created.meetingTime,
      createdByUserId: scope.userId,
    })
  }

  return NextResponse.json({ success: true, data: mapMeeting(created) }, { status: 201 })
})
