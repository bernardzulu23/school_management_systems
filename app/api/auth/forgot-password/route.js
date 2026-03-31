import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import crypto from 'crypto'
import { sendResetEmail } from '@/config/email'

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
      where: { schoolId_email: { schoolId, email: String(email).toLowerCase() } },
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
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Save to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    })

    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const originFromHeaders = host ? `${proto}://${host}` : request.headers.get('origin')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || originFromHeaders
    const resetLink = `${baseUrl}/reset-password/${resetToken}`

    const sent = await sendResetEmail(String(email).toLowerCase(), resetLink)
    if (!sent) {
      console.log('[forgot-password] Email send failed. Reset URL:', resetLink)
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
