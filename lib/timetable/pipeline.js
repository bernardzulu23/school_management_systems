/**
 * Canonical timetable pipeline (single source of truth).
 *
 * Generate: POST /api/timetable/generate  (scheduler.ts + pushed TeacherAllocation)
 * Save:     POST /api/timetable/entries/sync-draft  (optional manual edits)
 * Publish:  POST /api/timetable/publish  (server validates hard conflicts)
 * View:     GET /api/timetable/view
 */

export const TIMETABLE_CANONICAL = {
  generatePath: '/api/timetable/generate',
  syncDraftPath: '/api/timetable/entries/sync-draft',
  publishPath: '/api/timetable/publish',
  viewPath: '/api/timetable/view',
  headteacherUi: '/dashboard/headteacher/timetable',
}

/** Legacy / experimental — do not use in production UI */
export const TIMETABLE_DEPRECATED = {
  solverGeneratePath: '/api/timetable/solver/generate',
  solverOrtoolsPath: '/api/timetable/solver/ortools',
  clientAutoGenerate: 'AutoGenerateButton / automationService',
}

/** UI entry points and which API they call (audit reference) */
export const TIMETABLE_UI_PATHS = {
  'app/dashboard/headteacher/timetable/page.tsx': {
    primary: TIMETABLE_CANONICAL.generatePath,
    deprecated: [TIMETABLE_DEPRECATED.solverGeneratePath],
  },
  'app/dashboard/timetable/page.js': {
    note: 'Hub redirects by role; HT should use headteacher timetable',
  },
  'components/timetable/MasterTimetableGenerator.js': {
    deprecated: 'Legacy REST table removed; use MasterTimetableGrid + useTimetableStore',
  },
  'components/timetable/MasterTimetableGrid.tsx': {
    primary: TIMETABLE_CANONICAL.generatePath,
  },
  'components/timetable/AutoGenerateButton.tsx': {
    deprecated: TIMETABLE_DEPRECATED.clientAutoGenerate,
  },
  'components/timetable/TeacherPeriodAssignmentUI.tsx': {
    deprecated: TIMETABLE_DEPRECATED.solverGeneratePath,
  },
}
