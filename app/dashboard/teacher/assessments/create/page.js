'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherAssessmentsCreateRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/teacher/assessments?create=1')
  }, [router])

  return null
}
