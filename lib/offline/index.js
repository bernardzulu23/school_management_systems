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
export {
  queueFlashcardComplete,
  queueMaterialBookmark,
  queueMaterialDownload,
  queueGoalCreate,
  queueGoalUpdate,
  queueGoalDelete,
  queueMockExamSubmit,
  queueGameComplete,
  isLocalGoalId,
  tryOnlineOrQueue as tryOnlineOrQueueStudent,
} from '@/lib/offline/student-ops'
export {
  queueTimetableSyncDraft,
  queueTimetablePatch,
  queueTimetableDelete,
  queueDraftMetaPatch,
  tryOnlineOrQueue as tryOnlineOrQueueAdmin,
  cacheAdminJson,
  getCachedAdminJson,
  saveAnnouncementDraft,
  listAnnouncementDrafts,
  deleteAnnouncementDraft,
} from '@/lib/offline/admin-ops'
export {
  cacheParentJson,
  getCachedParentJson,
  fetchParentChildrenWithCache,
  fetchParentChildWithCache,
  parentChildrenCacheKey,
  parentChildCacheKey,
} from '@/lib/offline/parent-ops'
export {
  SYNC_CONTRACT_VERSION,
  SEED_FORMAT,
  CACHE_KEYS,
  MUTATION_CHANNELS,
  MOBILE_QUEUE_TYPES,
  ONLINE_ONLY,
} from '@/lib/offline/sync-contracts'
export { cancelPendingMutation } from '@/lib/offline/sync/engine'
