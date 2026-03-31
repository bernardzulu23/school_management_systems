'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherAttendanceRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/attendance')
  }, [router])

  return null
}
