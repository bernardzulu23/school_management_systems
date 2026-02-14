'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function StudyGroupsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">Study Groups</h1>
        <p className="text-slate-300">Join peer learning groups to collaborate and learn together.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="mr-2 text-green-400" />
                Math Whizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Focused on Algebra and Calculus problems.</p>
              <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
                <span>12 Members</span>
                <span>Active now</span>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Join Group</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="mr-2 text-blue-400" />
                Science Explorers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Discussing Physics and Chemistry experiments.</p>
              <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
                <span>8 Members</span>
                <span>2h ago</span>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Join Group</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="mr-2 text-purple-400" />
                Literature Club
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Book reviews and poetry analysis.</p>
              <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
                <span>15 Members</span>
                <span>Active now</span>
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">Join Group</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
