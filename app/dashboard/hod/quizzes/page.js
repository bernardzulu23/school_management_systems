'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { ClipboardList, ArrowLeft, Clock } from 'lucide-react'

function fmtDate(v) {
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString()
  } catch {
    return ''
  }
}

function pill(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'PUBLISHED' || s === 'APPROVED')
    return 'bg-royalPurple-success/20 text-royalPurple-successTx'
  if (s === 'REJECTED') return 'bg-royalPurple-danger/20 text-royalPurple-dangerTx'
  if (s === 'SUBMITTED') return 'bg-royalPurple-accent/20 text-royalPurple-accentTx'
  return 'bg-royalPurple-card2 text-royalPurple-text2'
}

export default function HodQuizzesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [assessments, setAssessments] = useState([])
  const [statusFilter, setStatusFilter] = useState('SUBMITTED')

  useEffect(() => {
    const role = String(user?.role || '').toLowerCase()
    const allowed =
      role === 'hod' || role === 'headteacher' || role === 'admin' || Boolean(user?.hodProfile)
    if (user && !allowed) router.replace(`/dashboard/${role || 'teacher'}`)
  }, [user, router])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams()
        if (statusFilter && statusFilter !== 'ALL') qs.set('status', statusFilter)
        const res = await fetch(`/api/assessments/hod/pending?${qs.toString()}`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          setAssessments([])
          return
        }
        setAssessments(Array.isArray(json?.data?.assessments) ? json.data.assessments : [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  const pendingCount = useMemo(
    () => assessments.filter((a) => String(a?.status) === 'SUBMITTED').length,
    [assessments]
  )

  return (
    <DashboardLayout title="Quiz review (HOD)">
      <div className="space-y-4">
        <Link href="/dashboard/hod">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center">
                <ClipboardList className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                Quizzes pending review: {pendingCount}
              </span>
              <Button
                variant={statusFilter === 'SUBMITTED' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('SUBMITTED')}
                size="sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                Pending
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-royalPurple-text2">Loading…</p>
            ) : assessments.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No quizzes in this queue.</p>
            ) : (
              <ul className="space-y-2">
                {assessments.map((a) => (
                  <li
                    key={a.id}
                    className="p-3 rounded-lg border border-royalPurple-border flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-royalPurple-text1">{a.title}</p>
                      <p className="text-xs text-royalPurple-text2">
                        {a.subject} · {a.class} · {a.questionCount} questions
                        {a.submittedAt ? ` · ${fmtDate(a.submittedAt)}` : ''}
                      </p>
                      <p className="text-xs text-royalPurple-text2">
                        Teacher: {a.createdBy?.name || a.createdBy?.email || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${pill(a.status)}`}>
                        {a.status}
                      </span>
                      <Link href={`/dashboard/hod/quizzes/${a.id}`}>
                        <Button size="sm">Review</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
