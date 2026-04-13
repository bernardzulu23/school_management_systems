import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import crypto from 'crypto'
import { sendSchoolVerificationEmail } from '@/config/email'

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
  'superadmin',
  'root',
  'system',
  'null',
  'undefined',
  'ftp',
  'ssh',
  'vpn',
  'dev',
  'zsms',
  'zms',
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
    limit: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'rl_school_register_',
  })
  if (rate.isLimited) return rate.response

  try {
    // ✅ IMPROVED CORS CHECK
    const origin = request.headers.get('origin')
    if (process.env.NODE_ENV === 'production' && origin) {
      // Allow bluepeacktechnologies.com and all subdomains
      const isAllowed =
        origin === 'https://bluepeacktechnologies.com' ||
        origin === 'https://www.bluepeacktechnologies.com' ||
        /^https:\/\/[a-z0-9-]+\.bluepeacktechnologies\.com$/.test(origin)

      if (!isAllowed) {
        console.warn(`⚠️ CORS blocked origin: ${origin}`)
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    // Allow localhost in development
    if (process.env.NODE_ENV !== 'production' && origin) {
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        console.warn(`⚠️ Dev CORS warning: ${origin}`)
      }
    }

    const body = await request.json().catch(() => ({}))
    const schoolName = String(body.schoolName || body.name || '').trim()
    const adminName = String(body.adminName || '').trim()
    const adminEmail = String(body.adminEmail || '')
      .trim()
      .toLowerCase()
    const adminPassword = String(body.adminPassword || '')
    const phoneRaw = String(body.phone || '').trim()
    const phone = phoneRaw || null
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
    if (
      !/[A-Z]/.test(adminPassword) ||
      !/[a-z]/.test(adminPassword) ||
      !/[0-9]/.test(adminPassword)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must include uppercase, lowercase, and a number',
        },
        { status: 400 }
      )
    }
    if (phoneRaw) {
      const cleaned = phoneRaw.replace(/\s/g, '')
      const zambianRegex = /^(\+260|0)(9[567]\d{7})$/
      if (!zambianRegex.test(cleaned)) {
        return NextResponse.json(
          { success: false, error: 'Invalid Zambian phone number' },
          { status: 400 }
        )
      }
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
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const verifyUrl = `https://${baseDomain}/api/schools/verify/${verificationToken}`

    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    console.log(`📝 Creating school: ${schoolName} (${subdomain})`)
    console.log(`👤 Admin email: ${adminEmail}`)

    const created = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          subdomain,
          domain: `${subdomain}.${baseDomain}`,
          email,
          phone,
          address: [address, province].filter(Boolean).join(', ') || null,
          active: false,
          emailVerified: false,
          verificationToken,
          verificationExpiry,
        },
        select: { id: true, name: true, subdomain: true },
      })

      console.log(`✅ School created: ${school.id}`)

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

      console.log(`✅ Admin user created`)

      return school
    })

    console.log(`📧 Sending verification email to: ${adminEmail}`)
    const emailSent = await sendSchoolVerificationEmail({
      to: adminEmail,
      schoolName: created.name,
      subdomain: created.subdomain,
      verifyUrl,
    })
    if (!emailSent) {
      console.error(`❌ Failed to send verification email to ${adminEmail}`)
    } else {
      console.log(`✅ Verification email sent`)
    }

    return NextResponse.json({ success: true, requiresVerification: true })
  } catch (error) {
    console.error(`❌ Registration error:`, error)
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 })
  }
}
