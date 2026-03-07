import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import crypto from 'crypto'

export async function POST(request) {
  try {
    const { email, subdomain } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Resolve School
    const schoolId = await getSchoolIdFromRequest(request, subdomain)
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Find User
    const user = await prisma.user.findUnique({
      where: { schoolId_email: { schoolId, email } },
    })

    if (!user) {
      // Return success even if user not found to prevent enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a reset link has been sent.',
      })
    }

    // Generate Token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Save to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // MOCK EMAIL SENDING
    const resetLink = `${request.headers.get('origin')}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    console.log('=================================================================')
    console.log('PASSWORD RESET LINK (Dev Mode):')
    console.log(resetLink)
    console.log('=================================================================')

    // In production, use your email service here (e.g. Resend, SendGrid)
    // await sendEmail({ to: email, subject: 'Reset Password', text: resetLink })

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
      devToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
