export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { passwordPolicyError } from '@/lib/security/passwordPolicy'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { revokeAllUserRefreshTokens } from '@/lib/auth/sessionRevocation'

export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (
    !roleCheck(auth.user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'STUDENT',
      'student',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json()
  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')
  const confirmPassword = String(body.confirmPassword || '')

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 })
  }
  const policyError = passwordPolicyError(newPassword)
  if (policyError) {
    return NextResponse.json({ error: policyError, code: 'WEAK_PASSWORD' }, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id: auth.user.id, schoolId },
    select: { id: true, password: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const ok = await bcrypt.compare(currentPassword, user.password)
  if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.updateMany({
    where: { id: user.id, schoolId },
    data: { password: hashed },
  })

  await revokeAllUserRefreshTokens(user.id).catch(() => {})

  return NextResponse.json({ success: true })
})
