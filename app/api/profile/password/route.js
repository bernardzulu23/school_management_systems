export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { passwordPolicyError } from '@/lib/security/passwordPolicy'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const PUT = withSecureApi(async function PUT(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()
  const currentPassword = String(body?.currentPassword || '')
  const newPassword = String(body?.newPassword || '')

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current password and new password are required' },
      { status: 400 }
    )
  }

  const policyError = passwordPolicyError(newPassword)
  if (policyError) {
    return NextResponse.json({ error: policyError, code: 'WEAK_PASSWORD' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id: auth.user.id, schoolId },
    select: { id: true, password: true },
  })

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ok = await bcrypt.compare(currentPassword, user.password)
  if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  return NextResponse.json({ success: true })
})
