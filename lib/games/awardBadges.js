import prisma from '@/lib/prisma'

/**
 * Award starter badges after a game completion when criteria match.
 * @param {{ schoolId: string, studentId: string, profileId: string, percentage: number, profile: { points: number, level: number } }} params
 */
export async function awardGameBadges({ schoolId, studentId, profileId, percentage, profile }) {
  const gamesPlayed = await prisma.studentGame.count({
    where: { schoolId, studentId },
  })

  const badges = await prisma.badge.findMany({
    where: { schoolId },
  })

  const earned = await prisma.studentBadge.findMany({
    where: { profileId },
    select: { badgeId: true },
  })
  const earnedIds = new Set(earned.map((e) => e.badgeId))

  const toAward = []

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue
    const slug = String(badge.name || '')
      .toLowerCase()
      .replace(/\s+/g, '-')

    if (slug.includes('first') && gamesPlayed === 1) {
      toAward.push(badge.id)
      continue
    }
    if (slug.includes('quick') && percentage >= 80) {
      toAward.push(badge.id)
      continue
    }
    if (slug.includes('perfect') && percentage >= 100) {
      toAward.push(badge.id)
      continue
    }
    if (slug.includes('dedicated') && gamesPlayed >= 10) {
      toAward.push(badge.id)
      continue
    }
    if (slug.includes('scholar') && (profile.level || 1) >= 5) {
      toAward.push(badge.id)
    }
  }

  if (!toAward.length) return []

  await prisma.studentBadge.createMany({
    data: toAward.map((badgeId) => ({
      studentId,
      profileId,
      badgeId,
      schoolId,
    })),
    skipDuplicates: true,
  })

  return toAward
}

/**
 * Compute play streak from distinct calendar days with game activity.
 * @param {Date[]} playedDates
 */
export function computePlayStreak(playedDates) {
  if (!playedDates?.length) return { current: 0, longest: 0 }

  const days = [
    ...new Set(
      playedDates.map((d) => {
        const dt = new Date(d)
        return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
      })
    ),
  ]
    .map((s) => {
      const [y, m, d] = s.split('-').map(Number)
      return new Date(y, m, d).getTime()
    })
    .sort((a, b) => a - b)

  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i] - days[i - 1]) / (24 * 60 * 60 * 1000)
    if (diff === 1) {
      run += 1
      longest = Math.max(longest, run)
    } else if (diff > 1) {
      run = 1
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()
  const yesterdayMs = todayMs - 86400000
  const daySet = new Set(days)

  let current = 0
  if (daySet.has(todayMs) || daySet.has(yesterdayMs)) {
    let cursor = daySet.has(todayMs) ? todayMs : yesterdayMs
    while (daySet.has(cursor)) {
      current += 1
      cursor -= 86400000
    }
  }

  return { current, longest: Math.max(longest, current) }
}
