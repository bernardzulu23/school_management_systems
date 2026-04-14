'use client'

import { useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { FeatureGate } from '@/components/FeatureGate'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIFetch } from '@/hooks/useAIStream'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function StudentECZPracticePage() {
  const { data, loading, error, fetch } = useAIFetch('/api/ai/ecz-practice')
  const paper = data?.paper || null

  const [form, setForm] = useState({
    subject: 'English Language',
    examLevel: 'grade9',
    topic: '',
    questionCount: 5,
  })

  const canGenerate = useMemo(
    () => form.subject.trim() && form.topic.trim(),
    [form.subject, form.topic]
  )

  return (
    <DashboardLayout title="ECZ Practice">
      <div className="space-y-4">
        <Link href="/dashboard/student">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <FeatureGate featureId="ecz-practice">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                ECZ Practice Papers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exam Level</Label>
                  <select
                    className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                    value={form.examLevel}
                    onChange={(e) => setForm((p) => ({ ...p, examLevel: e.target.value }))}
                  >
                    <option value="grade9">Grade 9</option>
                    <option value="grade12">Grade 12</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Topic</Label>
                  <Input
                    value={form.topic}
                    onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Question Count</Label>
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={form.questionCount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, questionCount: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {error ? <UpgradePrompt error={error} /> : null}

              <Button onClick={() => fetch(form)} disabled={loading || !canGenerate}>
                {loading ? 'Generating...' : 'Create Practice Paper'}
              </Button>
            </CardContent>
          </Card>

          {paper ? (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1">
                  {paper?.examInfo?.subject} • {paper?.examInfo?.level}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-royalPurple-text2">
                  {paper?.examInfo?.topic} • Total marks: {paper?.examInfo?.totalMarks} • Time:{' '}
                  {paper?.examInfo?.timeAllowed}
                </div>
                <div className="space-y-3">
                  {(paper.questions || []).map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl border border-royalPurple-border bg-royalPurple-card/60"
                    >
                      <div className="text-royalPurple-text1 font-semibold">
                        Q{idx + 1}. {q.question}
                      </div>
                      {Array.isArray(q.options) && q.options.length > 0 ? (
                        <ul className="list-disc ml-5 mt-2 text-royalPurple-text2 text-sm">
                          {q.options.map((o, i) => (
                            <li key={i}>{o}</li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-2 text-sm text-emerald-200">Answer: {q.answer}</div>
                      {q.explanation ? (
                        <div className="mt-1 text-xs text-royalPurple-text3">{q.explanation}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
