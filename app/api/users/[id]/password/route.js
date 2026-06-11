import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { passwordPolicyError } from '@/lib/security/passwordPolicy'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const POST = withSecureApi(async function POST(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()
  const newPassword = String(body.newPassword || '')
  const policyError = passwordPolicyError(newPassword)
  if (policyError) {
    return NextResponse.json({ error: policyError, code: 'WEAK_PASSWORD' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id: routeParams.id, schoolId },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ success: true })
})
