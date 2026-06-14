'use client'

import { useMemo } from 'react'
import { useSchool } from '@/lib/context/SchoolContext'
import {
  canAccessEczFeatures,
  canAccessHodFeatures,
  canAccessSecondaryGrading,
} from '@/lib/subjects/resolveSubjectCatalog'

export function getSchoolCapabilities(schoolLevel, { gradeLevel } = {}) {
  const level = String(schoolLevel || 'combined').toLowerCase()
  return {
    schoolLevel: level,
    canAccessHod: canAccessHodFeatures({ schoolLevel: level }),
    canAccessSecondaryGrading: canAccessSecondaryGrading({ schoolLevel: level, gradeLevel }),
    canAccessEcz: canAccessEczFeatures({ schoolLevel: level, gradeLevel }),
    isPrimarySchool: level === 'primary',
  }
}

export function useSchoolCapabilities({ gradeLevel } = {}) {
  const { school, isLoading } = useSchool()
  const capabilities = useMemo(
    () => getSchoolCapabilities(school?.level, { gradeLevel }),
    [school?.level, gradeLevel]
  )

  return {
    school,
    isLoading,
    ...capabilities,
  }
}
