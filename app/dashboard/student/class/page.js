'use client'

import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { BookOpen, GraduationCap } from 'lucide-react'

export default function StudentClassPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => api.getStudentDashboard().then((res) => res.data),
  })

  const myClass = dashboardData?.my_class

  return (
    <DashboardLayout title="My Class">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-royalPurple-accent" aria-hidden="true" />
              Class Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-royalPurple-text2">Loading…</div>
            ) : myClass ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                  <div className="text-xs text-royalPurple-text3">Class</div>
                  <div className="text-lg font-semibold text-royalPurple-text1">{myClass.name}</div>
                </div>
                <div className="p-4 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                  <div className="text-xs text-royalPurple-text3">Academic Year</div>
                  <div className="text-lg font-semibold text-royalPurple-text1">
                    {myClass.academic_year || '—'}
                  </div>
                </div>
                <div className="p-4 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                  <div className="text-xs text-royalPurple-text3">Class ID</div>
                  <div className="text-lg font-semibold text-royalPurple-text1">{myClass.id}</div>
                </div>
                <div className="p-4 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                  <div className="text-xs text-royalPurple-text3">Status</div>
                  <div className="text-lg font-semibold text-royalPurple-successTx">Active</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="mx-auto mb-3 w-12 h-12 rounded-lg bg-royalPurple-accentBg border border-royalPurple-border flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-royalPurple-accent" aria-hidden="true" />
                </div>
                <div className="text-royalPurple-text1 font-semibold">No class assigned yet</div>
                <div className="text-sm text-royalPurple-text2 mt-1">
                  Contact your administrator.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
