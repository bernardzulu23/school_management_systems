'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Loader2, Download } from 'lucide-react'

export function EczExamScenarioBuilder({ subjects = [] }) {
  const [subject, setSubject] = useState(subjects[0]?.name || '')
  const [form, setForm] = useState('Form 2')
  const [topic, setTopic] = useState('')
  const [elementOfConstruct, setElementOfConstruct] = useState('')
  const [scenarioCount, setScenarioCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [scenarios, setScenarios] = useState([])
  const [validation, setValidation] = useState(null)

  const handleGenerate = async () => {
    if (!subject.trim() || !topic.trim()) {
      toast.error('Subject and topic are required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/ecz-exam-questions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          form,
          topic,
          elementOfConstruct: elementOfConstruct || undefined,
          scenarioCount,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setScenarios(json.scenarios || [])
      setValidation(json.validation || null)
      toast.success('Exam scenarios generated')
    } catch (e) {
      toast.error(e.message || 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  const downloadText = () => {
    const text = scenarios
      .map((s) => {
        const subs = (s.subQuestions || [])
          .map(
            (sq) =>
              `  ${sq.number} [${sq.commandTerm}] ${sq.question} (${sq.marks}m)\n     Answer: ${sq.modelAnswer || ''}`
          )
          .join('\n')
        return `Q${s.questionNumber}. ${s.zambianScenario}\nEoC: ${s.elementOfConstruct}\n${subs}`
      })
      .join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ecz-exam-${topic.slice(0, 30).replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generate ECSEOL-compliant scenario-based exam items (no MCQ). Each scenario includes Zambian
        context, command terms, and element of construct mapping.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
              {!subjects.length && subject ? (
                <SelectItem value={subject}>{subject}</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Form</Label>
          <Select value={form} onValueChange={setForm}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Form 1', 'Form 2', 'Form 3', 'Form 4'].map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Topic</Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis"
          />
        </div>
        <div>
          <Label>Element of construct (optional)</Label>
          <Input
            value={elementOfConstruct}
            onChange={(e) => setElementOfConstruct(e.target.value)}
            placeholder="From ECZ guidelines"
          />
        </div>
        <div>
          <Label>Scenarios</Label>
          <Select value={String(scenarioCount)} onValueChange={(v) => setScenarioCount(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Generate scenarios
        </Button>
        {scenarios.length > 0 && (
          <Button variant="outline" onClick={downloadText}>
            <Download className="h-4 w-4 mr-1" />
            Export text
          </Button>
        )}
      </div>

      {validation?.bloomWarnings?.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Bloom distribution notes:</strong>
          <ul className="list-disc pl-5 mt-1">
            {validation.bloomWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {scenarios.map((s) => (
        <div
          key={s.questionNumber}
          className="rounded-lg border border-royalPurple-border p-4 space-y-2"
        >
          <p className="font-medium">
            Question {s.questionNumber} — {s.totalMarks} marks
          </p>
          <p className="text-sm">{s.zambianScenario}</p>
          <p className="text-xs text-muted-foreground">EoC: {s.elementOfConstruct}</p>
          <ol className="list-decimal pl-5 text-sm space-y-2">
            {(s.subQuestions || []).map((sq) => (
              <li key={sq.number}>
                <span className="font-medium">[{sq.commandTerm}]</span> {sq.question} ({sq.marks}m)
                {sq.modelAnswer && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mark scheme: {sq.modelAnswer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}
