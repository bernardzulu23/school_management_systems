export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { checkStudentCap } from '@/lib/middleware/individual-gate'
import { generateIndividualSubdomain } from '@/lib/onboarding/individual'

const RESERVED = new Set([
  'www',
  'admin',
  'api',
  'dashboard',
  'app',
  'login',
  'register',
  'onboarding',
  'join',
])

function isValidEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const POST = withErrorHandler(async function POST(request) {
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 20 : 100,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'onboarding_student_',
    keyGenerator: ({ ip }) => `${ip}`,
  })
  if (rl.isLimited) return rl.response

  const body = await request.json().catch(() => ({}))
  const email = String(body?.email || '')
    .trim()
    .toLowerCase()
  const password = String(body?.password || '')
  const name = String(body?.name || '').trim()
  const enrollmentCode = String(body?.enrollmentCode || '')
    .trim()
    .toUpperCase()

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  let targetSchoolId = null
  let teacherName = null

  if (enrollmentCode) {
    const school = await prisma.school.findUnique({
      where: { enrollmentCode },
      select: { id: true, schoolType: true, name: true, ownerUserId: true },
    })
    if (!school || school.schoolType !== 'INDIVIDUAL') {
      return NextResponse.json({ error: 'Invalid enrollment code' }, { status: 400 })
    }
    const capCheck = await checkStudentCap(school.id)
    if (!capCheck.allowed) return capCheck.response
    targetSchoolId = school.id
    if (school.ownerUserId) {
      const owner = await prisma.user.findUnique({
        where: { id: school.ownerUserId },
        select: { name: true },
      })
      teacherName = owner?.name || school.name
    }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const baseDomain = String(
    process.env.BASE_DOMAIN || process.env.COOKIE_DOMAIN || 'bluepeacktechnologies.com'
  )
    .trim()
    .replace(/^\./, '')

  const user = await prisma.$transaction(async (tx) => {
    if (!targetSchoolId) {
      const subdomain = await generateIndividualSubdomain('student', prisma, RESERVED)
      const soloSchool = await tx.school.create({
        data: {
          name: `${name}'s Study Space`,
          subdomain,
          domain: `${subdomain}.${baseDomain}`,
          email,
          plan: 'student_free',
          level: 'secondary',
          province: 'Lusaka',
          district: 'Lusaka',
          reportingStreamKey: 'lusaka/lusaka',
          active: true,
          emailVerified: true,
          schoolType: 'INDIVIDUAL',
        },
      })
      targetSchoolId = soloSchool.id
    }

    return tx.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: 'student',
        schoolId: targetSchoolId,
      },
      select: { id: true, email: true, name: true, role: true, schoolId: true },
    })
  })

  return NextResponse.json(
    {
      success: true,
      user,
      enrolledUnderTeacher: Boolean(enrollmentCode),
      teacherName,
      redirectUrl: '/dashboard/student',
    },
    { status: 201 }
  )
})
