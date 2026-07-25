'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

export default function OldSyllabusSubjectGradePage() {
  const params = useParams()
  const subject = decodeURIComponent(String(params?.subject || ''))
  const grade = Number(params?.grade)
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) router.replace('/login')
  }, [isAuthenticated, isLoading, user, router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const qs = new URLSearchParams({ subject, grade: String(grade) })
        const res = await fetch(`/api/curriculum/old-syllabus?${qs}`, { credentials: 'include' })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Failed to load')
          return
        }
        setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [subject, grade])

  const topics = data?.document?.gradeContent?.[0]?.topics || []

  return (
    <DashboardLayout title={`${subject} · Grade ${grade}`}>
      <div className="space-y-4 max-w-4xl">
        <Link href="/dashboard/teacher/old-syllabus" className="text-sm underline">
          ← Old syllabus
        </Link>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="rounded-lg border p-4 text-sm">
          <div className="font-medium mb-2">Past paper templates</div>
          {!data?.pastPapers?.length ? (
            <p className="text-muted-foreground">No VALID past papers for this subject yet.</p>
          ) : (
            <ul className="space-y-1">
              {data.pastPapers.map((p) => (
                <li key={p.id}>
                  {p.paperCode}/{p.paperNumber} ({p.year}) · {p.totalMarks} marks ·{' '}
                  {p.durationMinutes} min
                  {p.structureJson?.needsReview ? (
                    <span className="ml-2 text-amber-700">topicCoverage needs review</span>
                  ) : (
                    <span className="ml-2 text-emerald-700">reviewed</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">Topics</h2>
          {!topics.length ? (
            <p className="text-sm text-muted-foreground">No topics for this grade.</p>
          ) : (
            topics.map((topic) => (
              <details key={topic.topicId} className="rounded-lg border p-3">
                <summary className="cursor-pointer font-medium">
                  {topic.topicId} {topic.topicName}{' '}
                  <span className="text-muted-foreground font-normal">({topic.domain})</span>
                </summary>
                <ul className="mt-2 space-y-2 text-sm">
                  {(topic.subtopics || []).map((st) => (
                    <li key={st.subtopicId}>
                      <div className="font-medium">
                        {st.subtopicId} {st.subtopicName}
                      </div>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {(st.specificOutcomes || []).map((o) => (
                          <li key={o.outcomeId}>
                            {o.outcomeId}: {o.statement}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </details>
            ))
          )}
        </div>

        <Link
          href={`/dashboard/teacher/old-syllabus/generate?subject=${encodeURIComponent(subject)}&grade=${grade}`}
          className="inline-flex rounded-md bg-black text-white px-4 py-2 text-sm"
        >
          Generate from these topics
        </Link>
      </div>
    </DashboardLayout>
  )
}
