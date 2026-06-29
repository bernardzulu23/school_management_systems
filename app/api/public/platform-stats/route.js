import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const dynamic = 'force-dynamic'

const EMPTY_STATS = {
  activeSchools: 0,
  totalStudents: 0,
  totalTeachers: 0,
  totalResults: 0,
  updatedAt: new Date().toISOString(),
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
    const counts = await withTimeout(
      Promise.all([
        prisma.school.count({ where: { active: true } }),
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.result.count(),
      ]),
      4000
    )

    const [activeSchools, totalStudents, totalTeachers, totalResults] = counts

    return NextResponse.json({
      success: true,
      stats: {
        activeSchools,
        totalStudents,
        totalTeachers,
        totalResults,
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
