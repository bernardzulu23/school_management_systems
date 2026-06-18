'use client'

import { useMemo } from 'react'
import { useSchool } from '@/lib/context/SchoolContext'
import { getSchoolFeatures } from '@/lib/school/schoolTypeHelpers'
import {
  canAccessEczFeatures,
  canAccessHodFeatures,
  canAccessSecondaryGrading,
} from '@/lib/subjects/resolveSubjectCatalog'

export function getSchoolCapabilities(school, { gradeLevel } = {}) {
  const level = String(school?.level || 'combined').toLowerCase()
  const features = school ? getSchoolFeatures(school) : getSchoolFeatures({ level })

  return {
    schoolLevel: level,
    features,
    canAccessHod: features.hod && canAccessHodFeatures({ schoolLevel: level }),
    canAccessSecondaryGrading:
      features.secondaryGrading && canAccessSecondaryGrading({ schoolLevel: level, gradeLevel }),
    canAccessEcz: features.eczSBA && canAccessEczFeatures({ schoolLevel: level, gradeLevel }),
    isPrimarySchool: level === 'primary',
  }
}

export function useSchoolCapabilities({ gradeLevel } = {}) {
  const { school, isLoading } = useSchool()
  const capabilities = useMemo(
    () => getSchoolCapabilities(school, { gradeLevel }),
    [school, gradeLevel]
  )

  return {
    school,
    isLoading,
    ...capabilities,
    /** Alias for spread feature flags */
    features: capabilities.features,
  }
}
