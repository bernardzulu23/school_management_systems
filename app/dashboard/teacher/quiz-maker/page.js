'use client'

import { useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIFetch } from '@/hooks/useAIStream'
import { FeatureGate } from '@/components/FeatureGate'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TeacherQuizMakerPage() {
  const { data, loading, error, fetch } = useAIFetch('/api/ai/quiz-maker')
  const quiz = data?.quiz || null

  const FORM_LEVELS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']

  const [form, setForm] = useState({
    grade: 'Form 2',
    subject: 'English',
    topic: '',
    questionCount: 10,
    difficulty: 'medium',
  })

  const canGenerate = useMemo(
    () => form.topic.trim() && form.subject.trim(),
    [form.topic, form.subject]
  )

  return (
    <DashboardLayout title="AI Quiz Maker">
      <div className="space-y-4">
        <Link href="/dashboard/teacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <FeatureGate featureId="ai-quiz-maker">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Quiz Maker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Form level</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.grade}
                    onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                  >
                    {FORM_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  />
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
                    min={5}
                    max={30}
                    value={form.questionCount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, questionCount: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <select
                    className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                    value={form.difficulty}
                    onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {error ? <UpgradePrompt error={error} /> : null}

              <Button onClick={() => fetch(form)} disabled={loading || !canGenerate}>
                {loading ? 'Generating...' : 'Create Quiz'}
              </Button>
            </CardContent>
          </Card>

          {quiz ? (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1">{quiz.title || 'Quiz'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-royalPurple-text2">
                  {quiz.grade} • {quiz.subject} • {quiz.topic} • Total marks: {quiz.totalMarks}
                </div>
                <div className="space-y-3">
                  {(quiz.questions || []).map((q, idx) => (
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
                      <div className="mt-2 text-sm text-kpi-pass/30">Answer: {q.answer}</div>
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
