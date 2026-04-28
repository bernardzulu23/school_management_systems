export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import {
  buildPasswordResetConfirmationSmsMessage,
  getBaseUrlFromRequest,
  normalizePhoneNumbers,
  pushSmsLog,
  sendAfricasTalkingSms,
} from '@/lib/sms'

export async function POST(request) {
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

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const schoolId = await getSchoolIdFromRequest(request)

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
}
