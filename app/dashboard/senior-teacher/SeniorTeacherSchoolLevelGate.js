'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSchool } from '@/lib/context/SchoolContext'
import { canUseSeniorTeacherFeatures } from '@/lib/senior-teacher/seniorTeacherAccess'

export default function SeniorTeacherSchoolLevelGate({ children }) {
  const router = useRouter()
  const { school, isLoading } = useSchool()

  useEffect(() => {
    if (isLoading || !school?.level) return
    if (!canUseSeniorTeacherFeatures(school.level)) {
      router.replace('/dashboard/teacher')
    }
  }, [isLoading, router, school?.level])

  return children
}
