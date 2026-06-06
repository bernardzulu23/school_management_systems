import { requireSchoolType } from '@/lib/middleware/individual-gate'

/** Timetable features are school-only — block INDIVIDUAL workspaces. */
export async function guardSchoolOnlyTimetable(schoolId) {
  return requireSchoolType(schoolId, ['SCHOOL'])
}
