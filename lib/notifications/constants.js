/** Max notifications created per user per rolling hour */
export const NOTIFICATION_RATE_LIMIT_PER_HOUR = 10

/** SMS only when mastery below this threshold (Option B) */
export const SMS_MASTERY_THRESHOLD = 40

/** Default quiet hours (local school time) */
export const DEFAULT_QUIET_START = '15:00'
export const DEFAULT_QUIET_END = '06:45'
export const DEFAULT_TIMEZONE = 'Africa/Lusaka'

export const NOTIFICATION_CHANNELS = {
  WEB_PUSH: 'WEB_PUSH',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
}

export const NOTIFICATION_TYPES = {
  CLASS_REMINDER: 'CLASS_REMINDER',
  DEPARTMENT_MEETING_REMINDER: 'DEPARTMENT_MEETING_REMINDER',
  TEST_SCHEDULED: 'TEST_SCHEDULED',
  TEST_DATE_REMINDER: 'TEST_DATE_REMINDER',
  MISSED_TEST_ALERT: 'MISSED_TEST_ALERT',
  SCHEME_PROGRESS: 'SCHEME_PROGRESS',
  LOW_MASTERY_ALERT: 'LOW_MASTERY_ALERT',
  LESSON_ASSIGNED: 'LESSON_ASSIGNED',
}

/** Default channels per type (before user prefs + SMS thresholds) */
export const TYPE_DEFAULT_CHANNELS = {
  CLASS_REMINDER: ['WEB_PUSH', 'EMAIL'],
  DEPARTMENT_MEETING_REMINDER: ['WEB_PUSH', 'EMAIL'],
  TEST_SCHEDULED: ['WEB_PUSH', 'EMAIL'],
  TEST_DATE_REMINDER: ['WEB_PUSH', 'EMAIL'],
  MISSED_TEST_ALERT: ['WEB_PUSH', 'EMAIL', 'SMS'],
  SCHEME_PROGRESS: ['WEB_PUSH', 'EMAIL'],
  LOW_MASTERY_ALERT: ['WEB_PUSH', 'EMAIL'],
  LESSON_ASSIGNED: ['WEB_PUSH', 'EMAIL'],
}

/** Staff roles that receive mandatory notifications in Phase 1 */
export const NOTIFICATION_STAFF_ROLES = new Set([
  'teacher',
  'hod',
  'headteacher',
  'admin',
  'administrator',
  'superadmin',
])
