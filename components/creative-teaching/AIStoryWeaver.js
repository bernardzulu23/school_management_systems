'use client'

import { useState } from 'react'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIStream } from '@/hooks/useAIStream'
import { BookOpen, Check, Copy, PenLine, Printer, Sparkles, Trash2 } from 'lucide-react'
import { CANONICAL_SUBJECTS } from '@/lib/ai/subject-adaptive-prompts'

const GRADES = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']
const SUBJECTS = CANONICAL_SUBJECTS
const STORY_TYPES = [
  { id: 'story', label: 'Narrative Story', desc: 'Engaging story with characters' },
  { id: 'fable', label: 'Fable', desc: 'Animal story with a moral lesson' },
  { id: 'dialogue', label: 'Dialogue', desc: 'Conversation between characters' },
  { id: 'poem', label: 'Poem', desc: 'Rhythmic verse on the topic' },
]
const ZAMBIAN_SETTINGS = [
  'Lusaka',
  'Copperbelt',
  'Eastern Province',
  'Luangwa Valley',
  'Kafue River',
  'Victoria Falls',
  'a rural village',
  'a secondary school',
]

export default function AIStoryWeaver() {
  const [form, setForm] = useState({
    grade: 'Form 3',
    subject: 'English (Core)',
    topic: '',
    storyType: 'story',
    setting: 'Eastern Province',
    length: 'medium',
    includeQuestions: true,
  })
  const { text: story, loading, error, start, reset, stop } = useAIStream('/api/ai/story-weaver')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    const lengthMap = { short: '2-3 paragraphs', medium: '4-5 paragraphs', long: '6-8 paragraphs' }
    await start({
      grade: form.grade,
      subject: form.subject,
      topic: form.topic,
      storyType: form.storyType,
      setting: form.setting,
      length: lengthMap[form.length],
      includeQuestions: form.includeQuestions,
    })
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(story)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const printStory = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>${form.topic} - ${form.grade}</title>
      <style>
        body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.8;color:#1a1a2e}
        h1{color:#4c1d95}p{margin:1em 0}
      </style></head><body>
      <h1>${form.topic}</h1>
      <p><em>${form.grade} · ${form.subject} · ${form.setting}</em></p>
      <hr/>
      <div>${story.replace(/\n/g, '<br/>')}</div>
      </body></html>
    `)
    win.print()
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        height: '100vh',
        background: '#EFECE5',
      }}
    >
      <div style={{ borderRight: '1px solid #111111', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
          <BookOpen size={22} color="#111111" aria-hidden="true" />
          <div>
            <h2 style={{ color: '#111111', fontSize: 17, fontWeight: 700, margin: 0 }}>
              AI Story Weaver
            </h2>
            <p style={{ color: '#666666', fontSize: 12, margin: 0 }}>
              Zambian-context educational stories
            </p>
          </div>
        </div>

        <Label>Grade</Label>
        <Select
          value={form.grade}
          onChange={(v) => setForm((f) => ({ ...f, grade: v }))}
          options={GRADES}
        />

        <Label>Subject</Label>
        <Select
          value={form.subject}
          onChange={(v) => setForm((f) => ({ ...f, subject: v }))}
          options={SUBJECTS}
        />

        <Label>Topic / Theme</Label>
        <input
          placeholder="e.g. Water cycle, Zambian independence, Photosynthesis..."
          value={form.topic}
          onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          style={inputStyle}
        />

        <Label>Story Type</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {STORY_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setForm((f) => ({ ...f, storyType: t.id }))}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
                border: `1px solid ${form.storyType === t.id ? '#FF3B00' : '#111111'}`,
                background: form.storyType === t.id ? '#FFFFFF' : 'transparent',
                color: form.storyType === t.id ? '#111111' : '#666666',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: '#666666', marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <Label>Zambian Setting</Label>
        <Select
          value={form.setting}
          onChange={(v) => setForm((f) => ({ ...f, setting: v }))}
          options={ZAMBIAN_SETTINGS}
        />

        <Label>Story Length</Label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {['short', 'medium', 'long'].map((l) => (
            <button
              key={l}
              onClick={() => setForm((f) => ({ ...f, length: l }))}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 8,
                fontSize: 12,
                border: `1px solid ${form.length === l ? '#FF3B00' : '#111111'}`,
                background: form.length === l ? '#FF3B00' : 'transparent',
                color: form.length === l ? '#fff' : '#666666',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="questions"
            checked={form.includeQuestions}
            onChange={(e) => setForm((f) => ({ ...f, includeQuestions: e.target.checked }))}
          />
          <label htmlFor="questions" style={{ color: '#666666', fontSize: 13 }}>
            Include comprehension questions
          </label>
        </div>

        {error ? <UpgradePrompt error={error} onDismiss={reset} /> : null}

        <button
          onClick={generate}
          disabled={loading || !form.topic.trim()}
          style={{
            width: '100%',
            padding: '13px',
            background: loading ? '#A8A7A2' : '#FF3B00',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid #fff3',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Weaving story...
            </>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} aria-hidden="true" />
              Generate Story
            </span>
          )}
        </button>
        {loading ? (
          <button
            onClick={stop}
            style={{
              width: '100%',
              padding: '11px',
              background: 'transparent',
              border: '1px solid #111111',
              borderRadius: 10,
              color: '#666666',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 10,
            }}
          >
            Stop
          </button>
        ) : null}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {story ? (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '12px 16px',
              borderBottom: '1px solid #111111',
              background: '#FFFFFF',
            }}
          >
            <button onClick={copyToClipboard} style={actionBtn}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {copied ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Copy size={16} aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>
            <button onClick={printStory} style={actionBtn}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Printer size={16} aria-hidden="true" />
                Print / Save PDF
              </span>
            </button>
            <button onClick={reset} style={{ ...actionBtn, marginLeft: 'auto', color: '#fca5a5' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={16} aria-hidden="true" />
                Clear
              </span>
            </button>
          </div>
        ) : null}

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {!story && !loading ? (
            <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
              <div style={{ marginBottom: 16 }}>
                <BookOpen size={56} color="#111111" aria-hidden="true" />
              </div>
              <h3 style={{ color: '#111111', fontWeight: 600, marginBottom: 8 }}>
                Your story will appear here
              </h3>
              <p style={{ color: '#666666', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
                Fill in the form and click "Generate Story" to create a Zambian-context educational
                story for your students
              </p>
            </div>
          ) : null}

          {loading ? (
            <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 16,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                <PenLine size={48} color="#111111" aria-hidden="true" />
              </div>
              <p style={{ color: '#666666', fontSize: 15 }}>Writing your story…</p>
              <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
            </div>
          ) : null}

          {story ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '2rem',
                border: '1px solid #111111',
                maxWidth: 760,
                margin: '0 auto',
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <Tag>{form.grade}</Tag>
                <Tag>{form.subject}</Tag>
                <Tag>{form.setting}</Tag>
                <Tag>{STORY_TYPES.find((t) => t.id === form.storyType)?.label}</Tag>
              </div>
              <h2
                style={{ color: '#f59e0b', fontWeight: 700, fontSize: 22, marginBottom: '1.25rem' }}
              >
                {form.topic}
              </h2>
              <div
                style={{ color: '#111111', lineHeight: 1.85, fontSize: 15, whiteSpace: 'pre-wrap' }}
              >
                {story}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <p
      style={{
        color: '#666666',
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 6,
        marginTop: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {children}
    </p>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, cursor: 'pointer' }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function Tag({ children }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 99,
        background: '#F5F2EB',
        border: '1px solid #111111',
        color: '#666666',
      }}
    >
      {children}
    </span>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#F5F2EB',
  border: '1px solid #111111',
  borderRadius: 8,
  color: '#111111',
  fontSize: 13,
  outline: 'none',
  marginBottom: 4,
  boxSizing: 'border-box',
}

const actionBtn = {
  padding: '7px 14px',
  background: '#F5F2EB',
  border: '1px solid #111111',
  borderRadius: 8,
  color: '#666666',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 500,
}
