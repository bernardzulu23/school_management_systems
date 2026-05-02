'use client'

import { useMemo, useState } from 'react'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIStream } from '@/hooks/useAIStream'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const GRADES = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6',
]

export default function AILessonPlanner() {
  const [form, setForm] = useState({
    grade: 'Grade 9',
    subject: 'English',
    topic: '',
    duration: 40,
    learningStyle: 'mixed',
    priorKnowledge: '',
    templateType: 'standard',
  })

  const { text, loading, error, done, start, reset, stop } = useAIStream('/api/ai/lesson-planner')

  const canGenerate = useMemo(
    () => form.topic.trim() && form.subject.trim(),
    [form.topic, form.subject]
  )

  const generate = async () => {
    if (!canGenerate) return
    await start(form)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(text || '')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade</Label>
            <select
              className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
              value={form.grade}
              onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
            >
              {GRADES.map((g) => (
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
          <div className="space-y-2 md:col-span-2">
            <Label>Lesson Plan Format</Label>
            <select
              className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
              value={form.templateType}
              onChange={(e) => setForm((p) => ({ ...p, templateType: e.target.value }))}
            >
              <option value="standard">Standard CBC (All Subjects)</option>
              <option value="science">Science Practical Lab Lesson</option>
              <option value="language">Language Skills Lesson (LSRW)</option>
              <option value="business">Business & Accounts Lesson</option>
              <option value="practical">Vocational/Practical Workshop Lesson</option>
              <option value="humanities">Humanities & Social Sciences Lesson</option>
              <option value="arts">Arts, Music & Creative Lesson</option>
              <option value="technology">Technology & ICT Lesson</option>
              <option value="mathematics">Mathematics Lesson (Problem-Based)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={10}
              max={240}
              value={form.duration}
              onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Learning Style</Label>
            <select
              className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
              value={form.learningStyle}
              onChange={(e) => setForm((p) => ({ ...p, learningStyle: e.target.value }))}
            >
              <option value="mixed">Mixed</option>
              <option value="visual">Visual</option>
              <option value="auditory">Auditory</option>
              <option value="kinesthetic">Kinesthetic</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Prior Knowledge (optional)</Label>
            <Input
              value={form.priorKnowledge}
              onChange={(e) => setForm((p) => ({ ...p, priorKnowledge: e.target.value }))}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <UpgradePrompt error={error} onDismiss={reset} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={generate} disabled={loading || !canGenerate}>
            {loading ? 'Generating...' : 'Generate Lesson'}
          </Button>
          {loading ? (
            <Button variant="outline" onClick={stop}>
              Stop
            </Button>
          ) : null}
          <Button variant="outline" onClick={reset} disabled={loading}>
            Reset
          </Button>
          <Button variant="outline" onClick={copy} disabled={!text}>
            Copy
          </Button>
          {done && text ? (
            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-6">
        <div className="text-royalPurple-text1 font-semibold mb-3">Lesson Plan</div>
        <div className="whitespace-pre-wrap text-sm text-royalPurple-text2">
          {text || 'No output yet.'}
        </div>
      </div>
    </div>
  )
}
