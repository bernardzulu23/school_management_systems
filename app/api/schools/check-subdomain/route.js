export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withSecureHandler } from '@/lib/middleware/secureApi'

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

export const GET = withSecureHandler(async function GET(request) {
  const rate = rateLimiter(request, {
    limit: 200,
    windowMs: 10 * 60 * 1000,
    keyPrefix: 'rl_subdomain_',
  })
  if (rate.isLimited) return rate.response

  const { searchParams } = new URL(request.url)
  const subdomain = normalizeSubdomain(searchParams.get('subdomain'))

  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json({ available: false, reason: 'Too short' })
  }
  if (RESERVED.has(subdomain)) {
    return NextResponse.json({ available: false, reason: 'Reserved' })
  }

  const existing = await prisma.school.findFirst({
    where: { subdomain: { equals: subdomain, mode: 'insensitive' } },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing, reason: existing ? 'Taken' : 'Available' })
})
