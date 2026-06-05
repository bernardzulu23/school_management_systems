'use client'

import { useState } from 'react'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIStream } from '@/hooks/useAIStream'
import {
  BookOpen,
  Bookmark,
  Check,
  Copy,
  FileText,
  PenLine,
  Plus,
  Printer,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
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
const CBC_COMPETENCIES = [
  'Communication',
  'Critical thinking',
  'Creativity',
  'Collaboration',
  'Digital literacy',
]
const QUESTION_TYPE_OPTIONS = [
  { id: 'literal', label: 'Literal — recall facts' },
  { id: 'inferential', label: 'Inferential — read between the lines' },
  { id: 'evaluative', label: 'Evaluative — opinion and judgement' },
]
const STORY_LIBRARY_KEY = 'story-weaver-library'

const defaultForm = {
  grade: 'Form 3',
  subject: 'English (Core)',
  topic: '',
  storyType: 'story',
  setting: 'Eastern Province',
  length: 'medium',
  includeQuestions: true,
  cbcCompetencies: ['Communication', 'Critical thinking'],
  characters: [],
  characterMode: 'auto',
  vocabularyWords: [],
  languageMode: 'bilingual',
  questionTypes: { literal: true, inferential: true, evaluative: false },
  questionCount: 5,
  vocabularyExercises: true,
  discussionPrompts: true,
  writingExtension: false,
}

export default function AIStoryWeaver() {
  const [form, setForm] = useState(defaultForm)
  const [characterDraft, setCharacterDraft] = useState('')
  const [vocabDraft, setVocabDraft] = useState('')
  const [savedHint, setSavedHint] = useState('')
  const { text: story, loading, error, start, reset, stop } = useAIStream('/api/ai/story-weaver')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    const lengthMap = { short: '2-3 paragraphs', medium: '4-5 paragraphs', long: '6-8 paragraphs' }
    const includeQuestions =
      form.questionTypes.literal ||
      form.questionTypes.inferential ||
      form.questionTypes.evaluative ||
      form.vocabularyExercises ||
      form.discussionPrompts ||
      form.writingExtension
    await start({
      grade: form.grade,
      subject: form.subject,
      topic: form.topic,
      storyType: form.storyType,
      setting: form.setting,
      length: lengthMap[form.length],
      includeQuestions,
      cbcCompetencies: form.cbcCompetencies,
      characters: form.characters,
      characterMode: form.characterMode,
      vocabularyWords: form.vocabularyWords,
      languageMode: form.languageMode,
      questionTypes: form.questionTypes,
      questionCount: form.questionCount,
      vocabularyExercises: form.vocabularyExercises,
      discussionPrompts: form.discussionPrompts,
      writingExtension: form.writingExtension,
    })
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(story)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openPrintWindow = (titleSuffix = '') => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>${form.topic}${titleSuffix} - ${form.grade}</title>
      <style>
        body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.8;color:var(--color-ink,#111111)}
        h1{color:var(--color-brand-primary,#ff3b00)}p{margin:1em 0}
      </style></head><body>
      <h1>${form.topic}</h1>
      <p><em>${form.grade} · ${form.subject} · ${form.setting}</em></p>
      <hr/>
      <div>${story.replace(/\n/g, '<br/>')}</div>
      </body></html>
    `)
    return win
  }

  const printStory = () => {
    const win = openPrintWindow()
    if (win) win.print()
  }

  const saveToLibrary = () => {
    if (!story) return
    const entry = {
      id: `${Date.now()}`,
      topic: form.topic,
      grade: form.grade,
      subject: form.subject,
      setting: form.setting,
      storyType: form.storyType,
      story,
      savedAt: new Date().toISOString(),
    }
    const saved = JSON.parse(localStorage.getItem(STORY_LIBRARY_KEY) || '[]')
    saved.unshift(entry)
    localStorage.setItem(STORY_LIBRARY_KEY, JSON.stringify(saved.slice(0, 50)))
    setSavedHint('Saved to class story library')
    setTimeout(() => setSavedHint(''), 2500)
  }

  const shareStory = async () => {
    const text = `${form.topic}\n\n${story}`
    if (navigator.share) {
      try {
        await navigator.share({ title: form.topic, text })
        return
      } catch {
        /* fall through to copy */
      }
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleCompetency = (name) => {
    setForm((f) => {
      const selected = f.cbcCompetencies.includes(name)
        ? f.cbcCompetencies.filter((c) => c !== name)
        : [...f.cbcCompetencies, name]
      return { ...f, cbcCompetencies: selected.length ? selected : [name] }
    })
  }

  const addTag = (field, draft, setDraft) => {
    const value = draft.trim()
    if (!value) return
    setForm((f) => {
      const list = f[field]
      if (list.includes(value)) return f
      return { ...f, [field]: [...list, value] }
    })
    setDraft('')
  }

  const removeTag = (field, value) => {
    setForm((f) => ({ ...f, [field]: f[field].filter((item) => item !== value) }))
  }

  const toggleQuestionType = (id) => {
    setForm((f) => ({
      ...f,
      questionTypes: { ...f.questionTypes, [id]: !f.questionTypes[id] },
    }))
  }

  const adjustQuestionCount = (delta) => {
    setForm((f) => ({
      ...f,
      questionCount: Math.min(10, Math.max(1, f.questionCount + delta)),
    }))
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 bg-[var(--color-paper)] lg:grid-cols-[340px_1fr]">
      <aside className="flex flex-col gap-0 overflow-y-auto border-b border-[var(--color-form-border)] p-6 lg:border-b-0 lg:border-r">
        <header className="mb-5 flex items-center gap-2">
          <BookOpen className="size-[22px] text-[var(--color-ink)]" aria-hidden="true" />
          <div>
            <h2 className="m-0 text-[17px] font-bold text-[var(--text-primary)]">
              AI Story Weaver
            </h2>
            <p className="m-0 text-xs text-[var(--text-secondary)]">
              Zambian-context educational stories
            </p>
          </div>
        </header>

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
          className={inputClass}
        />

        <Label>Story Type</Label>
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {STORY_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, storyType: t.id }))}
              className={chipBtnClass(form.storyType === t.id)}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{t.desc}</div>
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
        <div className="mb-3 flex gap-1.5">
          {['short', 'medium', 'long'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setForm((f) => ({ ...f, length: l }))}
              className={[
                'flex-1 cursor-pointer rounded-lg border px-0 py-1.5 text-xs font-semibold capitalize',
                form.length === l
                  ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white'
                  : 'border-[var(--color-form-border)] bg-transparent text-[var(--text-secondary)]',
              ].join(' ')}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="sw mt-2 flex flex-col gap-0">
          <SwSection
            label="CBC competency alignment"
            badge="new"
            hint="Links story outcomes to Zambia 2023 CBC core competencies"
          >
            <div className="flex flex-wrap gap-1.5">
              {CBC_COMPETENCIES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleCompetency(name)}
                  className={chipClass(form.cbcCompetencies.includes(name))}
                >
                  {name}
                </button>
              ))}
            </div>
          </SwSection>

          <SwSection label="Characters" badge="new">
            <TagBox
              tags={form.characters}
              draft={characterDraft}
              onDraftChange={setCharacterDraft}
              placeholder="Add"
              onAdd={() => addTag('characters', characterDraft, setCharacterDraft)}
              onRemove={(v) => removeTag('characters', v)}
              disabled={form.characterMode === 'auto'}
            />
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, characterMode: 'auto', characters: [] }))}
                className={chipClass(form.characterMode === 'auto', 'text-xs px-2.5 py-1')}
              >
                Auto Zambian names
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, characterMode: 'custom' }))}
                className={chipClass(form.characterMode === 'custom', 'text-xs px-2.5 py-1')}
              >
                Custom
              </button>
            </div>
          </SwSection>

          <SwSection
            label="Vocabulary focus"
            badge="new"
            hint="AI weaves these words naturally into the story"
          >
            <TagBox
              tags={form.vocabularyWords}
              draft={vocabDraft}
              onDraftChange={setVocabDraft}
              placeholder="Add word"
              onAdd={() => addTag('vocabularyWords', vocabDraft, setVocabDraft)}
              onRemove={(v) => removeTag('vocabularyWords', v)}
            />
          </SwSection>

          <SwSection label="Language mode" badge="new">
            <ToggleRow
              label="English only"
              active={form.languageMode === 'english'}
              onToggle={() => setForm((f) => ({ ...f, languageMode: 'english' }))}
            />
            <ToggleRow
              label="Bilingual"
              sub="Mix in Nyanja / Bemba phrases"
              active={form.languageMode === 'bilingual'}
              onToggle={() => setForm((f) => ({ ...f, languageMode: 'bilingual' }))}
            />
          </SwSection>

          <SwSection label="Comprehension questions" badge="enhanced">
            <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
              Question types
            </p>
            {QUESTION_TYPE_OPTIONS.map((opt) => (
              <CheckRow
                key={opt.id}
                label={opt.label}
                checked={form.questionTypes[opt.id]}
                onChange={() => toggleQuestionType(opt.id)}
              />
            ))}
            <div className="my-2 h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-primary)]">Number of questions</span>
              <Counter value={form.questionCount} onChange={adjustQuestionCount} />
            </div>
            <div className="my-2 h-px bg-[var(--border)]" />
            <CheckRow
              label="Vocabulary exercises"
              checked={form.vocabularyExercises}
              onChange={() =>
                setForm((f) => ({ ...f, vocabularyExercises: !f.vocabularyExercises }))
              }
            />
            <CheckRow
              label="Discussion prompts"
              checked={form.discussionPrompts}
              onChange={() => setForm((f) => ({ ...f, discussionPrompts: !f.discussionPrompts }))}
            />
            <CheckRow
              label="Writing extension activity"
              checked={form.writingExtension}
              onChange={() => setForm((f) => ({ ...f, writingExtension: !f.writingExtension }))}
            />
          </SwSection>

          {story ? (
            <SwSection
              label="Output and sharing"
              badge="new"
              hint="Saved stories appear in the class story library"
            >
              <div className="grid grid-cols-2 gap-1.5">
                <ExportBtn icon={FileText} label="PDF" onClick={printStory} />
                <ExportBtn icon={Printer} label="Print" onClick={printStory} />
                <ExportBtn icon={Bookmark} label="Save" onClick={saveToLibrary} />
                <ExportBtn icon={Share2} label="Share" onClick={shareStory} />
              </div>
              {savedHint ? (
                <p className="mt-2 text-xs text-[var(--color-status-active)]">{savedHint}</p>
              ) : null}
            </SwSection>
          ) : null}
        </div>

        {error ? <UpgradePrompt error={error} onDismiss={reset} /> : null}

        <button
          type="button"
          onClick={generate}
          disabled={loading || !form.topic.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] border-0 py-3 text-[15px] font-bold text-white disabled:cursor-not-allowed"
          style={{
            background: loading ? 'var(--color-kpi-zero)' : 'var(--color-brand-primary)',
          }}
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Weaving story...
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden="true" />
              Generate Story
            </>
          )}
        </button>
        {loading ? (
          <button
            type="button"
            onClick={stop}
            className="mt-2.5 w-full cursor-pointer rounded-[10px] border border-[var(--color-form-border)] bg-transparent py-2.5 text-[13px] font-bold text-[var(--text-secondary)]"
          >
            Stop
          </button>
        ) : null}
      </aside>

      <section className="flex flex-col overflow-hidden">
        {story ? (
          <div className="flex flex-wrap gap-2 border-b border-[var(--color-form-border)] bg-[var(--surface)] px-4 py-3">
            <ActionBtn onClick={copyToClipboard}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </ActionBtn>
            <ActionBtn onClick={printStory}>
              <Printer className="size-4" />
              Print / Save PDF
            </ActionBtn>
            <ActionBtn onClick={reset} className="ml-auto text-[var(--color-kpi-fail)]">
              <Trash2 className="size-4" />
              Clear
            </ActionBtn>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-8">
          {!story && !loading ? (
            <div className="pt-16 text-center">
              <BookOpen
                className="mx-auto mb-4 size-14 text-[var(--color-ink)]"
                aria-hidden="true"
              />
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                Your story will appear here
              </h3>
              <p className="mx-auto max-w-[400px] text-sm text-[var(--text-secondary)]">
                Fill in the form and click Generate Story to create a Zambian-context educational
                story for your students
              </p>
            </div>
          ) : null}

          {loading ? (
            <div className="pt-16 text-center">
              <PenLine
                className="mx-auto mb-4 size-12 animate-pulse text-[var(--color-ink)]"
                aria-hidden="true"
              />
              <p className="text-[15px] text-[var(--text-secondary)]">Writing your story…</p>
            </div>
          ) : null}

          {story ? (
            <article className="mx-auto max-w-[760px] rounded-[14px] border border-[var(--color-form-border)] bg-[var(--surface)] p-8">
              <div className="mb-6 flex flex-wrap gap-2">
                <MetaTag>{form.grade}</MetaTag>
                <MetaTag>{form.subject}</MetaTag>
                <MetaTag>{form.setting}</MetaTag>
                <MetaTag>{STORY_TYPES.find((t) => t.id === form.storyType)?.label}</MetaTag>
                {form.languageMode === 'bilingual' ? <MetaTag>Bilingual</MetaTag> : null}
              </div>
              <h2 className="mb-5 text-[22px] font-bold text-[var(--color-brand-primary)]">
                {form.topic}
              </h2>
              <div className="whitespace-pre-wrap text-[15px] leading-[1.85] text-[var(--text-primary)]">
                {story}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function Label({ children }) {
  return (
    <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
      {children}
    </p>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} cursor-pointer`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function SwSection({ label, badge, hint, children }) {
  return (
    <div className="border-t border-[var(--border)] py-3.5 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)]">
          {label}
        </span>
        {badge ? (
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
              badge === 'enhanced'
                ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-primary)]'
                : 'bg-[var(--rp-accentbg)] text-[var(--color-brand-primary)]',
            ].join(' ')}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="mt-2 text-[11px] text-[var(--text-secondary)]">{hint}</p> : null}
    </div>
  )
}

function TagBox({ tags, draft, onDraftChange, placeholder, onAdd, onRemove, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onAdd()
    }
  }

  return (
    <div
      className={[
        'flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-form-border)] bg-[var(--surface-alt)] px-2 py-1.5',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-primary)]"
        >
          {tag}
          {!disabled ? (
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="text-[var(--text-secondary)] hover:text-[var(--color-brand-primary)]"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-2.5" />
            </button>
          ) : null}
        </span>
      ))}
      {!disabled ? (
        <>
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-w-[72px] flex-1 border-0 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--color-brand-primary)]"
          >
            <Plus className="size-3" aria-hidden="true" />
            {placeholder}
          </button>
        </>
      ) : (
        <span className="text-xs text-[var(--text-secondary)]">Names generated automatically</span>
      )}
    </div>
  )
}

function ToggleRow({ label, sub, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mb-2 flex w-full items-center justify-between gap-3 rounded-lg border-0 bg-transparent p-0 text-left"
    >
      <div>
        <div className="text-[13px] font-medium text-[var(--text-primary)]">{label}</div>
        {sub ? <div className="text-[11px] text-[var(--text-secondary)]">{sub}</div> : null}
      </div>
      <span
        className={[
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          active ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--color-kpi-zero)]',
        ].join(' ')}
        aria-hidden="true"
      >
        <span
          className={[
            'inline-block size-3.5 rounded-full bg-white transition-transform',
            active ? 'translate-x-[18px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  )
}

function CheckRow({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="mb-1.5 flex w-full items-center gap-2 rounded border-0 bg-transparent p-0 text-left text-[13px] text-[var(--text-primary)]"
    >
      <span
        className={[
          'inline-flex size-4 shrink-0 items-center justify-center rounded border',
          checked
            ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]'
            : 'border-[var(--color-form-border)] bg-[var(--surface)]',
        ].join(' ')}
      >
        {checked ? <Check className="size-2.5 text-white" aria-hidden="true" /> : null}
      </span>
      {label}
    </button>
  )
}

function Counter({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-form-border)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={() => onChange(-1)}
        className="px-2 py-1 text-sm text-[var(--text-primary)] hover:text-[var(--color-brand-primary)]"
        aria-label="Decrease question count"
      >
        −
      </button>
      <span className="min-w-[24px] text-center text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        className="px-2 py-1 text-sm text-[var(--text-primary)] hover:text-[var(--color-brand-primary)]"
        aria-label="Increase question count"
      >
        +
      </button>
    </div>
  )
}

function ExportBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-form-border)] bg-[var(--surface-alt)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  )
}

function ActionBtn({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-lg border border-[var(--color-form-border)] bg-[var(--surface-alt)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)]',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function MetaTag({ children }) {
  return (
    <span className="rounded-full border border-[var(--color-form-border)] bg-[var(--surface-alt)] px-2.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
      {children}
    </span>
  )
}

const inputClass =
  'mb-1 w-full rounded-lg border border-[var(--color-form-border)] bg-[var(--surface-alt)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none box-border placeholder:text-[var(--text-secondary)]'

function chipClass(active, extra = '') {
  return [
    'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'border-[var(--color-brand-primary)] bg-[var(--surface)] text-[var(--text-primary)]'
      : 'border-[var(--color-form-border)] bg-transparent text-[var(--text-secondary)]',
    extra,
  ].join(' ')
}

function chipBtnClass(active) {
  return [
    'cursor-pointer rounded-lg border px-2.5 py-2 text-left text-xs',
    active
      ? 'border-[var(--color-brand-primary)] bg-[var(--surface)] text-[var(--text-primary)]'
      : 'border-[var(--color-form-border)] bg-transparent text-[var(--text-secondary)]',
  ].join(' ')
}
