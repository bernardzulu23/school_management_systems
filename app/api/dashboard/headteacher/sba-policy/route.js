export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import {
  CBC_SBA_SOURCE_DOCUMENT,
  SBA_DEFAULT_STARTS_AT_LEVEL,
  SBA_ENTRY_START_YEAR,
  SBA_START_LEVEL_SOURCE,
} from '@/lib/sba/constants'

const ADMIN_ROLES = ['ADMIN', 'admin', 'headteacher', 'HOD', 'hod']

const COMPONENT_TYPES = new Set([
  'COURSEWORK',
  'PRACTICAL',
  'PROJECT',
  'ORAL',
  'PORTFOLIO',
  'TERM_TEST',
  'OTHER',
])

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const db = getTenantClient(schoolId)
  const policies = await db.sBASubjectPolicy.findMany({
    where: { schoolId },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      components: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: [{ syllabusVersion: 'asc' }, { subject: { name: 'asc' } }],
  })

  const subjects = await db.subject.findMany({
    where: {
      schoolId,
      OR: [{ educationLevel: 'secondary' }, { educationLevel: null }],
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    policies: policies.map((p) => {
      const weightsSum = p.components.reduce((s, c) => s + (Number(c.weight) || 0), 0)
      return {
        ...p,
        weightsSum,
        weightsWarn: p.components.length > 0 && Math.abs(weightsSum - 1) > 0.001,
      }
    }),
    subjects,
    meta: {
      sbaEntryStartYear: SBA_ENTRY_START_YEAR,
      defaultStartsAtLevel: SBA_DEFAULT_STARTS_AT_LEVEL,
      startLevelSource: SBA_START_LEVEL_SOURCE,
      cbcSourceDocument: CBC_SBA_SOURCE_DOCUMENT,
      phase: 'SECONDARY',
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const subjectId = String(body.subjectId || '').trim()
  const syllabusVersion = String(body.syllabusVersion || '')
    .trim()
    .toUpperCase()
  const startsAtLevel = String(body.startsAtLevel || '').trim() || SBA_DEFAULT_STARTS_AT_LEVEL
  const sourceDocument = body.sourceDocument != null ? String(body.sourceDocument) : null
  const isActive = body.isActive !== false
  const components = Array.isArray(body.components) ? body.components : []

  if (!subjectId) throw new ApiError('subjectId required', 400)
  if (syllabusVersion !== 'CBC' && syllabusVersion !== 'OLD_SYLLABUS') {
    throw new ApiError('syllabusVersion must be CBC or OLD_SYLLABUS', 400)
  }

  for (const c of components) {
    const type = String(c.componentType || '').toUpperCase()
    if (!COMPONENT_TYPES.has(type)) {
      throw new ApiError(`Invalid componentType: ${c.componentType}`, 400)
    }
  }

  const weightsSum = components.reduce((s, c) => s + (Number(c.weight) || 0), 0)
  const weightsWarn = components.length > 0 && Math.abs(weightsSum - 1) > 0.001

  const db = getTenantClient(schoolId)
  const subject = await db.subject.findFirst({ where: { id: subjectId, schoolId } })
  if (!subject) throw new ApiError('Subject not found', 404)

  const policy = await db.sBASubjectPolicy.upsert({
    where: {
      schoolId_subjectId_syllabusVersion: {
        schoolId,
        subjectId,
        syllabusVersion,
      },
    },
    update: {
      startsAtLevel,
      sourceDocument,
      isActive,
    },
    create: {
      schoolId,
      subjectId,
      syllabusVersion,
      startsAtLevel,
      sourceDocument,
      isActive,
    },
  })

  if (components.length > 0) {
    await db.sBAComponentPolicy.deleteMany({ where: { policyId: policy.id } })
    await db.sBAComponentPolicy.createMany({
      data: components.map((c, i) => ({
        schoolId,
        policyId: policy.id,
        componentType: String(c.componentType).toUpperCase(),
        maxRawMark:
          c.maxRawMark === null || c.maxRawMark === undefined || c.maxRawMark === ''
            ? null
            : Number(c.maxRawMark),
        weight: Number(c.weight) || 0,
        sortOrder: Number(c.sortOrder) || i,
        label: c.label ? String(c.label) : null,
      })),
    })
  }

  const full = await db.sBASubjectPolicy.findFirst({
    where: { id: policy.id },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      components: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return NextResponse.json({
    policy: full,
    weightsSum,
    weightsWarn,
    warning: weightsWarn
      ? 'Component weights do not sum to 1.0 — saved anyway (soft warning).'
      : null,
  })
})
