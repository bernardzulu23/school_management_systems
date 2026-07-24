'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { MessageCircle, Send } from 'lucide-react'
import { RagReferencesPanel } from '@/components/ai/RagReferencesPanel'
import {
  useStudentCurriculumTopics,
  useStudentEnrolledSubjects,
} from '@/hooks/useStudentCurriculumTopics'

/**
 * RAG-powered study Q&A for students — enrolled subjects + curriculum grounding.
 */
export function StudyAssistant() {
  const { subjects, loading: subjectsLoading, error: subjectsError } = useStudentEnrolledSubjects()
  const [question, setQuestion] = useState('')
  const [subject, setSubject] = useState('')
  const [topicHint, setTopicHint] = useState('')
  const [answer, setAnswer] = useState('')
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(false)

  const { topics, loading: topicsLoading, error: topicsError } = useStudentCurriculumTopics(subject)

  useEffect(() => {
    setTopicHint('')
  }, [subject])

  const ask = async () => {
    if (!subject.trim()) {
      setAnswer('Select one of your enrolled subjects first.')
      return
    }
    if (!question.trim()) return
    setLoading(true)
    setAnswer('')
    setRefs([])
    try {
      const prompt = topicHint
        ? `Regarding the curriculum topic "${topicHint}": ${question.trim()}`
        : question.trim()
      const res = await fetch('/api/ai/study-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: prompt, subject }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Request failed')
      const nextAnswer = json.answer || json.data?.answer || ''
      const nextRefs = json.refs || json.data?.refs || []
      setAnswer(nextAnswer)
      setRefs(Array.isArray(nextRefs) ? nextRefs : [])
    } catch (e) {
      setAnswer(e?.message || 'Could not get an answer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
          <MessageCircle className="h-5 w-5" />
          Study assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-royalPurple-text2">
          Ask questions about your enrolled subjects. Answers use the CDC syllabus and your
          school&apos;s uploaded study materials when available.
        </p>
        {subjectsError ? <p className="text-sm text-kpi-fail">{subjectsError}</p> : null}
        <select
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card p-2 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
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
        {subjects.length === 0 && !subjectsLoading ? (
          <p className="text-sm text-royalPurple-text3">
            No enrolled subjects found. Ask your school to register your subjects.
          </p>
        ) : null}
        {subject ? (
          <div className="space-y-1">
            <select
              className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card p-2 text-sm"
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              disabled={topicsLoading}
            >
              <option value="">
                {topicsLoading
                  ? 'Loading curriculum topics…'
                  : topics.length
                    ? 'Curriculum topic (optional)…'
                    : 'No syllabus topics listed (optional)'}
              </option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {topicsError ? <p className="text-xs text-kpi-fail">{topicsError}</p> : null}
          </div>
        ) : null}
        <textarea
          className="w-full min-h-[100px] rounded-lg border border-royalPurple-border bg-royalPurple-card p-3 text-sm"
          placeholder="e.g. Explain this topic with a Zambian example"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button onClick={ask} disabled={loading || !subject} className="w-full sm:w-auto">
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Thinking…' : 'Ask'}
        </Button>
        {refs.length > 0 ? <RagReferencesPanel references={refs} /> : null}
        {answer ? (
          <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/50 p-4 text-sm whitespace-pre-wrap text-royalPurple-text1">
            {answer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
