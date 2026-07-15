export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { PROJECT_CATEGORIES, LAB_TYPES, INNOVATION_METHODOLOGIES } from '@/lib/innovation/constants'

const VALID_STATUSES = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED']
const STAFF = ['teacher', 'hod', 'headteacher', 'admin']

function canManageProject(user, project) {
  if (!user?.id) return false
  if (project.createdBy === user.id) return true
  return STAFF.includes(String(user.role || '').toLowerCase())
}

export const PATCH = withSecureApi(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ROLE_GROUPS.ALL_AUTHENTICATED)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const id = params?.id
  if (!id) return NextResponse.json({ error: 'Project id required' }, { status: 400 })

  const existing = await prisma.innovationProject.findFirst({ where: { id, schoolId } })
  if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!canManageProject(auth.user, existing)) {
    return NextResponse.json({ error: 'You cannot edit this project' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const data = {}

  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    data.title = title
  }
  if (body.description !== undefined) {
    const description = String(body.description).trim()
    if (!description)
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    data.description = description
  }
  if (body.category !== undefined) {
    if (!PROJECT_CATEGORIES[body.category]) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    data.category = body.category
  }
  if (body.labType !== undefined) {
    if (body.labType && !LAB_TYPES[body.labType]) {
      return NextResponse.json({ error: 'Invalid lab type' }, { status: 400 })
    }
    data.labType = body.labType || null
  }
  if (body.methodology !== undefined) {
    if (body.methodology && !INNOVATION_METHODOLOGIES[body.methodology]) {
      return NextResponse.json({ error: 'Invalid methodology' }, { status: 400 })
    }
    data.methodology = body.methodology || null
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    data.status = body.status
  }
  if (Array.isArray(body.teamMembers)) {
    data.teamMembers = body.teamMembers
      .map((m) => String(m).trim())
      .filter(Boolean)
      .slice(0, 20)
  }

  try {
    const updateResult = await prisma.innovationProject.updateMany({
      where: { id, schoolId },
      data,
    })
    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const project = await prisma.innovationProject.findFirst({ where: { id, schoolId } })
    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    console.error('Innovation project update:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
})

export const DELETE = withSecureApi(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ROLE_GROUPS.ALL_AUTHENTICATED)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const id = params?.id
  if (!id) return NextResponse.json({ error: 'Project id required' }, { status: 400 })

  const existing = await prisma.innovationProject.findFirst({ where: { id, schoolId } })
  if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!canManageProject(auth.user, existing)) {
    return NextResponse.json({ error: 'You cannot delete this project' }, { status: 403 })
  }

  try {
    const deleteResult = await prisma.innovationProject.deleteMany({ where: { id, schoolId } })
    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Innovation project delete:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
})
