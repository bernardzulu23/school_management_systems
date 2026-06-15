/**
 * Map Prisma Game row to GameManagement UI shape.
 */
export function mapGameForManagement(game, stats = {}) {
  const content = game.content && typeof game.content === 'object' ? game.content : {}
  const subjectName = game.subject || 'General'
  return {
    id: game.id,
    title: game.title,
    description: game.description || '',
    subject: { id: subjectName, name: subjectName },
    gameType: game.type || 'quiz',
    difficulty: game.difficulty || 'medium',
    targetClass: content.targetClass || '',
    pointsReward: content.pointsReward ?? 10,
    timeLimit: content.timeLimit ?? 0,
    isActive: true,
    playCount: stats.playCount ?? 0,
    averageScore: stats.averageScore ?? 0,
    createdAt: game.createdAt?.toISOString?.()?.slice(0, 10) || '',
    content,
  }
}
