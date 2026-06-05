'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

function emptyQuestion(idx) {
  return {
    id: `q_${idx}`,
    question: '',
    options: ['', '', '', ''],
    answer: '',
    explanation: '',
  }
}

export function InteractiveQuestionBuilder({
  questions,
  onChange,
  maxQuestions = 50,
  readOnly = false,
}) {
  const list = Array.isArray(questions) ? questions : []

  const update = (next) => {
    if (!readOnly) onChange(next)
  }

  const addQuestion = () => {
    if (readOnly || list.length >= maxQuestions) return
    update([...list, emptyQuestion(list.length + 1)])
  }

  const removeQuestion = (idx) => {
    if (readOnly) return
    update(list.filter((_, i) => i !== idx))
  }

  const patchQuestion = (idx, patch) => {
    update(list.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  }

  const patchOption = (qIdx, oIdx, value) => {
    const q = list[qIdx]
    const options = [...(q.options || ['', '', '', ''])]
    options[oIdx] = value
    patchQuestion(qIdx, { options })
  }

  return (
    <div className="space-y-4">
      {list.map((q, idx) => (
        <div
          key={q.id || idx}
          className="p-4 rounded-xl border border-royalPurple-border bg-royalPurple-card/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-royalPurple-text1">Question {idx + 1}</span>
            {!readOnly ? (
              <Button type="button" variant="outline" size="sm" onClick={() => removeQuestion(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Question text</Label>
            <Input
              value={q.question || ''}
              disabled={readOnly}
              onChange={(e) => patchQuestion(idx, { question: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(q.options || ['', '', '', '']).map((opt, oIdx) => (
              <div key={oIdx} className="space-y-1">
                <Label className="text-xs">Option {String.fromCharCode(65 + oIdx)}</Label>
                <Input
                  value={opt}
                  disabled={readOnly}
                  onChange={(e) => patchOption(idx, oIdx, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Correct answer (must match one option exactly)</Label>
            <Input
              value={q.answer || ''}
              disabled={readOnly}
              onChange={(e) => patchQuestion(idx, { answer: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Explanation (shown after student selects)</Label>
            <Input
              value={q.explanation || ''}
              disabled={readOnly}
              onChange={(e) => patchQuestion(idx, { explanation: e.target.value })}
            />
          </div>
        </div>
      ))}
      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          disabled={list.length >= maxQuestions}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add question ({list.length}/{maxQuestions})
        </Button>
      ) : null}
    </div>
  )
}
