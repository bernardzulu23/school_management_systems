/** Shared offline event names (browser). */
export const OFFLINE_QUEUE_EVENT = 'zsms-offline-queue'
export const OFFLINE_SYNCED_EVENT = 'zsms-offline-synced'
export const OFFLINE_SEED_EVENT = 'zsms-offline-seed'

export function emitOfflineQueue() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT))
}

export function emitOfflineSynced(detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OFFLINE_SYNCED_EVENT, { detail }))
}

export function emitOfflineSeed(detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OFFLINE_SEED_EVENT, { detail }))
}
