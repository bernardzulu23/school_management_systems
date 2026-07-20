'use client'

import { useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { FeatureGate } from '@/components/FeatureGate'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIStream } from '@/hooks/useAIStream'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TeacherReportCommentsPage() {
  const { text, loading, error, start, reset, stop } = useAIStream('/api/ai/report-comments', {
    plainText: true,
  })
  const [form, setForm] = useState({
    studentName: '',
    grade: 'Form 1',
    subject: 'English',
    marks: 0,
    maxMarks: 100,
    behavior: 'Good',
    attendance: 'Regular',
    strengths: '',
    areasForImprovement: '',
  })

  const canGenerate = useMemo(
    () => form.studentName.trim() && form.grade.trim() && form.subject.trim(),
    [form.studentName, form.grade, form.subject]
  )

  return (
    <DashboardLayout title="AI Report Comments">
      <div className="space-y-4">
        <Link href="/dashboard/teacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <FeatureGate featureId="ai-report-comments">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Report Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student Name</Label>
                  <Input
                    value={form.studentName}
                    onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input
                    value={form.grade}
                    onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marks</Label>
                    <Input
                      type="number"
                      value={form.marks}
                      onChange={(e) => setForm((p) => ({ ...p, marks: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Marks</Label>
                    <Input
                      type="number"
                      value={form.maxMarks}
                      onChange={(e) => setForm((p) => ({ ...p, maxMarks: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Behavior</Label>
                  <Input
                    value={form.behavior}
                    onChange={(e) => setForm((p) => ({ ...p, behavior: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attendance</Label>
                  <Input
                    value={form.attendance}
                    onChange={(e) => setForm((p) => ({ ...p, attendance: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Strengths (comma separated)</Label>
                  <Input
                    value={form.strengths}
                    onChange={(e) => setForm((p) => ({ ...p, strengths: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Areas for Improvement (comma separated)</Label>
                  <Input
                    value={form.areasForImprovement}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, areasForImprovement: e.target.value }))
                    }
                  />
                </div>
              </div>

              {error ? <UpgradePrompt error={error} onDismiss={reset} /> : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    start({
                      ...form,
                      strengths: form.strengths
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                      areasForImprovement: form.areasForImprovement
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  disabled={loading || !canGenerate}
                >
                  {loading ? 'Generating...' : 'Generate Comment'}
                </Button>
                {loading ? (
                  <Button variant="outline" onClick={stop}>
                    Stop
                  </Button>
                ) : null}
                <Button variant="outline" onClick={reset} disabled={loading}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm text-royalPurple-text2">
                {text || 'No output yet.'}
              </div>
            </CardContent>
          </Card>
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
