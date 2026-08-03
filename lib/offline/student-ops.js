/**
 * Phase 3 student offline helpers.
 */
import { enqueueMutation, cancelPendingMutation } from '@/lib/offline/sync/engine'
import { resultsStore } from '@/lib/offline/results-store'
import { isBrowserOnline, isNetworkFailure, AI_OFFLINE_MESSAGE } from '@/lib/offline/network'

export { AI_OFFLINE_MESSAGE }

export function isLocalGoalId(id) {
  return String(id || '').startsWith('local:')
}

export function newLocalGoalId() {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `t${Date.now()}`
  return `local:${uuid}`
}

export async function queueFlashcardComplete(deckId, { answers }) {
  const id = String(deckId || '')
  if (!id) return null
  return enqueueMutation({
    channel: 'flashcards',
    entityKey: `complete:${id}`,
    url: `/api/student/flashcards/${encodeURIComponent(id)}/complete`,
    method: 'POST',
    body: { answers },
  })
}

/**
 * @param {{ materialId: string, bookmarked: boolean }} args
 */
export async function queueMaterialBookmark({ materialId, bookmarked }) {
  const id = String(materialId || '')
  if (!id) return null
  return enqueueMutation({
    channel: 'student-materials',
    entityKey: `bookmark:${id}`,
    url: '/api/student/materials',
    method: 'POST',
    body: { materialId: id, action: 'bookmark', bookmarked: Boolean(bookmarked) },
  })
}

export async function queueMaterialDownload(materialId) {
  const id = String(materialId || '')
  if (!id) return null
  return enqueueMutation({
    channel: 'student-materials',
    entityKey: `download:${id}`,
    url: '/api/student/materials',
    method: 'POST',
    body: { materialId: id, action: 'download' },
  })
}

export async function queueGoalCreate(body, localId) {
  const key = localId || `create:${body.title}:${body.type || 'academic'}:${body.targetDate || ''}`
  return enqueueMutation({
    channel: 'goals',
    entityKey: String(key),
    url: '/api/student/goals',
    method: 'POST',
    body,
  })
}

export async function queueGoalUpdate(body) {
  const id = String(body?.id || '')
  if (!id) return null
  if (isLocalGoalId(id)) {
    const { id: _drop, ...rest } = body
    return queueGoalCreate(rest, id)
  }
  return enqueueMutation({
    channel: 'goals',
    entityKey: `put:${id}`,
    url: '/api/student/goals',
    method: 'PUT',
    body,
  })
}

export async function queueGoalDelete(id) {
  const goalId = String(id || '')
  if (!goalId) return null
  if (isLocalGoalId(goalId)) {
    await cancelPendingMutation('goals', goalId)
    return null
  }
  return enqueueMutation({
    channel: 'goals',
    entityKey: `delete:${goalId}`,
    url: `/api/student/goals?id=${encodeURIComponent(goalId)}`,
    method: 'DELETE',
  })
}

export async function queueMockExamSubmit(attemptId, { answers }) {
  const id = String(attemptId || '')
  if (!id) return null
  return enqueueMutation({
    channel: 'mock-exam',
    entityKey: `submit:${id}`,
    url: `/api/student/mock-exam/${encodeURIComponent(id)}/submit`,
    method: 'POST',
    body: { answers },
  })
}

export async function queueGameComplete({ gameId, percentage }) {
  const id = String(gameId || '')
  if (!id) return null
  const playKey =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  return enqueueMutation({
    channel: 'games',
    entityKey: `complete:${id}:${playKey}`,
    url: '/api/dashboard/student/games/complete',
    method: 'POST',
    body: { gameId: id, percentage: Number(percentage) || 0 },
  })
}

/**
 * @template T
 * @param {() => Promise<T>} onlineFn
 * @param {() => Promise<unknown>} queueFn
 */
export async function tryOnlineOrQueue(onlineFn, queueFn) {
  if (!isBrowserOnline()) {
    await queueFn()
    return { ok: true, offline: true }
  }
  try {
    const data = await onlineFn()
    return { ok: true, offline: false, data }
  } catch (err) {
    if (isNetworkFailure(err)) {
      await queueFn()
      return { ok: true, offline: true }
    }
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

export async function cacheStudentJson(key, data) {
  return resultsStore.cacheJson(key, data)
}

export async function getCachedStudentJson(key) {
  return resultsStore.getCachedJson(key)
}
