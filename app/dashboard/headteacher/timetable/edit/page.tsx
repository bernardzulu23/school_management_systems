'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function TimetableEditRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = new URLSearchParams(searchParams.toString())
    qs.set('tab', 'edit')
    if (!qs.get('grid')) qs.set('grid', 'wall')
    router.replace(`/dashboard/headteacher/timetable?${qs.toString()}`)
  }, [router, searchParams])

  return <div className="p-6 text-sm text-royalPurple-text3">Opening timetable editor…</div>
}

export default function TimetableEditPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-royalPurple-text3">Loading…</div>}>
      <TimetableEditRedirectInner />
    </Suspense>
  )
}
