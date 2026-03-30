'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Users, ArrowLeft } from 'lucide-react'

export default function TeacherCommunityPage() {
  return (
    <DashboardLayout title="Community">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/teacher">
            <Button
              variant="outline"
              className="border border-royalPurple-border2 text-royalPurple-text2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card className="bg-royalPurple-card border border-royalPurple-border rounded-2xl overflow-hidden">
          <CardHeader className="bg-royalPurple-card2 border-b border-royalPurple-border">
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <Users className="h-5 w-5 text-royalPurple-text2" />
              Teacher Community
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-royalPurple-card p-6">
            <div className="text-royalPurple-text2">
              This section is ready to connect teachers for resource sharing and mentoring. Next:
              channels, posts, and direct messages.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
