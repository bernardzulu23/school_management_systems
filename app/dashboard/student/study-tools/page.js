'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, PenTool, Calendar, Timer, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function StudyToolsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">Study Tools</h1>
        <p className="text-slate-300">Essential tools to boost your productivity and learning.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Calculator className="mr-2 text-blue-400" />
                Scientific Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Advanced calculator for math and science problems.</p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Open Calculator</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Timer className="mr-2 text-red-400" />
                Pomodoro Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Focus timer to manage your study sessions effectively.</p>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Start Timer</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <FileText className="mr-2 text-yellow-400" />
                Flashcard Maker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Create and review flashcards for memorization.</p>
              <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">Create Flashcards</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Calendar className="mr-2 text-green-400" />
                Study Planner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Organize your study schedule and deadlines.</p>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Open Planner</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <PenTool className="mr-2 text-purple-400" />
                Digital Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Take and organize your class notes digitally.</p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">Take Notes</Button>
            </CardContent>
          </Card>
          
           <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Search className="mr-2 text-indigo-400" />
                Research Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4 text-sm">Find academic resources and citations.</p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">Start Research</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
