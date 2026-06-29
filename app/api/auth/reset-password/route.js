export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { resolvePublicSchoolId } from '@/lib/tenant/resolveSchoolId'
import {
  buildPasswordResetConfirmationSmsMessage,
  getBaseUrlFromRequest,
  normalizePhoneNumbers,
  pushSmsLog,
  sendAfricasTalkingSms,
} from '@/lib/sms'
import { passwordPolicyError } from '@/lib/security/passwordPolicy'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { revokeAllUserRefreshTokens } from '@/lib/auth/sessionRevocation'

export const POST = withSecureApi(async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = String(body?.token || '')
    const email = body?.email ? String(body.email).toLowerCase() : null
    const newPassword = String(body?.newPassword || body?.password || '')
    const confirmPassword = String(body?.confirmPassword || body?.confirm || body?.password || '')

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    const policyError = passwordPolicyError(newPassword)
    if (policyError) {
      return NextResponse.json({ error: policyError, code: 'WEAK_PASSWORD' }, { status: 400 })
    }

    const schoolId = await resolvePublicSchoolId(request)

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const user = await prisma.user.findFirst({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(email ? { email } : {}),
        resetToken: resetTokenHash,
        resetTokenExpiry: { gt: new Date() },
      },
      select: { id: true, contact_number: true, schoolId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update User
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    await revokeAllUserRefreshTokens(user.id).catch(() => {})

    try {
      const recipients = normalizePhoneNumbers(user?.contact_number)
      if (recipients.length > 0) {
        const appUrl = getBaseUrlFromRequest(request)
        const supportUrl = appUrl ? `${appUrl}/forgot-password` : ''
        const message = buildPasswordResetConfirmationSmsMessage({ appUrl, supportUrl })
        const sent = await sendAfricasTalkingSms({ to: recipients, message })
        pushSmsLog({
          direction: 'out',
          schoolId: user.schoolId || null,
          to: sent.recipients,
          message,
          event: 'password_reset_confirmation',
          userId: user.id,
        })
      }
    } catch {}

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
