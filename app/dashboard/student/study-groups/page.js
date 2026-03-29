'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function StudyGroupsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-royalPurple-text1 mb-8">Study Groups</h1>
        <p className="text-royalPurple-text2">
          Join peer learning groups to collaborate and learn together.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Users className="mr-2 text-royalPurple-successTx" />
                Math Whizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Focused on Algebra and Calculus problems.
              </p>
              <div className="flex justify-between items-center text-xs text-royalPurple-text3 mb-4">
                <span>12 Members</span>
                <span>Active now</span>
              </div>
              <Button className="w-full bg-royalPurple-success hover:bg-royalPurple-success text-royalPurple-text1">
                Join Group
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Users className="mr-2 text-royalPurple-accentTx" />
                Science Explorers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Discussing Physics and Chemistry experiments.
              </p>
              <div className="flex justify-between items-center text-xs text-royalPurple-text3 mb-4">
                <span>8 Members</span>
                <span>2h ago</span>
              </div>
              <Button className="w-full bg-royalPurple-accent hover:bg-royalPurple-accent text-royalPurple-text1">
                Join Group
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Users className="mr-2 text-royalPurple-pillTx" />
                Literature Club
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Book reviews and poetry analysis.
              </p>
              <div className="flex justify-between items-center text-xs text-royalPurple-text3 mb-4">
                <span>15 Members</span>
                <span>Active now</span>
              </div>
              <Button className="w-full bg-royalPurple-pill hover:bg-royalPurple-pill text-royalPurple-text1">
                Join Group
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
