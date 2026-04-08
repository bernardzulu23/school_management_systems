'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Layers } from 'lucide-react'

export default function TeacherSchemesPage() {
  return (
    <DashboardLayout userRole="teacher" title="Schemes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Schemes of Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-royalPurple-text2">
            Schemes of work is being enabled for your school. This page no longer 404s and will be
            connected to the module next.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
