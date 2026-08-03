/**
 * Phase 2 teacher ops offline helpers (CBC, lesson plans, materials metadata).
 */
import { enqueueMutation } from '@/lib/offline/sync/engine'
import { resultsStore } from '@/lib/offline/results-store'
import { isBrowserOnline, isNetworkFailure } from '@/lib/offline/network'

export function isLocalLessonPlanId(id) {
  return String(id || '').startsWith('local:')
}

export function newLocalLessonPlanId() {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `t${Date.now()}`
  return `local:${uuid}`
}

/**
 * @param {object} body — CBC rating POST body
 */
export async function queueCbcRating(body) {
  const year = Number(body.academicYear) || new Date().getFullYear()
  const term = Number(body.term)
  const studentId = String(body.studentId || '')
  const competencyId = String(body.competencyId || '')
  if (!studentId || !competencyId || !term) return null
  return enqueueMutation({
    channel: 'cbc-ratings',
    entityKey: `${studentId}:${competencyId}:${term}:${year}`,
    url: '/api/cbc/ratings',
    method: 'POST',
    body: { ...body, academicYear: year, term },
  })
}

/**
 * Queue lesson plan create (draft or submit:true).
 * @param {object} body
 * @param {string} [localId]
 */
export async function queueLessonPlanCreate(body, localId) {
  const key =
    localId ||
    `create:${body.grade}:${body.subject}:${body.topic}:${body.weekNumber || body.week || ''}:${body.term || ''}`
  return enqueueMutation({
    channel: 'lesson-plans',
    entityKey: String(key),
    url: '/api/lesson-plans',
    method: 'POST',
    body,
  })
}

export async function queueLessonPlanUpdate(planId, body) {
  if (isLocalLessonPlanId(planId)) {
    return queueLessonPlanCreate(
      {
        ...body,
        submit: false,
      },
      planId
    )
  }
  return enqueueMutation({
    channel: 'lesson-plans',
    entityKey: `put:${planId}`,
    url: `/api/lesson-plans/${encodeURIComponent(planId)}`,
    method: 'PUT',
    body,
  })
}

export async function queueLessonPlanSubmit(planId, body = {}) {
  if (isLocalLessonPlanId(planId)) {
    return queueLessonPlanCreate(
      {
        ...body,
        submit: true,
      },
      planId
    )
  }
  return enqueueMutation({
    channel: 'lesson-plans',
    entityKey: `submit:${planId}`,
    url: `/api/lesson-plans/${encodeURIComponent(planId)}/submit`,
    method: 'POST',
    body,
  })
}

/**
 * Materials metadata create/update (no file blobs).
 */
export async function queueMaterialMeta({ editingId, payload }) {
  if (editingId) {
    return enqueueMutation({
      channel: 'materials',
      entityKey: `put:${editingId}`,
      url: `/api/teacher/materials/${encodeURIComponent(editingId)}`,
      method: 'PUT',
      body: payload,
    })
  }
  return enqueueMutation({
    channel: 'materials',
    entityKey: `create:${payload.title}:${payload.subject}:${payload.fileUrl}`,
    url: '/api/teacher/materials',
    method: 'POST',
    body: payload,
  })
}

/**
 * Try a network write; on offline/network failure run `queueFn`.
 * @template T
 * @param {() => Promise<T>} onlineFn
 * @param {() => Promise<unknown>} queueFn
 * @returns {Promise<{ ok: true, offline?: boolean, data?: T } | { ok: false, error: Error }>}
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

export async function cacheTeacherJson(key, data) {
  return resultsStore.cacheJson(key, data)
}

export async function getCachedTeacherJson(key) {
  return resultsStore.getCachedJson(key)
}
