export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateHodMeetingSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { data: body, error: validationError } = await validateBody(request, UpdateHodMeetingSchema)
  if (validationError) return validationError

  const { db, departmentId } = scope
  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await db.hodMeeting.findFirst({
    where: { id, ...hodDepartmentWhere(departmentId) },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await db.hodMeeting.update({
    where: { id },
    data: {
      ...(body.title != null ? { title: body.title } : {}),
      ...(body.meetingType != null ? { meetingType: body.meetingType } : {}),
      ...(body.meetingScope != null ? { meetingScope: body.meetingScope } : {}),
      ...(body.meetingDate != null ? { meetingDate: new Date(body.meetingDate) } : {}),
      ...(body.meetingTime != null ? { meetingTime: body.meetingTime } : {}),
      ...(body.duration != null ? { duration: body.duration } : {}),
      ...(body.location != null ? { location: body.location } : {}),
      ...(body.status != null ? { status: body.status } : {}),
      ...(body.attendees != null ? { attendees: body.attendees } : {}),
      ...(body.agenda != null ? { agenda: body.agenda } : {}),
      ...(body.minutes != null ? { minutes: body.minutes } : {}),
      ...(body.actionItems != null ? { actionItems: body.actionItems } : {}),
      ...(body.minutesStatus != null ? { minutesStatus: body.minutesStatus } : {}),
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
