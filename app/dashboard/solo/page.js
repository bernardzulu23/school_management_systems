'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { BookOpen, ClipboardList, Copy, RefreshCw, Sparkles, Trash2, Users } from 'lucide-react'
import { PLAN_LABELS } from '@/lib/billing/plan-pricing'

export default function SoloDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, codeRes, studentsRes] = await Promise.all([
        fetch('/api/solo/dashboard', { credentials: 'include' }),
        fetch('/api/solo/enrollment-code', { credentials: 'include' }),
        fetch('/api/solo/students', { credentials: 'include' }),
      ])
      const dashJson = await dashRes.json()
      const codeJson = await codeRes.json()
      const studentsJson = await studentsRes.json()
      if (!dashRes.ok) throw new Error(dashJson.error || 'Failed to load dashboard')
      setDashboard(dashJson.data)
      setEnrollment(codeRes.ok ? codeJson.data : null)
      setStudents(studentsRes.ok ? studentsJson.data || [] : [])
    } catch (e) {
      toast.error(e.message || 'Could not load solo dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const copyCode = () => {
    if (!enrollment?.enrollmentCode) return
    navigator.clipboard.writeText(enrollment.enrollmentCode)
    toast.success('Enrollment code copied')
  }

  const copyLogin = () => {
    if (!enrollment?.loginUrl) return
    navigator.clipboard.writeText(enrollment.loginUrl)
    toast.success('Portal login link copied')
  }

  const regenerateCode = async () => {
    try {
      const res = await fetch('/api/solo/enrollment-code/regenerate', {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success('New enrollment code generated')
      loadAll()
    } catch (e) {
      toast.error(e.message || 'Could not regenerate code')
    }
  }

  const removeStudent = async (id) => {
    if (!window.confirm('Remove this student from your workspace?')) return
    try {
      const res = await fetch(`/api/solo/students/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success('Student removed')
      loadAll()
    } catch (e) {
      toast.error(e.message || 'Could not remove student')
    }
  }

  const plan = dashboard?.school?.plan || 'individual'
  const stats = dashboard?.stats || {}

  return (
    <DashboardLayout title="Solo workspace">
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">Solo teacher workspace</h1>
            <p className="text-royalPurple-text2 mt-1">
              Manage your classes, lesson plans, and enrolled students.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-royalPurple-border bg-white">
              {PLAN_LABELS[plan] || plan}
            </span>
            {plan === 'individual' || plan === 'individual_free' ? (
              <Link href="/dashboard/billing">
                <Button size="sm">Upgrade to Premium</Button>
              </Link>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="text-royalPurple-text3">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Lesson plans', value: stats.lessonPlans ?? 0, icon: BookOpen },
                {
                  label: 'Students',
                  value: `${stats.students ?? 0}${stats.studentLimit ? ` / ${stats.studentLimit}` : ''}`,
                  icon: Users,
                },
                { label: 'Materials', value: stats.materials ?? 0, icon: ClipboardList },
                { label: 'Assessments', value: stats.assessments ?? 0, icon: Sparkles },
              ].map((item) => (
                <Card key={item.label} className="white-card">
                  <CardContent className="pt-6">
                    <item.icon className="h-5 w-5 text-royalPurple-accentTx mb-2" />
                    <p className="text-2xl font-bold text-royalPurple-text1">{item.value}</p>
                    <p className="text-xs text-royalPurple-text3">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="white-card">
                <CardHeader>
                  <CardTitle>Enroll students</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 rounded-xl border border-dashed border-royalPurple-border bg-royalPurple-card2/40">
                    <p className="text-xs text-royalPurple-text3 uppercase tracking-wide">
                      Enrollment code
                    </p>
                    <p className="text-3xl font-mono font-bold tracking-widest text-royalPurple-text1 mt-2">
                      {enrollment?.enrollmentCode || '———'}
                    </p>
                  </div>
                  <p className="text-sm text-royalPurple-text3">
                    Register students from your workspace user admin. Share your portal login link
                    so they can sign in after you create their accounts.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={copyCode}>
                      <Copy className="h-4 w-4 mr-1" /> Copy code
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyLogin}>
                      <Copy className="h-4 w-4 mr-1" /> Copy portal link
                    </Button>
                    <Button variant="ghost" size="sm" onClick={regenerateCode}>
                      <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
                    </Button>
                  </div>
                  {enrollment?.loginUrl ? (
                    <p className="text-xs text-royalPurple-text3 break-all">
                      {enrollment.loginUrl}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="white-card">
                <CardHeader>
                  <CardTitle>My tools</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { href: '/dashboard/teacher/lesson-planner', label: 'AI lesson planner' },
                    { href: '/dashboard/teacher/quiz-maker', label: 'AI quiz maker' },
                    { href: '/dashboard/teacher/story-weaver', label: 'AI story weaver' },
                    { href: '/dashboard/teacher/assessments/ecz', label: 'ECZ SBA hub' },
                    {
                      href: '/dashboard/teacher/assessments/question-bank',
                      label: 'Question bank',
                    },
                    { href: '/dashboard/innovation', label: 'Innovation hub' },
                  ].map((tool) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="rounded-lg border border-royalPurple-border px-3 py-2 text-sm text-royalPurple-text1 hover:bg-royalPurple-card2"
                    >
                      {tool.label}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="white-card">
              <CardHeader>
                <CardTitle>My students</CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-sm text-royalPurple-text3">
                    Share your enrollment code to add learners.
                  </p>
                ) : (
                  <ul className="divide-y divide-royalPurple-border">
                    {students.map((s) => (
                      <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-royalPurple-text1">{s.name}</p>
                          <p className="text-xs text-royalPurple-text3">{s.email}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeStudent(s.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {dashboard?.recentLessonPlans?.length ? (
              <Card className="white-card">
                <CardHeader>
                  <CardTitle>Recent lesson plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-royalPurple-border">
                    {dashboard.recentLessonPlans.map((p) => (
                      <li key={p.id} className="py-2 flex justify-between text-sm">
                        <span className="text-royalPurple-text1">
                          {p.subject} · {p.grade} · {p.topic}
                        </span>
                        <span className="text-royalPurple-text3">{p.status}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
