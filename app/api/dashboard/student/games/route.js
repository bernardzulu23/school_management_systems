export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { computePlayStreak } from '@/lib/games/awardBadges'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
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
    select: { id: true, name: true, class: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // 1. Get Gamification Profile (Progress)
  let gamificationProfile = await prisma.gamificationProfile.findUnique({
    where: { studentId: student.id },
    include: {
      badges: {
        include: {
          badge: true,
        },
      },
    },
  })

  if (!gamificationProfile) {
    // Create if missing (should be seeded, but safe fallback)
    gamificationProfile = await prisma.gamificationProfile.create({
      data: {
        studentId: student.id,
        schoolId,
        points: 0,
        level: 1,
        xp: 0,
        nextLevelXp: 100,
      },
    })
  }

  // 2. Get Available Games with Stats
  const availableGamesRaw = await prisma.game.findMany({
    where: { schoolId },
    take: 10,
    orderBy: { createdAt: 'desc' },
  })

  const availableGames = await Promise.all(
    availableGamesRaw.map(async (g) => {
      const stats = await prisma.studentGame.aggregate({
        where: { schoolId, gameId: g.id },
        _count: { id: true },
        _avg: { score: true },
      })

      return {
        ...g,
        playCount: stats._count.id,
        averageScore: Math.round(stats._avg.score || 0),
      }
    })
  )

  // 3. Get Recent Sessions
  const recentSessions = await prisma.studentGame.findMany({
    where: { schoolId, studentId: student.id },
    take: 5,
    orderBy: { playedAt: 'desc' },
    include: {
      game: true,
    },
  })

  // 4. Get Leaderboard (Top 5 Students by Points)
  const allPlayedDates = await prisma.studentGame.findMany({
    where: { schoolId, studentId: student.id },
    select: { playedAt: true },
    orderBy: { playedAt: 'desc' },
  })
  const streak = computePlayStreak(allPlayedDates.map((r) => r.playedAt))

  const leaderboardData = await prisma.gamificationProfile.findMany({
    where: { schoolId },
    take: 5,
    orderBy: { points: 'desc' },
    include: {
      student: {
        select: { name: true },
      },
    },
  })

  const leaderboard = await Promise.all(
    leaderboardData.map(async (profile, index) => {
      const gamesPlayed = await prisma.studentGame.count({
        where: { schoolId, studentId: profile.studentId },
      })
      return {
        rank: index + 1,
        studentName: profile.student.name,
        totalPoints: profile.points,
        gamesPlayed,
      }
    })
  )

  // Add current user to leaderboard if not present (optional)
  // Calculate rank for current user
  const rankCount = await prisma.gamificationProfile.count({
    where: { schoolId, points: { gt: gamificationProfile.points } },
  })
  const userRank = rankCount + 1

  // Calculate progress percentage
  // Assuming linear progression if previous level bound is unknown,
  // or we can just show progress towards total XP target
  const progressPercentage =
    gamificationProfile.nextLevelXp > 0
      ? Math.min(100, Math.round((gamificationProfile.xp / gamificationProfile.nextLevelXp) * 100))
      : 0

  // Format Response
  const data = {
    availableGames: availableGames.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      subject: { name: g.subject },
      gameType: g.type,
      difficulty: g.difficulty,
      pointsReward: g.content?.pointsReward || 10,
      timeLimit: g.content?.timeLimit || 0,
      // GamePlayer reads game.content.questions to render and grade the quiz.
      content: g.content || { questions: [] },
      playCount: g.playCount,
      averageScore: g.averageScore,
    })),
    studentProgress: {
      totalPoints: gamificationProfile.points,
      level: gamificationProfile.level,
      experiencePoints: gamificationProfile.xp,
      nextLevelXP: gamificationProfile.nextLevelXp,
      progressPercentage,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      gamesPlayed: await prisma.studentGame.count({ where: { schoolId, studentId: student.id } }),
      averageScore: 0, // Calculate below
      rank: { class: userRank, school: userRank },
    },
    achievements: (gamificationProfile.badges || []).map((sb) => ({
      id: sb.badge.id,
      name: sb.badge.name,
      description: sb.badge.description,
      icon: sb.badge.icon,
      rarity: sb.badge.rarity,
      earnedAt: sb.awardedAt,
      pointsReward: sb.badge.xpValue,
    })),
    recentSessions: recentSessions.map((s) => {
      const baseReward = Number(s.game.content?.pointsReward) || 10
      const pointsEarned = Math.max(1, Math.round((baseReward * s.score) / 100))
      return {
        id: s.id,
        game: { title: s.game.title, gameType: s.game.type },
        score: s.score,
        percentage: s.score,
        pointsEarned,
        completedAt: s.playedAt,
      }
    }),
    leaderboard: leaderboard,
  }

  // Calculate average score
  const avgScore = await prisma.studentGame.aggregate({
    where: { schoolId, studentId: student.id },
    _avg: { score: true },
  })
  data.studentProgress.averageScore = Math.round(avgScore._avg.score || 0)

  return NextResponse.json({ success: true, data })
})
