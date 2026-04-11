import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { sendWelcomeEmail } from '@/config/email'

const RESERVED = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'smtp',
  'dashboard',
  'login',
  'register',
  'register-school',
  'billing',
  'support',
  'help',
  'demo',
  'test',
  'staging',
  'bluepeack',
  'bluepeacktechnologies',
])

function normalizeSubdomain(input) {
  const raw = String(input || '')
    .trim()
    .toLowerCase()
  const cleaned = raw.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
  const trimmed = cleaned.replace(/^-+/, '').replace(/-+$/, '')
  return trimmed.slice(0, 40)
}

function getBaseDomain(host) {
  const hostName = String(host || '')
    .split(':')[0]
    .toLowerCase()
  if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return null
  const parts = hostName.split('.').filter(Boolean)
  if (parts.length < 2) return null
  return parts.slice(-2).join('.')
}

export async function POST(request) {
  const rate = rateLimiter(request, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'rl_school_register_',
  })
  if (rate.isLimited) return rate.response

  try {
    const body = await request.json().catch(() => ({}))
    const schoolName = String(body.schoolName || body.name || '').trim()
    const adminName = String(body.adminName || '').trim()
    const adminEmail = String(body.adminEmail || '')
      .trim()
      .toLowerCase()
    const adminPassword = String(body.adminPassword || '')
    const phone = String(body.phone || '').trim() || null
    const address = String(body.address || '').trim() || null
    const province = String(body.province || '').trim() || null
    const email = String(body.schoolEmail || body.email || '').trim() || null

    const subdomain = normalizeSubdomain(body.subdomain)

    if (!schoolName) {
      return NextResponse.json(
        { success: false, error: 'School name is required' },
        { status: 400 }
      )
    }
    if (!adminName) {
      return NextResponse.json({ success: false, error: 'Admin name is required' }, { status: 400 })
    }
    if (!adminEmail || !adminEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Admin email is required' },
        { status: 400 }
      )
    }
    if (!adminPassword || adminPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    if (!subdomain || subdomain.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Subdomain must be at least 3 characters' },
        { status: 400 }
      )
    }
    if (RESERVED.has(subdomain)) {
      return NextResponse.json({ success: false, error: 'Subdomain is reserved' }, { status: 409 })
    }
    if (!/^[a-z0-9-]{3,40}$/.test(subdomain)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subdomain must be 3-40 lowercase letters, numbers, and hyphens only',
        },
        { status: 400 }
      )
    }

    const existing = await prisma.school.findFirst({
      where: { subdomain: { equals: subdomain, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Subdomain already taken' },
        { status: 409 }
      )
    }

    const host = request.headers.get('host') || ''
    const baseDomain =
      process.env.APP_BASE_DOMAIN || getBaseDomain(host) || 'bluepeacktechnologies.com'
    const loginUrl = `https://${subdomain}.${baseDomain}/login?welcome=true`

    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const created = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          subdomain,
          domain: `${subdomain}.${baseDomain}`,
          email,
          phone,
          address: [address, province].filter(Boolean).join(', ') || null,
          active: true,
        },
        select: { id: true, name: true, subdomain: true },
      })

      await tx.user.create({
        data: {
          schoolId: school.id,
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'headteacher',
          contact_number: phone,
        },
        select: { id: true },
      })

      return school
    })

    await sendWelcomeEmail({
      to: adminEmail,
      schoolName: created.name,
      subdomain: created.subdomain,
      loginUrl,
    })

    return NextResponse.json({ success: true, loginUrl })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 })
  }
}
