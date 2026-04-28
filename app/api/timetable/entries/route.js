export const dynamic = 'force-dynamic'
// app/api/timetable/entries/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

function normalizeDayOfWeek(day) {
  const d = String(day || '')
    .trim()
    .toLowerCase()
  if (d === 'monday') return 'Monday'
  if (d === 'tuesday') return 'Tuesday'
  if (d === 'wednesday') return 'Wednesday'
  if (d === 'thursday') return 'Thursday'
  if (d === 'friday') return 'Friday'
  if (d === 'saturday') return 'Saturday'
  if (d === 'sunday') return 'Sunday'
  return ''
}

export async function GET(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const term = searchParams.get('term') || 'Term 1'
  const academicYear = searchParams.get('academicYear') || new Date().getFullYear().toString()
  const status = searchParams.get('status') // draft or published

  const where = { schoolId, term, academicYear }
  if (status) where.status = status

  const entries = await prisma.timetableAllocationEntry.findMany({
    where,
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })

  return NextResponse.json({ entries })
}

export async function PATCH(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const dayOfWeek = normalizeDayOfWeek(body?.dayOfWeek)
  const startTime = String(body?.startTime || '').trim()
  const endTime = String(body?.endTime || '').trim()
  const periodNumber = Number(body?.periodNumber)

  if (!dayOfWeek) return NextResponse.json({ error: 'Invalid dayOfWeek' }, { status: 400 })
  if (!startTime || !endTime) {
    return NextResponse.json({ error: 'startTime and endTime required' }, { status: 400 })
  }
  if (!Number.isFinite(periodNumber) || periodNumber < 1) {
    return NextResponse.json({ error: 'Invalid periodNumber' }, { status: 400 })
  }

  const entry = await prisma.timetableAllocationEntry.findFirst({ where: { id, schoolId } })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (String(entry.status) !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft entries can be edited. Generate a draft first.' },
      { status: 409 }
    )
  }

  const updated = await prisma.timetableAllocationEntry.update({
    where: { id },
    data: { dayOfWeek, startTime, endTime, periodNumber },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json({ entry: updated })
}

export async function DELETE(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const entry = await prisma.timetableAllocationEntry.findFirst({ where: { id, schoolId } })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (String(entry.status) !== 'draft') {
    return NextResponse.json({ error: 'Only draft entries can be deleted.' }, { status: 409 })
  }

  await prisma.timetableAllocationEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
