'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSchool } from '@/lib/context/SchoolContext'
import { canAccessHodFeatures } from '@/lib/subjects/resolveSubjectCatalog'

export default function HodSchoolLevelGate({ children }) {
  const router = useRouter()
  const { school, isLoading } = useSchool()

  useEffect(() => {
    if (isLoading || !school?.level) return
    if (!canAccessHodFeatures({ schoolLevel: school.level })) {
      router.replace('/dashboard/teacher')
    }
  }, [isLoading, school?.level, router])

  return children
}
