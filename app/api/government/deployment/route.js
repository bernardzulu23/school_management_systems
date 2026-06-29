export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute } from '@/lib/government/routeAuth'
import { listDeployments, patchDeployment, upsertDeployment } from '@/lib/government/deployment'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withSecureHandler(async function GET(request) {
  const access = await authorizeGovernmentRoute(request, 'teacher-deployment')
  if (!access.ok) return access.response

  const deployments = await listDeployments(access.schoolId)
  return NextResponse.json({ success: true, data: deployments })
})

export const POST = withSecureHandler(async function POST(request) {
  const access = await authorizeGovernmentRoute(request, 'teacher-deployment')
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const teacherId = safeStringId(body.teacherId)
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
  }

  const deployment = await upsertDeployment(access.schoolId, { ...body, teacherId })
  if (!deployment) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, deployment }, { status: 201 })
})

export const PATCH = withSecureHandler(async function PATCH(request) {
  const access = await authorizeGovernmentRoute(request, 'teacher-deployment')
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const teacherId = safeStringId(body.teacherId)
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
  }

  const deployment = await patchDeployment(access.schoolId, teacherId, body)
  if (!deployment) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, deployment })
})
