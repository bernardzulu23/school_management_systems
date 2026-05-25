export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseDateInput } from '@/lib/utils/formHelpers'

export async function PUT(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()

  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const contact_number =
    typeof body?.contact_number === 'string' ? body.contact_number.trim() : undefined
  const employeeId = typeof body?.employeeId === 'string' ? body.employeeId.trim() : undefined
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
  const address = typeof body?.address === 'string' ? body.address.trim() : undefined
  const gender = typeof body?.gender === 'string' ? body.gender.trim() : undefined
  const date_of_birth = body?.date_of_birth !== undefined ? body.date_of_birth : undefined

  const user = await prisma.user.findFirst({
    where: { id: auth.user.id, schoolId },
    select: { id: true, role: true, email: true },
  })

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  const canEditDetails = role === 'admin' || role === 'headteacher'
  if (!canEditDetails) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const data = {}

  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    if (name.length > 100) return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    data.name = name
  }

  if (contact_number !== undefined) {
    if (contact_number.length > 30) {
      return NextResponse.json({ error: 'Contact number too long' }, { status: 400 })
    }
    data.contact_number = contact_number || null
  }

  if (employeeId !== undefined) {
    if (employeeId.length > 50) {
      return NextResponse.json({ error: 'Employee ID too long' }, { status: 400 })
    }
    data.employeeId = employeeId || null
  }

  if (email !== undefined) {
    if (!email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

    if (email !== user.email) {
      const existing = await prisma.user.findFirst({
        where: { email, schoolId, NOT: { id: user.id } },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
    }
    data.email = email
  }

  if (address !== undefined) {
    if (address.length > 200)
      return NextResponse.json({ error: 'Address too long' }, { status: 400 })
    data.address = address || null
  }

  if (gender !== undefined) {
    if (gender.length > 20) return NextResponse.json({ error: 'Gender too long' }, { status: 400 })
    data.gender = gender || null
  }

  if (date_of_birth !== undefined) {
    if (date_of_birth === null || date_of_birth === '') {
      data.date_of_birth = null
    } else {
      const parsed = parseDateInput(date_of_birth) || new Date(date_of_birth)
      if (!parsed || Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
      }
      data.date_of_birth = parsed
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      schoolId: true,
      profile_picture_url: true,
      contact_number: true,
      address: true,
      date_of_birth: true,
      gender: true,
      employeeId: true,
    },
  })

  return NextResponse.json({ success: true, user: updated })
}
