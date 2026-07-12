'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Calendar, FileText, BarChart3 } from 'lucide-react'

const MINUTES_GRACE_DAYS = 3

export default function SicDashboardPage() {
  const quickLinks = [
    {
      title: 'Department CPD plans',
      description:
        'Review and accept department CPD plans. Minutes must arrive within three days of the meeting.',
      href: '/dashboard/sic/cpd-plans',
      icon: ClipboardList,
    },
    {
      title: 'HIM meetings',
      description: 'Schedule and record Headteacher In-service Meetings you chair.',
      href: '/dashboard/sic/him',
      icon: Calendar,
    },
    {
      title: 'School CPD activity plans',
      description: 'Publish school-wide CPD activity plans from department reports.',
      href: '/dashboard/sic/activity-plans',
      icon: FileText,
    },
    {
      title: 'Compliance analytics',
      description: `Track submissions and inactive departments (minutes overdue after ${MINUTES_GRACE_DAYS} days).`,
      href: '/dashboard/sic/analytics',
      icon: BarChart3,
    },
  ]

  return (
    <DashboardLayout title="School In-service Coordinator">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">SIC workspace</h1>
          <p className="text-royalPurple-text2 mt-1">
            You chair school CPD and HIM. Switch back to your teacher dashboard from the header when
            you need to teach.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.title} href={item.href}>
                <Card className="hover:border-royalPurple-accentTx transition-colors h-full">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <Icon className="h-5 w-5 text-royalPurple-accentTx" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-royalPurple-text2">{item.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
