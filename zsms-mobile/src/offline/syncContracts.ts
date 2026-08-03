/**
 * Shared offline sync contracts — keep aligned with lib/offline/sync-contracts.js
 */
export const SYNC_CONTRACT_VERSION = 1

export const SEED_FORMAT = 'zsmsseed'
export const SEED_VERSION = 1
export const SEED_TTL_DAYS = 14
export const SEED_PASSPHRASE_MIN = 6

export const CACHE_KEYS = {
  parentChildren: 'parent:children',
  parentChild: (studentId: string) => `parent:child:${String(studentId)}`,
  studentProfile: 'seed:student-profile',
  teachingAssignments: (userId: string) => `teaching-assignments:${userId}`,
  sbaTasks: 'seed:sba-tasks',
} as const

export const MOBILE_QUEUE_TYPES = {
  attendance: 'attendance',
  score: 'score',
  lessonSession: 'lessonSession',
} as const

export const ONLINE_ONLY = [
  'ai',
  'payments',
  'sms',
  'ussd',
  'timetable-publish',
  'timetable-generate',
] as const
