import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/middleware/errorHandler'
import { canUseFeeManagement } from '@/lib/school/schoolTypeHelpers'
import { loadSchoolLevelContext } from '@/lib/school/schoolLevelContext'

export async function getSchoolOwnershipType(schoolId) {
  const school = await loadSchoolLevelContext(schoolId)
  return school?.ownershipType || 'PRIVATE'
}

export function isGovernmentSchool(ownershipType) {
  const key = String(ownershipType || '')
    .trim()
    .toUpperCase()
  return key === 'GOVERNMENT' || key === 'COMMUNITY'
}

/**
 * Returns a 403 NextResponse when fee management is not allowed for this school.
 */
export async function assertFeeManagementAllowed(schoolId) {
  const school = await loadSchoolLevelContext(schoolId)
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  if (!canUseFeeManagement(school)) {
    return NextResponse.json(
      { error: 'Fee management is not available for government schools', code: 'SCHOOL_TYPE_GATE' },
      { status: 403 }
    )
  }
  return null
}

/** For withErrorHandler routes — throws ApiError when fee management unavailable. */
export async function assertFeeManagementAccess(schoolId) {
  const school = await loadSchoolLevelContext(schoolId)
  if (!school) throw new ApiError('School not found', 404)
  if (!canUseFeeManagement(school)) {
    throw new ApiError('Fee management is not available for government schools', 403)
  }
  return school
}
