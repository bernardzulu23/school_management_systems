import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
  try {
    // For demo, we use the first student found if no auth (or hardcoded email)
    // In production, use session/auth
    // const session = await getSession()
    // const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
    
    // Fallback for demo
    let student = await prisma.student.findFirst({
      where: { user: { email: 'student@school.com' } }
    })

    if (!student) {
      // Try any student
      student = await prisma.student.findFirst()
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // 1. Get Gamification Profile (Progress)
    let gamificationProfile = await prisma.gamificationProfile.findUnique({
      where: { studentId: student.id },
      include: {
        badges: {
          include: {
            badge: true
          }
        }
      }
    })

    if (!gamificationProfile) {
      // Create if missing (should be seeded, but safe fallback)
      gamificationProfile = await prisma.gamificationProfile.create({
        data: {
          studentId: student.id,
          points: 0,
          level: 1,
          xp: 0,
          nextLevelXp: 100
        }
      })
    }

    // 2. Get Available Games with Stats
    const availableGamesRaw = await prisma.game.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    const availableGames = await Promise.all(availableGamesRaw.map(async (g) => {
      const stats = await prisma.studentGame.aggregate({
        where: { gameId: g.id },
        _count: { id: true },
        _avg: { score: true }
      })
      
      return {
        ...g,
        playCount: stats._count.id,
        averageScore: Math.round(stats._avg.score || 0)
      }
    }))

    // 3. Get Recent Sessions
    const recentSessions = await prisma.studentGame.findMany({
      where: { studentId: student.id },
      take: 5,
      orderBy: { playedAt: 'desc' },
      include: {
        game: true
      }
    })

    // 4. Get Leaderboard (Top 5 Students by Points)
    const leaderboardData = await prisma.gamificationProfile.findMany({
      take: 5,
      orderBy: { points: 'desc' },
      include: {
        student: {
          select: { name: true }
        }
      }
    })

    const leaderboard = leaderboardData.map((profile, index) => ({
      rank: index + 1,
      studentName: profile.student.name,
      totalPoints: profile.points,
      gamesPlayed: 0 // We'd need to count StudentGames for this, simplifying for now
    }))
    
    // Add current user to leaderboard if not present (optional)
    // Calculate rank for current user
    const rankCount = await prisma.gamificationProfile.count({
      where: { points: { gt: gamificationProfile.points } }
    })
    const userRank = rankCount + 1

    // Calculate progress percentage
    // Assuming linear progression if previous level bound is unknown, 
    // or we can just show progress towards total XP target
    const progressPercentage = gamificationProfile.nextLevelXp > 0 
      ? Math.min(100, Math.round((gamificationProfile.xp / gamificationProfile.nextLevelXp) * 100))
      : 0

    // Format Response
    const data = {
      availableGames: availableGames.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        subject: { name: g.subject },
        gameType: g.type,
        difficulty: g.difficulty,
        pointsReward: g.content?.pointsReward || 10,
        timeLimit: g.content?.timeLimit || 0,
        playCount: g.playCount, 
        averageScore: g.averageScore
      })),
      studentProgress: {
        totalPoints: gamificationProfile.points,
        level: gamificationProfile.level,
        experiencePoints: gamificationProfile.xp,
        nextLevelXP: gamificationProfile.nextLevelXp,
        progressPercentage,
        currentStreak: 1, // Need to track streaks in DB
        longestStreak: 1,
        gamesPlayed: await prisma.studentGame.count({ where: { studentId: student.id } }),
        averageScore: 0, // Calculate below
        rank: { class: userRank, school: userRank }
      },
      achievements: (gamificationProfile.badges || []).map(sb => ({
        id: sb.badge.id,
        name: sb.badge.name,
        description: sb.badge.description,
        icon: sb.badge.icon,
        rarity: sb.badge.rarity,
        earnedAt: sb.awardedAt,
        pointsReward: sb.badge.xpValue
      })),
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        game: { title: s.game.title, gameType: s.game.type },
        score: s.score,
        percentage: s.score, // Assuming score is percentage
        pointsEarned: 10, // Logic needed
        completedAt: s.playedAt
      })),
      leaderboard: leaderboard
    }

    // Calculate average score
    const avgScore = await prisma.studentGame.aggregate({
      where: { studentId: student.id },
      _avg: { score: true }
    })
    data.studentProgress.averageScore = Math.round(avgScore._avg.score || 0)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching student game dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch game dashboard' }, { status: 500 })
  }
}
