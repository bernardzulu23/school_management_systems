'use client'

import { useMemo, useState } from 'react'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIStream } from '@/hooks/useAIStream'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LESSON_PLAN_TEMPLATE_OPTIONS } from '@/lib/lessonPlanTemplate'

const GRADE_GROUPS = [
  {
    label: 'Primary (Grades 1–7)',
    grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
  },
  {
    label: 'Senior Secondary (Grades 10–12)',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
  },
  {
    label: 'CBC Secondary — New Structure (Forms 1–6)',
    grades: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
  },
]

const SUBJECT_GROUPS = [
  {
    label: 'Languages',
    subjects: ['English Language', 'French', 'Zambian Languages'],
  },
  {
    label: 'Mathematics & Sciences',
    subjects: ['Mathematics', 'Integrated Science', 'Biology', 'Chemistry', 'Physics'],
  },
  {
    label: 'Humanities & Social Sciences',
    subjects: ['Social Studies', 'History', 'Geography', 'Civic Education', 'Religious Education'],
  },
  {
    label: 'Business & Commerce',
    subjects: ['Business Studies', 'Principles of Accounts', 'Commerce', 'Financial Literacy'],
  },
  {
    label: 'Technology & Computing',
    subjects: ['Computer Studies / ICT', 'Technical Drawing'],
  },
  {
    label: 'Practical & Applied Subjects',
    subjects: ['Agriculture', 'Home Economics', 'Art & Design', 'Music', 'Physical Education'],
  },
  {
    label: 'Vocational & Technical Pathway',
    subjects: [
      'Carpentry & Joinery',
      'Plumbing',
      'Electrical Installation',
      'Motor Vehicle Technology',
      'Fashion & Fabrics',
      'Building & Construction',
      'Food & Nutrition Technology',
    ],
  },
  {
    label: 'Special & Inclusive Education',
    subjects: ['Special Needs Education'],
  },
]

const CBC_COMPETENCIES = [
  'Critical Thinking & Problem Solving',
  'Collaboration & Communication',
  'Creativity & Innovation',
  'Digital & ICT Literacy',
  'Citizenship & Civic Engagement',
]

const CROSS_CUTTING_THEMES = [
  'Sustainability & Environmental Care',
  'Gender Equality & Inclusion',
  'HIV/AIDS & Health',
  'Financial Literacy',
  'Entrepreneurship',
]

const ASSESSMENT_METHODS = [
  'Continuous Formative Assessment',
  'Criterion-Referenced Assessment',
  'School-Based Assessment (SBA)',
  'Portfolio Assessment',
  'Peer & Self Assessment',
]

const LEARNING_PATHWAYS = ['Academic', 'Vocational/Technical', 'Mixed (Academic + Vocational)']

const INSTRUCTION_LANGUAGES = [
  'English (Grade 5 and above)',
  'Bemba',
  'Nyanja',
  'Tonga',
  'Lozi',
  'Kaonde',
  'Luvale',
  'Lunda',
  'Other Local Language',
]

const RESOURCE_LEVELS = [
  'Well-resourced (projector, internet, printed materials)',
  'Moderate (textbooks, chalkboard, some printed materials)',
  'Low-resource (chalkboard only, limited or no textbooks)',
]

export default function AILessonPlanner() {
  const [useCustomSubject, setUseCustomSubject] = useState(false)

  const [form, setForm] = useState({
    grade: 'Grade 5',
    subject: 'English Language',
    customSubject: '',
    topic: '',
    duration: 40,
    learningStyle: 'mixed',
    priorKnowledge: '',
    templateType: 'standard',
    // CBC Framework fields
    coreCompetencies: ['Critical Thinking & Problem Solving'],
    crossCuttingThemes: ['Sustainability & Environmental Care'],
    learningPathway: 'Academic',
    assessmentMethod: 'Continuous Formative Assessment',
    realWorldContext: '',
    inclusiveStrategies: true,
    practicalActivities: true,
    // New fields from curriculum corrections
    languageOfInstruction: 'English (Grade 5 and above)',
    resourceLevel: 'Moderate (textbooks, chalkboard, some printed materials)',
  })

  const { text, loading, error, done, start, reset, stop } = useAIStream('/api/ai/lesson-planner')

  const activeSubject = useCustomSubject ? form.customSubject : form.subject

  const canGenerate = useMemo(
    () => form.topic.trim() && activeSubject.trim() && form.coreCompetencies.length > 0,
    [form.topic, activeSubject, form.coreCompetencies]
  )

  const generate = async () => {
    if (!canGenerate) return
    const additionalInstructions = [
      `CBC core competencies: ${form.coreCompetencies.join(', ')}`,
      `Cross-cutting themes: ${form.crossCuttingThemes.join(', ')}`,
      `Learning pathway: ${form.learningPathway}`,
      `Language of instruction: ${form.languageOfInstruction}`,
      `Assessment method: ${form.assessmentMethod}`,
      `Resource level: ${form.resourceLevel}`,
      `Real-world context: ${form.realWorldContext || 'Zambian local context'}`,
      `Practical activities: ${form.practicalActivities ? 'Yes' : 'No'}`,
      `Inclusive strategies: ${form.inclusiveStrategies ? 'Yes' : 'No'}`,
    ]
      .join('. ')
      .slice(0, 780)

    await start({
      grade: form.grade,
      subject: activeSubject,
      topic: form.topic,
      duration: Number(form.duration),
      learningStyle: form.learningStyle,
      priorKnowledge: form.priorKnowledge,
      templateType: form.templateType,
      competenceFocus: form.coreCompetencies.join(', '),
      additionalInstructions,
    })
  }

  const copy = async () => {
    await navigator.clipboard.writeText(text || '')
  }

  const toggleMultiSelect = (field, value) => {
    const current = Array.isArray(form[field]) ? form[field] : []
    if (current.includes(value)) {
      setForm((p) => ({ ...p, [field]: current.filter((item) => item !== value) }))
    } else {
      setForm((p) => ({ ...p, [field]: [...current, value] }))
    }
  }

  const selectClass =
    'w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-6">
        <h2 className="text-lg font-semibold mb-1 text-royalPurple-text1">
          Zambia CBC Lesson Plan Generator
        </h2>
        <p className="text-xs text-royalPurple-text2 mb-6">
          Aligned with the 2023 Zambia Competency-Based Curriculum Framework · Implementation 2025
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 pt-1">
            <SectionHeading>Basic Lesson Information</SectionHeading>
          </div>

          <div className="space-y-2">
            <Label>Grade / Form Level</Label>
            <select
              className={selectClass}
              value={form.grade}
              onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
            >
              {GRADE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-royalPurple-text2/60">
              Note: Grades 8 &amp; 9 are phased out under the 2023 CBC and are not listed.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Language of Instruction</Label>
            <select
              className={selectClass}
              value={form.languageOfInstruction}
              onChange={(e) => setForm((p) => ({ ...p, languageOfInstruction: e.target.value }))}
            >
              {INSTRUCTION_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <p className="text-xs text-royalPurple-text2/60">
              Local languages are the medium of instruction for Grades 1–4.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Subject</Label>
              <button
                type="button"
                onClick={() => setUseCustomSubject((v) => !v)}
                className="text-xs text-royalPurple-text2 underline underline-offset-2"
              >
                {useCustomSubject ? '← Choose from list' : 'Type a custom subject →'}
              </button>
            </div>

            {useCustomSubject ? (
              <Input
                value={form.customSubject}
                onChange={(e) => setForm((p) => ({ ...p, customSubject: e.target.value }))}
                placeholder="e.g., Entrepreneurship, Local Craft Studies…"
              />
            ) : (
              <select
                className={selectClass}
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              >
                {SUBJECT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Topic / Lesson Title</Label>
            <Input
              value={form.topic}
              onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
              placeholder="e.g., Water Resources Management, Budgeting for Household Needs"
            />
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
            <Label>Learning Style Preference</Label>
            <select
              className={selectClass}
              value={form.learningStyle}
              onChange={(e) => setForm((p) => ({ ...p, learningStyle: e.target.value }))}
            >
              <option value="mixed">Mixed</option>
              <option value="visual">Visual</option>
              <option value="auditory">Auditory</option>
              <option value="kinesthetic">Kinesthetic / Hands-on</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>School Resource Level</Label>
            <select
              className={selectClass}
              value={form.resourceLevel}
              onChange={(e) => setForm((p) => ({ ...p, resourceLevel: e.target.value }))}
            >
              {RESOURCE_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-xs text-royalPurple-text2/60">
              Activities will be tailored to what is realistically available in your school.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Prior Knowledge / Prerequisites{' '}
              <span className="font-normal opacity-60">(optional)</span>
            </Label>
            <Input
              value={form.priorKnowledge}
              onChange={(e) => setForm((p) => ({ ...p, priorKnowledge: e.target.value }))}
              placeholder="e.g., Learners already know the water cycle basics"
            />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-royalPurple-border">
            <SectionHeading>Zambia CBC 2023 Framework Elements</SectionHeading>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Core Competencies <span className="font-normal opacity-60">(select one or more)</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CBC_COMPETENCIES.map((comp) => (
                <CheckItem
                  key={comp}
                  label={comp}
                  checked={form.coreCompetencies.includes(comp)}
                  onChange={() => toggleMultiSelect('coreCompetencies', comp)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Cross-Cutting Themes{' '}
              <span className="font-normal opacity-60">(select one or more)</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CROSS_CUTTING_THEMES.map((theme) => (
                <CheckItem
                  key={theme}
                  label={theme}
                  checked={form.crossCuttingThemes.includes(theme)}
                  onChange={() => toggleMultiSelect('crossCuttingThemes', theme)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Learning Pathway</Label>
            <select
              className={selectClass}
              value={form.learningPathway}
              onChange={(e) => setForm((p) => ({ ...p, learningPathway: e.target.value }))}
            >
              {LEARNING_PATHWAYS.map((pathway) => (
                <option key={pathway} value={pathway}>
                  {pathway}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Assessment Method</Label>
            <select
              className={selectClass}
              value={form.assessmentMethod}
              onChange={(e) => setForm((p) => ({ ...p, assessmentMethod: e.target.value }))}
            >
              {ASSESSMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Real-World Zambian Context <span className="font-normal opacity-60">(optional)</span>
            </Label>
            <Input
              value={form.realWorldContext}
              onChange={(e) => setForm((p) => ({ ...p, realWorldContext: e.target.value }))}
              placeholder="e.g., Local copper mining, Community health initiatives, Smallholder farming"
            />
          </div>

          <div className="space-y-2">
            <Label>Include Practical Activities?</Label>
            <CheckItem
              label="Yes — include hands-on, real-world activities"
              checked={form.practicalActivities}
              onChange={(e) => setForm((p) => ({ ...p, practicalActivities: e.target.checked }))}
              single
            />
          </div>

          <div className="space-y-2">
            <Label>Include Inclusive / Differentiated Strategies?</Label>
            <CheckItem
              label="Yes — include strategies for diverse and special needs learners"
              checked={form.inclusiveStrategies}
              onChange={(e) => setForm((p) => ({ ...p, inclusiveStrategies: e.target.checked }))}
              single
            />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-royalPurple-border">
            <SectionHeading>Lesson Plan Format</SectionHeading>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Template Style</Label>
            <select
              className={selectClass}
              value={form.templateType}
              onChange={(e) => setForm((p) => ({ ...p, templateType: e.target.value }))}
            >
              {LESSON_PLAN_TEMPLATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <UpgradePrompt error={error} onDismiss={reset} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mt-6">
          <Button onClick={generate} disabled={loading || !canGenerate}>
            {loading ? 'Generating…' : 'Generate CBC Lesson Plan'}
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
        <div className="text-royalPurple-text1 font-semibold mb-3">
          Competency-Based Lesson Plan
        </div>
        <div className="whitespace-pre-wrap text-sm text-royalPurple-text2">
          {text ||
            'No output yet. Fill in the form above and click "Generate CBC Lesson Plan" to create a lesson aligned with Zambia\'s 2023 Competency-Based Curriculum Framework.'}
        </div>
      </div>

      <div className="rounded-xl border border-blue-border/40 bg-blue-card p-6">
        <h3 className="font-semibold text-blue-text1 mb-3">About Zambia's 2023 CBC Framework</h3>
        <ul className="text-sm text-blue-text2 space-y-2">
          <li>✓ Shifts from outcome-based to competency-based learning</li>
          <li>
            ✓ Grades 1–7 (Primary) still active; Grades 8 &amp; 9 phased out; Grades 10–12
            transitioning
          </li>
          <li>✓ Forms 1–6 introduced as the new CBC secondary structure</li>
          <li>
            ✓ Local language is medium of instruction for Grades 1–4; English from Grade 5 upward
          </li>
          <li>
            ✓ Emphasises practical skills, real-world application, and learner-centred pedagogy
          </li>
          <li>
            ✓ Develops 5 core competencies: Critical Thinking, Collaboration, Creativity, ICT
            Literacy, Civic Engagement
          </li>
          <li>
            ✓ Integrates cross-cutting themes: sustainability, gender equality, health, financial
            literacy, entrepreneurship
          </li>
          <li>✓ Uses continuous formative assessment and School-Based Assessment (SBA)</li>
          <li>✓ Includes academic and vocational/technical learning pathways</li>
          <li>✓ Supports inclusive, differentiated learning for all students</li>
        </ul>
      </div>
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <h3 className="font-semibold text-royalPurple-text1 text-sm uppercase tracking-wide mb-1">
      {children}
    </h3>
  )
}

function CheckItem({ label, checked, onChange, single = false }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={single ? onChange : () => onChange()}
        className="rounded mt-0.5 shrink-0"
      />
      <span className="text-sm text-royalPurple-text2 leading-snug">{label}</span>
    </label>
  )
}
