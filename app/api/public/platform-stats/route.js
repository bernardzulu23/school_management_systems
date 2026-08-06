import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const dynamic = 'force-dynamic'

/**
 * Public marketing KPIs only.
 * Never query Student / Teacher / Result (exact platform-wide counts are tenant telemetry).
 * Optional MARKETING_PUBLIC_* env values are display-only approximations for the homepage.
 */
const EMPTY_STATS = {
  activeSchools: 0,
  totalStudents: 0,
  totalTeachers: 0,
  totalResults: 0,
  approximate: true,
  updatedAt: new Date().toISOString(),
}

function marketingInt(envKey) {
  const n = Number.parseInt(String(process.env[envKey] || ''), 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms)
    }),
  ])
}

export const GET = withSecureHandler(async function GET() {
  try {
    // School is a platform-level table — active school count is OK for marketing.
    const activeSchools = await withTimeout(prisma.school.count({ where: { active: true } }), 4000)

    return NextResponse.json({
      success: true,
      stats: {
        activeSchools,
        totalStudents: marketingInt('MARKETING_PUBLIC_STUDENTS'),
        totalTeachers: marketingInt('MARKETING_PUBLIC_TEACHERS'),
        totalResults: marketingInt('MARKETING_PUBLIC_RESULTS'),
        approximate: true,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      stats: EMPTY_STATS,
    })
  }
})
