'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { CurriculumTopicSelect } from '@/components/curriculum/CurriculumTopicSelect'
import {
  ECZ_PRACTICE_EXAM_LEVEL_GROUPS,
  formatEczExamLevelLabel,
  resolveSelectableEczExamLevel,
} from '@/lib/ecz/ecz-practice-levels'
import { RagReferencesPanel } from '@/components/ai/RagReferencesPanel'
import { useStudentEnrolledSubjects } from '@/hooks/useStudentCurriculumTopics'

export default function StudentECZPracticePage() {
  const { data, loading, error, fetch } = useAIFetch('/api/ai/ecz-practice')
  const paper = data?.paper || null
  const ragReferences = Array.isArray(data?.ragReferences) ? data.ragReferences : []

  const { subjects, gradeOrForm, loading: subjectsLoading } = useStudentEnrolledSubjects()
  const [form, setForm] = useState({
    subject: '',
    examLevel: 'form1',
    topic: '',
    questionCount: 5,
  })

  useEffect(() => {
    if (gradeOrForm) {
      setForm((p) => ({
        ...p,
        examLevel: resolveSelectableEczExamLevel(gradeOrForm),
      }))
    }
  }, [gradeOrForm])

  useEffect(() => {
    setForm((p) => ({ ...p, topic: '' }))
  }, [form.subject, gradeOrForm])

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
              <p className="text-sm text-royalPurple-text2">
                Practice papers use your enrolled subjects and CDC syllabus topics for your form.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <select
                    className="w-full zsms-select"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    disabled={subjectsLoading}
                  >
                    <option value="">
                      {subjectsLoading ? 'Loading subjects…' : 'Choose enrolled subject…'}
                    </option>
                    {subjects.map((s) => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Exam Level</Label>
                  <select
                    className="w-full zsms-select"
                    value={form.examLevel}
                    onChange={(e) => setForm((p) => ({ ...p, examLevel: e.target.value }))}
                  >
                    {ECZ_PRACTICE_EXAM_LEVEL_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.levels.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <CurriculumTopicSelect
                  className="md:col-span-2"
                  subject={form.subject}
                  gradeOrForm={gradeOrForm || form.examLevel}
                  value={form.topic}
                  onChange={(topic) => setForm((p) => ({ ...p, topic }))}
                  label="Curriculum topic"
                  required
                  allowFreeFormWhenEmpty={false}
                  id="ecz-practice-topic"
                />
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
                  {paper?.examInfo?.subject} • {formatEczExamLevelLabel(paper?.examInfo?.level)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-royalPurple-text2">
                  {formatEczExamLevelLabel(paper?.examInfo?.level)} • {paper?.examInfo?.topic} •
                  Total marks: {paper?.examInfo?.totalMarks} • Time: {paper?.examInfo?.timeAllowed}
                </div>
                <RagReferencesPanel references={ragReferences} />
                <div className="space-y-3">
                  {(paper.scenarios || []).map((s) => (
                    <div
                      key={s.questionNumber}
                      className="p-4 rounded-xl border border-royalPurple-border bg-royalPurple-card/60 space-y-3"
                    >
                      <div className="text-royalPurple-text1 font-semibold">
                        Question {s.questionNumber}
                        {s.totalMarks ? ` — ${s.totalMarks} marks` : ''}
                      </div>
                      <p className="text-sm text-royalPurple-text2">{s.zambianScenario}</p>
                      {s.elementOfConstruct ? (
                        <p className="text-xs text-royalPurple-text3">
                          Element of construct: {s.elementOfConstruct}
                        </p>
                      ) : null}
                      {(s.subQuestions || []).length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-2 text-sm text-royalPurple-text2">
                          {(s.subQuestions || []).map((sq) => (
                            <li key={sq.number}>
                              <span className="font-medium text-royalPurple-text1">
                                [{sq.commandTerm}]
                              </span>{' '}
                              {sq.question}{' '}
                              <span className="text-royalPurple-text3">({sq.marks}m)</span>
                              {sq.modelAnswer ? (
                                <p className="mt-1 text-xs text-kpi-pass/30">
                                  Mark scheme: {sq.modelAnswer}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </div>
                  ))}
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
                      <div className="mt-2 text-sm text-kpi-pass/30">Answer: {q.answer}</div>
                      {q.explanation ? (
                        <div className="mt-1 text-xs text-royalPurple-text3">{q.explanation}</div>
                      ) : null}
                    </div>
                  ))}
                  {!((paper.scenarios || []).length || (paper.questions || []).length) ? (
                    <p className="text-sm text-royalPurple-text3">
                      No questions were returned for this paper. Try generating again with a
                      different topic or question count.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
