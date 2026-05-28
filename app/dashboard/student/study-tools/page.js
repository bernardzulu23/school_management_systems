'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, PenTool, Calendar, Timer, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function StudyToolsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-royalPurple-text1 mb-8">Study Tools</h1>
        <p className="text-royalPurple-text2">
          Essential tools to boost your productivity and learning.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Calculator className="mr-2 text-royalPurple-accentTx" />
                Scientific Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Advanced calculator for math and science problems.
              </p>
              <Button className="w-full bg-royalPurple-accent hover:bg-royalPurple-accent text-royalPurple-text1">
                Open Calculator
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Timer className="mr-2 text-royalPurple-dangerTx" />
                Pomodoro Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Focus timer to manage your study sessions effectively.
              </p>
              <Button className="w-full bg-royalPurple-danger hover:bg-royalPurple-danger text-royalPurple-text1">
                Start Timer
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <FileText className="mr-2 text-warn" />
                Flashcard Maker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Create and review flashcards for memorization.
              </p>
              <Link href="/dashboard/student/flashcards">
                <Button className="w-full bg-warn hover:bg-g-700 text-royalPurple-text1">
                  Create Flashcards
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Calendar className="mr-2 text-royalPurple-successTx" />
                Study Planner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Organize your study schedule and deadlines.
              </p>
              <Button className="w-full bg-royalPurple-success hover:bg-royalPurple-success text-royalPurple-text1">
                Open Planner
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <PenTool className="mr-2 text-royalPurple-pillTx" />
                Digital Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Take and organize your class notes digitally.
              </p>
              <Button className="w-full bg-royalPurple-pill hover:bg-royalPurple-pill text-royalPurple-text1">
                Take Notes
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Search className="mr-2 text-royalPurple-pillTx" />
                Research Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4 text-sm">
                Find academic resources and citations.
              </p>
              <Button className="w-full bg-royalPurple-pill hover:bg-royalPurple-pill text-royalPurple-text1">
                Start Research
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
