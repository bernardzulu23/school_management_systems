export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { CompleteGameSchema } from '@/lib/schemas'

/**
 * POST /api/dashboard/student/games/complete
 * Records a finished game for the student and updates their gamification
 * profile (XP, points, level). This is the write path that makes the
 * gamification widgets on the student dashboard show real data.
 */
export async function POST(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden: Student access only' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const { data: body, error: validationError } = await validateBody(request, CompleteGameSchema)
    if (validationError) return validationError

    const gameId = body.gameId
    const percentage = Math.max(0, Math.min(100, Math.round(body.percentage)))

    const game = await prisma.game.findFirst({
      where: { id: gameId, schoolId },
      select: { id: true, content: true },
    })
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    // Points reward scales with how well the student did.
    const baseReward = Number(game.content?.pointsReward) || 10
    const pointsEarned = Math.max(1, Math.round((baseReward * percentage) / 100))

    await prisma.studentGame.create({
      data: {
        studentId: student.id,
        gameId: game.id,
        schoolId,
        score: percentage,
        completed: true,
      },
    })

    let profile = await prisma.gamificationProfile.findUnique({
      where: { studentId: student.id },
    })
    if (!profile) {
      profile = await prisma.gamificationProfile.create({
        data: { studentId: student.id, schoolId, points: 0, level: 1, xp: 0, nextLevelXp: 100 },
      })
    }

    // Accumulate XP and level up while there is enough XP for the next level.
    let xp = (profile.xp || 0) + pointsEarned
    let level = profile.level || 1
    let nextLevelXp = profile.nextLevelXp || 100
    let leveledUp = false
    while (xp >= nextLevelXp) {
      xp -= nextLevelXp
      level += 1
      nextLevelXp = Math.round(nextLevelXp * 1.5)
      leveledUp = true
    }

    const updated = await prisma.gamificationProfile.update({
      where: { studentId: student.id },
      data: {
        points: (profile.points || 0) + pointsEarned,
        xp,
        level,
        nextLevelXp,
      },
    })

    return NextResponse.json({
      data: {
        pointsEarned,
        leveledUp,
        profile: {
          points: updated.points,
          level: updated.level,
          xp: updated.xp,
          nextLevelXp: updated.nextLevelXp,
        },
      },
    })
  } catch (error) {
    console.error('Error recording game completion:', error)
    return NextResponse.json({ error: 'Failed to record game result' }, { status: 500 })
  }
}
