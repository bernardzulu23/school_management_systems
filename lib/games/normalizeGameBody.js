/**
 * Normalize game create/update payloads from GameManagement / GameCreationForm.
 */
export function resolveSubjectLabel(body) {
  if (body?.subject?.name != null) return String(body.subject.name).trim()
  if (typeof body?.subject === 'string') return body.subject.trim()
  return ''
}

export function normalizeGameContent(body, prevContent = {}) {
  const content = body?.content && typeof body.content === 'object' ? body.content : {}
  const previous = prevContent && typeof prevContent === 'object' ? prevContent : {}

  return {
    questions: content.questions ?? previous.questions ?? [],
    pointsReward: Number(content.pointsReward ?? body?.pointsReward ?? previous.pointsReward) || 10,
    timeLimit: Number(content.timeLimit ?? body?.timeLimit ?? previous.timeLimit) || 0,
    targetClass: content.targetClass ?? body?.targetClass ?? previous.targetClass ?? null,
  }
}

export function buildGameApiPayload(body, prevContent = {}) {
  const content = normalizeGameContent(body, prevContent)
  return {
    title: body?.title != null ? String(body.title).trim() : undefined,
    description: body?.description != null ? String(body.description).trim() : undefined,
    subject: resolveSubjectLabel(body) || undefined,
    gameType: String(body?.gameType || body?.type || 'quiz').trim(),
    difficulty: body?.difficulty != null ? String(body.difficulty).trim() : undefined,
    content,
  }
}
