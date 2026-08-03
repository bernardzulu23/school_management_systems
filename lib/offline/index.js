/**
 * Public offline module surface.
 */
export { getOfflineDB, pendingFilter } from '@/lib/offline/db'
export { attendanceStore } from '@/lib/offline/attendance-store'
export { resultsStore } from '@/lib/offline/results-store'
export { useOfflineSync } from '@/lib/offline/use-sync'
export { flushOfflineQueues, enqueueMutation, getAllPendingCount } from '@/lib/offline/sync/engine'
export {
  isBrowserOnline,
  isNetworkFailure,
  assertOnlineForAi,
  AI_OFFLINE_MESSAGE,
} from '@/lib/offline/network'
export { encryptSeedPayload, decryptSeedPayload } from '@/lib/offline/seed-crypto'
export { importSeedIntoOfflineStore, getSeedMeta } from '@/lib/offline/seed-import'
export {
  queueCbcRating,
  queueLessonPlanCreate,
  queueLessonPlanUpdate,
  queueLessonPlanSubmit,
  queueMaterialMeta,
  tryOnlineOrQueue,
  isLocalLessonPlanId,
} from '@/lib/offline/teacher-ops'
