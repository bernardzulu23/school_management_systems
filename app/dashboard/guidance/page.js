'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { formatGuidanceScopeLabel } from '@/lib/guidance/guidanceAccess'
import { Briefcase, Layers, ClipboardList, Users, Heart, Megaphone, FileText } from 'lucide-react'

export default function GuidanceDashboardPage() {
  const { user } = useAuth()
  const scope = user?.guidanceAssignment?.scope
  const canReEntry = Boolean(user?.guidanceAssignment?.canManageReEntry)

  const quickLinks = [
    {
      title: 'Pupil register',
      description: 'Confidential register of pupils in your guidance scope.',
      href: '/dashboard/guidance/pupils',
      icon: Users,
    },
    {
      title: 'Case log',
      description: 'Counselling and welfare cases with confidentiality tiers.',
      href: '/dashboard/guidance/cases',
      icon: ClipboardList,
    },
    {
      title: 'Softcopy documents',
      description: 'Confidential counselling records, referrals, and programme files.',
      href: '/dashboard/guidance/documents',
      icon: FileText,
    },
    {
      title: 'Career guidance board',
      description: 'Bursaries, institutions, and career events for the school.',
      href: '/dashboard/guidance/resources',
      icon: Megaphone,
    },
    {
      title: 'Career clusters',
      description: 'Organise careers into clusters for pupils exploring pathways.',
      href: '/dashboard/guidance/career-clusters',
      icon: Layers,
    },
    {
      title: 'Careers',
      description: 'Maintain detailed career profiles, courses, and institutions.',
      href: '/dashboard/guidance/careers',
      icon: Briefcase,
    },
    ...(canReEntry
      ? [
          {
            title: 'Girls re-entry',
            description: 'Re-entry support records (restricted permission).',
            href: '/dashboard/guidance/reentry',
            icon: Heart,
          },
        ]
      : []),
  ]

  return (
    <DashboardLayout title="Guidance teacher">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Guidance teacher workspace</h1>
          <p className="text-royalPurple-text2 mt-1">
            Scope: {formatGuidanceScopeLabel(scope)}. Switch back to your teacher dashboard from the
            header when you need to teach.
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
