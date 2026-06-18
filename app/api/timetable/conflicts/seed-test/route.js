export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'

/**
 * POST /api/timetable/conflicts/seed-test
 * Development-only mock conflicts for UI testing.
 */
export async function POST(req) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    schoolId: 'test-school',
    term: 'Term 1',
    academicYear: String(new Date().getFullYear()),
    versionId: 'test-version',
    totalConflicts: 3,
    errorCount: 2,
    warningCount: 1,
    canPublish: false,
    scannedAt: new Date().toISOString(),
    entryCount: 0,
    conflicts: [
      {
        id: 'conflict_1',
        type: 'TEACHER_DOUBLE_BOOKED',
        severity: 'error',
        description: 'Mr. Banda is assigned to 10A and 11B at the same time (Monday 07:30)',
        suggestedFix:
          'Remove Mr. Banda from one of the conflicting classes, or assign a substitute teacher.',
        affectedEntryIds: ['entry_1', 'entry_2'],
        teacherName: 'Mr. Banda',
        day: 'Monday',
        startTime: '07:30',
        subjectNames: ['Mathematics', 'Physics'],
      },
      {
        id: 'conflict_2',
        type: 'CLASS_DOUBLE_BOOKED',
        severity: 'error',
        description:
          'Form 2A is scheduled for Biology and Chemistry at the same time (Tuesday 09:00)',
        suggestedFix: 'Move one subject to a different time slot.',
        affectedEntryIds: ['entry_3', 'entry_4'],
        className: 'Form 2A',
        day: 'Tuesday',
        startTime: '09:00',
        subjectNames: ['Biology', 'Chemistry'],
      },
      {
        id: 'conflict_3',
        type: 'TEACHER_OVER_ALLOCATED',
        severity: 'warning',
        description: 'Mrs. Phiri is assigned 38 periods/week but their maximum is 35 (over by 3)',
        suggestedFix: "Remove 3 periods from Mrs. Phiri's timetable.",
        affectedEntryIds: ['entry_5', 'entry_6', 'entry_7'],
        teacherName: 'Mrs. Phiri',
      },
    ],
    byType: {},
  })
}
