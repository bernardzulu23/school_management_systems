'use client'

import { useState } from 'react'

const GRADES = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']
const SUBJECTS = [
  'English',
  'Science',
  'Social Studies',
  'Mathematics',
  'History',
  'Geography',
  'Biology',
  'Civic Education',
]
const STORY_TYPES = [
  { id: 'story', label: '📖 Narrative Story', desc: 'Engaging story with characters' },
  { id: 'fable', label: '🦁 Fable', desc: 'Animal story with a moral lesson' },
  { id: 'dialogue', label: '💬 Dialogue', desc: 'Conversation between characters' },
  { id: 'poem', label: '✍️ Poem', desc: 'Rhythmic verse on the topic' },
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
    subject: 'English',
    topic: '',
    storyType: 'story',
    setting: 'Eastern Province',
    length: 'medium',
    includeQuestions: true,
  })
  const [story, setStory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!form.topic.trim()) {
      setError('Please enter a topic first')
      return
    }
    setLoading(true)
    setError('')
    setStory('')

    const lengthMap = { short: '2-3 paragraphs', medium: '4-5 paragraphs', long: '6-8 paragraphs' }

    try {
      const res = await fetch('/api/ai/story-weaver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grade: form.grade,
          subject: form.subject,
          topic: form.topic,
          storyType: form.storyType,
          setting: form.setting,
          length: lengthMap[form.length],
          includeQuestions: form.includeQuestions,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to generate story')
      setStory(String(data?.story || ''))
    } catch (err) {
      setError(err?.message || 'Failed to generate story')
    } finally {
      setLoading(false)
    }
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
        background: '#170d28',
      }}
    >
      <div style={{ borderRight: '1px solid #3b2a66', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
          <span style={{ fontSize: 24 }}>📚</span>
          <div>
            <h2 style={{ color: '#ede9fe', fontSize: 17, fontWeight: 700, margin: 0 }}>
              AI Story Weaver
            </h2>
            <p style={{ color: '#6d28d9', fontSize: 12, margin: 0 }}>
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
                border: `1px solid ${form.storyType === t.id ? '#7c3aed' : '#3b2a66'}`,
                background: form.storyType === t.id ? '#2d1f4e' : 'transparent',
                color: form.storyType === t.id ? '#ede9fe' : '#a78bfa',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: '#6d28d9', marginTop: 2 }}>{t.desc}</div>
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
                border: `1px solid ${form.length === l ? '#7c3aed' : '#3b2a66'}`,
                background: form.length === l ? '#7c3aed' : 'transparent',
                color: form.length === l ? '#fff' : '#a78bfa',
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
          <label htmlFor="questions" style={{ color: '#a78bfa', fontSize: 13 }}>
            Include comprehension questions
          </label>
        </div>

        {error ? (
          <div
            style={{
              background: '#3b0a0a',
              border: '1px solid #7f1d1d',
              borderRadius: 8,
              padding: '10px 12px',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          onClick={generate}
          disabled={loading || !form.topic.trim()}
          style={{
            width: '100%',
            padding: '13px',
            background: loading ? '#4b3575' : '#7c3aed',
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
            '✨ Generate Story'
          )}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {story ? (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '12px 16px',
              borderBottom: '1px solid #3b2a66',
              background: '#2d1f4e',
            }}
          >
            <button onClick={copyToClipboard} style={actionBtn}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button onClick={printStory} style={actionBtn}>
              🖨️ Print / Save PDF
            </button>
            <button
              onClick={() => setStory('')}
              style={{ ...actionBtn, marginLeft: 'auto', color: '#fca5a5' }}
            >
              🗑️ Clear
            </button>
          </div>
        ) : null}

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {!story && !loading ? (
            <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📖</div>
              <h3 style={{ color: '#ede9fe', fontWeight: 600, marginBottom: 8 }}>
                Your story will appear here
              </h3>
              <p style={{ color: '#6d28d9', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
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
                ✍️
              </div>
              <p style={{ color: '#a78bfa', fontSize: 15 }}>Writing your story…</p>
              <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
            </div>
          ) : null}

          {story ? (
            <div
              style={{
                background: '#2d1f4e',
                borderRadius: 14,
                padding: '2rem',
                border: '1px solid #3b2a66',
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
                style={{ color: '#ede9fe', lineHeight: 1.85, fontSize: 15, whiteSpace: 'pre-wrap' }}
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
        color: '#a78bfa',
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
        background: '#261843',
        border: '1px solid #3b2a66',
        color: '#a78bfa',
      }}
    >
      {children}
    </span>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#261843',
  border: '1px solid #3b2a66',
  borderRadius: 8,
  color: '#ede9fe',
  fontSize: 13,
  outline: 'none',
  marginBottom: 4,
  boxSizing: 'border-box',
}

const actionBtn = {
  padding: '7px 14px',
  background: '#261843',
  border: '1px solid #3b2a66',
  borderRadius: 8,
  color: '#a78bfa',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 500,
}
