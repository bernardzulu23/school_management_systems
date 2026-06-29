export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { mapGameForManagement } from '@/lib/games/mapGameResponse'
import { normalizeGameContent, resolveSubjectLabel } from '@/lib/games/normalizeGameBody'
import { safeQueryString } from '@/lib/security/safeQueryValue'

/**
 * GET /api/games — list school games (teacher/HOD/admin)
 * POST /api/games — create quiz game
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const subject = safeQueryString(searchParams.get('subject'))

  const games = await prisma.game.findMany({
    where: {
      schoolId,
      ...(subject ? { subject: { equals: subject, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const withStats = await Promise.all(
    games.map(async (g) => {
      const stats = await prisma.studentGame.aggregate({
        where: { schoolId, gameId: g.id },
        _count: { id: true },
        _avg: { score: true },
      })
      return mapGameForManagement(g, {
        playCount: stats._count.id,
        averageScore: Math.round(stats._avg.score || 0),
      })
    })
  )

  return NextResponse.json({ success: true, data: withStats })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim() || null
  const subject = resolveSubjectLabel(body) || null
  const gameType = String(body.gameType || body.type || 'quiz').trim()
  const difficulty = String(body.difficulty || 'medium').trim()
  const content = normalizeGameContent(body)

  if (!title) throw new ApiError('Title is required', 400)
  if (gameType !== 'quiz') {
    throw new ApiError('Only quiz games are supported in the player today', 400)
  }
  if (!Array.isArray(content.questions) || content.questions.length === 0) {
    throw new ApiError('At least one question is required', 400)
  }

  const game = await prisma.game.create({
    data: {
      title,
      description,
      type: gameType,
      subject,
      difficulty,
      content,
      schoolId,
    },
  })

  return NextResponse.json(
    { success: true, data: mapGameForManagement(game, { playCount: 0, averageScore: 0 }) },
    { status: 201 }
  )
})
