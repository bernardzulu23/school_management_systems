'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { FileText, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'

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
  if (s === 'APPROVED') return 'bg-royalPurple-success/20 text-royalPurple-successTx'
  if (s === 'REJECTED') return 'bg-royalPurple-danger/20 text-royalPurple-dangerTx'
  if (s === 'SUBMITTED') return 'bg-royalPurple-accent/20 text-royalPurple-accentTx'
  return 'bg-royalPurple-card2 text-royalPurple-text2'
}

export default function HodLessonPlansPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])
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
        qs.set('scope', 'review')
        if (statusFilter && statusFilter !== 'ALL') qs.set('status', statusFilter)
        const res = await fetch(`/api/lesson-plans?${qs.toString()}`, { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          setPlans([])
          return
        }
        setPlans(Array.isArray(json?.data?.plans) ? json.data.plans : [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  const pendingCount = useMemo(() => {
    return plans.filter((p) => String(p?.status || '').toUpperCase() === 'SUBMITTED').length
  }, [plans])

  return (
    <DashboardLayout title="Lesson Plans (Approval)">
      <div className="space-y-4">
        <Link href="/dashboard/hod">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                Pending lesson plans: {pendingCount}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant={statusFilter === 'SUBMITTED' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('SUBMITTED')}
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('APPROVED')}
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('REJECTED')}
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejected
                </Button>
                <Button
                  variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('ALL')}
                  size="sm"
                >
                  All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-royalPurple-border/50 text-royalPurple-text2">
                    <th className="text-left py-2 pr-4">Teacher</th>
                    <th className="text-left py-2 pr-4">Subject</th>
                    <th className="text-left py-2 pr-4">Grade/Form</th>
                    <th className="text-left py-2 pr-4">Topic</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Submitted</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-4 text-royalPurple-text2" colSpan={7}>
                        Loading…
                      </td>
                    </tr>
                  ) : plans.length === 0 ? (
                    <tr>
                      <td className="py-4 text-royalPurple-text2" colSpan={7}>
                        No lesson plans found.
                      </td>
                    </tr>
                  ) : (
                    plans.map((p) => (
                      <tr key={p.id} className="border-b border-royalPurple-border/40">
                        <td className="py-3 pr-4 text-royalPurple-text1">
                          {p?.createdBy?.name || p?.createdBy?.email || 'Teacher'}
                        </td>
                        <td className="py-3 pr-4 text-royalPurple-text1">{p.subject}</td>
                        <td className="py-3 pr-4 text-royalPurple-text2">{p.grade}</td>
                        <td className="py-3 pr-4 text-royalPurple-text2">{p.topic}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${pill(p.status)}`}
                          >
                            {String(p.status || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-royalPurple-text3">
                          {fmtDate(p.submittedAt || p.createdAt)}
                        </td>
                        <td className="py-3 text-right">
                          <Link href={`/dashboard/hod/lesson-plans/${p.id}`}>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
