'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { MessageCircle, Send } from 'lucide-react'
import { RagReferencesPanel } from '@/components/ai/RagReferencesPanel'

/**
 * RAG-powered study Q&A for students (Phase 3 P3.6).
 */
export function StudyAssistant() {
  const [question, setQuestion] = useState('')
  const [subject, setSubject] = useState('')
  const [answer, setAnswer] = useState('')
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(false)

  const ask = async () => {
    if (!question.trim()) return
    setLoading(true)
    setAnswer('')
    setRefs([])
    try {
      const res = await fetch('/api/ai/study-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question, subject }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setAnswer(json.answer || '')
      setRefs(json.refs || [])
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
          Ask questions about your subjects. Answers use your school&apos;s uploaded study materials
          when available.
        </p>
        <input
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card p-2 text-sm"
          placeholder="Subject (optional) e.g. Mathematics"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className="w-full min-h-[100px] rounded-lg border border-royalPurple-border bg-royalPurple-card p-3 text-sm"
          placeholder="e.g. Explain photosynthesis for Grade 9"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button onClick={ask} disabled={loading} className="w-full sm:w-auto">
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
