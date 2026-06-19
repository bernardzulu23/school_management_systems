import { NextResponse } from 'next/server'
import { basePrisma } from '@/lib/prisma/client'
import {
  canUseFeeManagement,
  canUseECZSBA,
  canUseCBC,
  canUseHOD,
  canUseEMISExport,
  canUseGrantsTracking,
  canUseGenderReport,
  canUseTeacherLeave,
  canUseTeacherDeployment,
  canUseHostel,
  canUseMockExams,
  canUseCodePlayground,
  canUseCareerGuidance,
  canUseProprietorDashboard,
  getSchoolFeatures,
} from '@/lib/school/schoolTypeHelpers'

const FEATURE_CHECKERS = {
  'fee-management': canUseFeeManagement,
  'parent-portal': canUseFeeManagement,
  'sibling-discounts': canUseFeeManagement,
  'proprietor-dashboard': canUseProprietorDashboard,
  'ecz-sba': canUseECZSBA,
  'ecz-exam-tracking': canUseECZSBA,
  'ecz-practice': canUseECZSBA,
  'ecz-tracking': canUseECZSBA,
  'mock-exams': canUseMockExams,
  cbc: canUseCBC,
  phonics: canUseCBC,
  'competency-analyser': canUseCBC,
  'continuous-assessment-tool': canUseCBC,
  hod: canUseHOD,
  'hod-dashboard': canUseHOD,
  'hod-management': canUseHOD,
  hostel: canUseHostel,
  'code-playground': canUseCodePlayground,
  'career-guidance': canUseCareerGuidance,
  'emis-export': canUseEMISExport,
  'grants-tracking': canUseGrantsTracking,
  'teacher-deployment': canUseTeacherDeployment,
  'teacher-deployment-system': canUseTeacherDeployment,
  'teacher-leave': canUseTeacherLeave,
  'gender-report': canUseGenderReport,
  'gender-dropout-report': canUseGenderReport,
}

/**
 * Middleware to check school type access for a feature.
 * Returns 403 NextResponse if denied, null if allowed.
 */
export async function requireSchoolTypeAccess(schoolId, featureKey) {
  const checker = FEATURE_CHECKERS[featureKey]
  if (!checker) {
    console.warn(`[schoolTypeGate] Unknown feature key: ${featureKey}`)
    return null
  }

  const school = await basePrisma.school.findUnique({
    where: { id: String(schoolId) },
    select: { level: true, ownershipType: true, name: true },
  })

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  if (!checker(school)) {
    return NextResponse.json(
      {
        error: `This feature is not available for ${school.name}.`,
        feature: featureKey,
        schoolLevel: school.level,
        ownershipType: school.ownershipType,
        code: 'SCHOOL_TYPE_GATE',
      },
      { status: 403 }
    )
  }

  return null
}

export async function getSchoolFeaturesFromId(schoolId) {
  const school = await basePrisma.school.findUnique({
    where: { id: String(schoolId) },
    select: { level: true, ownershipType: true },
  })

  if (!school) return null
  return getSchoolFeatures(school)
}
