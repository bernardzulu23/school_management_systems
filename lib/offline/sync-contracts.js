/**
 * Shared offline sync contracts — web PWA + Expo must stay aligned.
 * Mobile mirror: zsms-mobile/src/offline/syncContracts.ts
 */
export const SYNC_CONTRACT_VERSION = 1

export const SEED_FORMAT = 'zsmsseed'
export const SEED_VERSION = 1
export const SEED_TTL_DAYS = 14
export const SEED_PASSPHRASE_MIN = 6

/** IndexedDB / AsyncStorage cache keys used across platforms */
export const CACHE_KEYS = {
  parentChildren: 'parent:children',
  /** @param {string} studentId */
  parentChild: (studentId) => `parent:child:${String(studentId)}`,
  studentProfile: 'seed:student-profile',
  teachingAssignments: (userId) => `teaching-assignments:${userId}`,
  sbaTasks: 'seed:sba-tasks',
}

/** mutationQueue.channel values (web Dexie) */
export const MUTATION_CHANNELS = {
  cbcRatings: 'cbc-ratings',
  lessonPlans: 'lesson-plans',
  materials: 'materials',
  flashcards: 'flashcards',
  studentMaterials: 'student-materials',
  goals: 'goals',
  mockExam: 'mock-exam',
  games: 'games',
  timetableDraft: 'timetable-draft',
}

/** Expo offlineQueue item.type values */
export const MOBILE_QUEUE_TYPES = {
  attendance: 'attendance',
  score: 'score',
  lessonSession: 'lessonSession',
}

/** Features that must never queue offline */
export const ONLINE_ONLY = [
  'ai',
  'payments',
  'sms',
  'ussd',
  'timetable-publish',
  'timetable-generate',
]
