import { NextResponse } from 'next/server'
import { sendPublicEnquiryEmail } from '@/config/email'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const dynamic = 'force-dynamic'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export const POST = withSecureHandler(async function POST(request) {
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 8 : 40,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'public_contact_',
  })
  if (rl.isLimited) return rl.response

  const body = await request.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim()
  const message = String(body?.message || '').trim()
  const phone = String(body?.phone || '').trim()

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const sent = await sendPublicEnquiryEmail({ name, email, message, phone })
  if (!sent) {
    return NextResponse.json(
      { error: 'Could not send your message. Please email us directly.' },
      { status: 503 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Thank you. We will respond from info@bluepeacktechnologies.com shortly.',
  })
})
