'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileText,
  Calendar,
  Eye,
} from 'lucide-react'

const LINKS = [
  {
    title: 'Class Allocations',
    href: '/dashboard/senior-teacher/allocation',
    description: 'Assign teachers to primary classes and subjects.',
    icon: BookOpen,
  },
  {
    title: 'Lesson Plans',
    href: '/dashboard/senior-teacher/lesson-plans',
    description: 'Review and approve submitted lesson plans.',
    icon: FileText,
  },
  {
    title: 'Exercises & Quizzes',
    href: '/dashboard/senior-teacher/quizzes',
    description: 'Approve or return quizzes assigned to you.',
    icon: ClipboardList,
  },
  {
    title: 'Primary Timetable',
    href: '/dashboard/senior-teacher/timetable',
    description: 'Inspect the primary timetable across all classes.',
    icon: Calendar,
  },
  {
    title: 'Teacher Monitoring',
    href: '/dashboard/senior-teacher/monitoring',
    description: 'Track workload, pending reviews, and coverage.',
    icon: Eye,
  },
]

export default function SeniorTeacherDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await sessionFetch('/api/dashboard/senior-teacher', {
          credentials: 'include',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!active) return
        if (res.ok && json?.success) setData(json.data)
        else setData(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const stats = data?.stats || {}
  const cards = [
    { label: 'Primary Teachers', value: stats.totalTeachers || 0, icon: Users },
    { label: 'Primary Classes', value: stats.totalClasses || 0, icon: GraduationCap },
    { label: 'Pending Lesson Plans', value: stats.pendingLessonPlans || 0, icon: FileText },
    { label: 'Pending Quizzes', value: stats.pendingAssessments || 0, icon: ClipboardList },
  ]

  return (
    <DashboardLayout title="Senior Teacher Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.label}
                className="bg-royalPurple-card border border-royalPurple-border2"
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-royalPurple-text2">{card.label}</p>
                    <p className="text-3xl font-bold text-royalPurple-text1">{card.value}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-royalPurple-card2 border border-royalPurple-border">
                    <Icon className="h-6 w-6 text-royalPurple-accent" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Primary oversight tools</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {LINKS.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div className="h-full rounded-2xl border border-royalPurple-border bg-royalPurple-card2 p-5 hover:border-royalPurple-border2 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-royalPurple-card border border-royalPurple-border">
                        <Icon className="h-5 w-5 text-royalPurple-accent" />
                      </div>
                      <h3 className="font-semibold text-royalPurple-text1">{item.title}</h3>
                    </div>
                    <p className="text-sm text-royalPurple-text2">{item.description}</p>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Teacher snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-royalPurple-text2 text-sm">Loading dashboard data...</p>
            ) : (data?.teachers || []).length === 0 ? (
              <p className="text-royalPurple-text2 text-sm">
                No primary teachers are assigned yet.
              </p>
            ) : (
              data.teachers.slice(0, 6).map((teacher) => (
                <div
                  key={teacher.id}
                  className="rounded-xl border border-royalPurple-border bg-royalPurple-card2 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-royalPurple-text1">{teacher.name}</p>
                    <p className="text-sm text-royalPurple-text2">
                      {teacher.classes.length} classes, {teacher.subjects.length} subjects
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-royalPurple-muted/60 text-royalPurple-text1">
                      {teacher.pendingLessonPlans} lesson plans pending
                    </span>
                    <span className="px-2 py-1 rounded-full bg-royalPurple-muted/60 text-royalPurple-text1">
                      {teacher.pendingAssessments} quizzes pending
                    </span>
                  </div>
                </div>
              ))
            )}
            <Link href="/dashboard/senior-teacher/monitoring">
              <Button variant="outline">Open full monitoring view</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
