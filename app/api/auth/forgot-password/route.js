import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import crypto from 'crypto'
import { sendResetEmail } from '@/config/email'
import { rateLimiter } from '@/lib/middleware/rateLimiter'

function resolveBaseUrl(request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const originFromHeaders = host ? `${proto}://${host}` : ''

  const configured = String(process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const configuredLooksLocal = configured.includes('localhost') || configured.includes('127.0.0.1')

  // In production, never emit localhost reset links.
  if (process.env.NODE_ENV === 'production') {
    if (originFromHeaders) return originFromHeaders
    if (configured && !configuredLooksLocal) return configured
    return 'https://bluepeacktechnologies.com'
  }

  return configured || originFromHeaders || 'http://localhost:3000'
}

export async function POST(request) {
  try {
    const { email, subdomain } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const rl = rateLimiter(request, {
      limit: process.env.NODE_ENV === 'production' ? 5 : 50,
      windowMs: 15 * 60 * 1000,
      keyPrefix: 'auth_forgot_',
      keyGenerator: ({ ip }) => `${ip}-${normalizedEmail}`,
    })
    if (rl.isLimited) return rl.response

    // Resolve School
    const schoolId = await getSchoolIdFromRequest(request, subdomain)
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Find User
    const user = await prisma.user.findUnique({
      where: { schoolId_email: { schoolId, email: normalizedEmail } },
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

    const baseUrl = resolveBaseUrl(request)
    const resetLink = `${baseUrl}/reset-password/${resetToken}`

    const sent = await sendResetEmail(normalizedEmail, resetLink)
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
