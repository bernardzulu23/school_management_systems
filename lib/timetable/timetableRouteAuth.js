import { NextResponse } from 'next/server'
import { roleCheck } from '@/lib/middleware/auth'

/** Headteacher / school admin — generate, edit, clear draft timetable. */
export function canManageTimetableDraft(user) {
  return roleCheck(user, ['ADMIN', 'headteacher', 'superadmin'])
}

/** Includes HOD for read-only draft meta / conflict panels. */
export function canViewTimetableDraft(user) {
  return roleCheck(user, ['ADMIN', 'headteacher', 'superadmin', 'HOD', 'hod'])
}

export function timetableForbiddenResponse() {
  return NextResponse.json(
    {
      error: 'Forbidden',
      message: 'Your account role cannot modify the timetable draft.',
      code: 'TIMETABLE_FORBIDDEN',
    },
    { status: 403 }
  )
}
