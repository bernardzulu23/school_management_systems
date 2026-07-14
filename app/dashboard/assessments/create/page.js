'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy stub → teacher assessment create modal. */
export default function CreateAssessmentRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/teacher/assessments?create=1')
  }, [router])

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-royalPurple-text2">
      Opening assessment creator…
    </div>
  )
}
