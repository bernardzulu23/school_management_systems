export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { mapGameForManagement } from '@/lib/games/mapGameResponse'
import { normalizeGameContent, resolveSubjectLabel } from '@/lib/games/normalizeGameBody'

async function loadGame(id, schoolId) {
  const game = await prisma.game.findFirst({ where: { id, schoolId } })
  if (!game) throw new ApiError('Game not found', 404)
  return game
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const game = await loadGame(String(routeParams.id), schoolId)
  const stats = await prisma.studentGame.aggregate({
    where: { schoolId, gameId: game.id },
    _count: { id: true },
    _avg: { score: true },
  })

  return NextResponse.json({
    success: true,
    data: mapGameForManagement(game, {
      playCount: stats._count.id,
      averageScore: Math.round(stats._avg.score || 0),
    }),
  })
})

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const existing = await loadGame(String(routeParams.id), schoolId)
  const body = await request.json().catch(() => ({}))
  const prevContent =
    existing.content && typeof existing.content === 'object' ? existing.content : {}

  const gameType = String(body.gameType || body.type || existing.type).trim()
  if (gameType !== 'quiz') {
    throw new ApiError('Only quiz games are supported in the player today', 400)
  }

  const nextContent = normalizeGameContent(body, prevContent)
  if (body.content && (!Array.isArray(nextContent.questions) || !nextContent.questions.length)) {
    throw new ApiError('At least one question is required', 400)
  }

  const subjectLabel = body.subject != null ? resolveSubjectLabel(body) : undefined

  const game = await prisma.game.update({
    where: { id: existing.id },
    data: {
      title: body.title != null ? String(body.title).trim() : undefined,
      description: body.description != null ? String(body.description).trim() : undefined,
      type: gameType,
      subject: subjectLabel,
      difficulty: body.difficulty != null ? String(body.difficulty).trim() : undefined,
      content: nextContent,
    },
  })

  const stats = await prisma.studentGame.aggregate({
    where: { schoolId, gameId: game.id },
    _count: { id: true },
    _avg: { score: true },
  })

  return NextResponse.json({
    success: true,
    data: mapGameForManagement(game, {
      playCount: stats._count.id,
      averageScore: Math.round(stats._avg.score || 0),
    }),
  })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const existing = await loadGame(String(routeParams.id), schoolId)
  await prisma.game.delete({ where: { id: existing.id } })

  return NextResponse.json({ success: true })
})
