export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { PROJECT_CATEGORIES, LAB_TYPES, INNOVATION_METHODOLOGIES } from '@/lib/innovation/constants'

const VALID_STATUSES = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED']

function validateProjectBody(body, partial = false) {
  const errors = []
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim()
    if (!title) errors.push('Title is required')
    if (title.length > 200) errors.push('Title must be 200 characters or fewer')
  }
  if (!partial || body.description !== undefined) {
    const description = String(body.description || '').trim()
    if (!description) errors.push('Description is required')
  }
  if (!partial || body.category !== undefined) {
    if (!PROJECT_CATEGORIES[body.category]) errors.push('Invalid project category')
  }
  if (body.labType != null && body.labType !== '' && !LAB_TYPES[body.labType]) {
    errors.push('Invalid lab type')
  }
  if (
    body.methodology != null &&
    body.methodology !== '' &&
    !INNOVATION_METHODOLOGIES[body.methodology]
  ) {
    errors.push('Invalid methodology')
  }
  if (body.status != null && !VALID_STATUSES.includes(body.status)) {
    errors.push('Invalid status')
  }
  return errors
}

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ROLE_GROUPS.ALL_AUTHENTICATED)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const mine = searchParams.get('mine') === 'true'

  try {
    const projects = await prisma.innovationProject.findMany({
      where: {
        schoolId,
        ...(mine ? { createdBy: auth.user.id } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    const summary = {
      total: projects.length,
      inProgress: projects.filter((p) => p.status === 'IN_PROGRESS').length,
      completed: projects.filter((p) => p.status === 'COMPLETED').length,
      mine: projects.filter((p) => p.createdBy === auth.user.id).length,
    }

    return NextResponse.json({ success: true, data: projects, summary })
  } catch (error) {
    console.error('Innovation projects list:', error)
    const code = String(error?.code || '')
    const hint =
      code === 'P2021' || /does not exist/i.test(String(error?.message))
        ? 'Database schema is out of date. Run: npx prisma migrate deploy'
        : 'Failed to load innovation projects'
    return NextResponse.json({ error: hint, code: code || undefined }, { status: 500 })
  }
})

export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ROLE_GROUPS.ALL_AUTHENTICATED)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const errors = validateProjectBody(body)
  if (errors.length) return NextResponse.json({ error: errors.join('. ') }, { status: 400 })

  const teamMembers = Array.isArray(body.teamMembers)
    ? body.teamMembers
        .map((m) => String(m).trim())
        .filter(Boolean)
        .slice(0, 20)
    : []

  try {
    const project = await prisma.innovationProject.create({
      data: {
        schoolId,
        title: String(body.title).trim(),
        description: String(body.description).trim(),
        category: body.category,
        labType: body.labType ? String(body.labType) : null,
        methodology: body.methodology ? String(body.methodology) : null,
        status: 'DRAFT',
        createdBy: auth.user.id,
        teamMembers,
      },
    })
    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    console.error('Innovation project create:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
})
