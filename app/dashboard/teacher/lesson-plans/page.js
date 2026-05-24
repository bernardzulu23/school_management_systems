'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText } from 'lucide-react'

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
  if (s === 'REVISION_REQUESTED') return 'bg-orange-500/20 text-orange-200'
  if (s === 'SUBMITTED') return 'bg-royalPurple-accent/20 text-royalPurple-accentTx'
  if (s === 'DRAFT') return 'bg-royalPurple-card2 text-royalPurple-text2'
  return 'bg-royalPurple-card2 text-royalPurple-text2'
}

export default function TeacherLessonPlansPage() {
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/lesson-plans?scope=mine', { credentials: 'include' })
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
  }, [])

  return (
    <DashboardLayout title="My Lesson Plans">
      <div className="space-y-4">
        <Link href="/dashboard/teacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
              My lesson plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-royalPurple-border/50 text-royalPurple-text2">
                    <th className="text-left py-2 pr-4">Subject</th>
                    <th className="text-left py-2 pr-4">Grade/Form</th>
                    <th className="text-left py-2 pr-4">Topic</th>
                    <th className="text-left py-2 pr-4">Reviewer</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Created</th>
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
                        No lesson plans yet.
                      </td>
                    </tr>
                  ) : (
                    plans.map((p) => (
                      <tr key={p.id} className="border-b border-royalPurple-border/40">
                        <td className="py-3 pr-4 text-royalPurple-text1">{p.subject}</td>
                        <td className="py-3 pr-4 text-royalPurple-text2">{p.grade}</td>
                        <td className="py-3 pr-4 text-royalPurple-text2">{p.topic}</td>
                        <td className="py-3 pr-4 text-royalPurple-text2">
                          {p?.reviewer?.name || p?.reviewer?.email || 'Reviewer'}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${pill(p.status)}`}
                          >
                            {String(p.status || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-royalPurple-text3">{fmtDate(p.createdAt)}</td>
                        <td className="py-3 text-right">
                          <Link href={`/dashboard/teacher/lesson-plans/${p.id}`}>
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
