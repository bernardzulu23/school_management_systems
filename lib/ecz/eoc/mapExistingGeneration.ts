/**
 * Best-effort mapping from existing ecz-practice / ecz-exam-questions shapes
 * into GeneratedQuestion for side-by-side validation (does not change consumers).
 */
import {
  BloomLevel,
  type GeneratedQuestionT,
  type EczSubjectSpecT,
} from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import { resolveTopicToEoc } from '@/lib/ecz/eoc/question-validator'

const BLOOM_MAP: Record<string, string> = {
  remembering: 'remembering',
  understanding: 'understanding',
  applying: 'applying',
  analysing: 'analysing',
  analyzing: 'analysing',
  evaluating: 'evaluating',
  creating: 'creating',
}

function normalizeBloom(raw: unknown): GeneratedQuestionT['parts'][number]['bloomLevel'] {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  const mapped = BLOOM_MAP[key]
  const parsed = BloomLevel.safeParse(mapped || key)
  return (
    parsed.success ? parsed.data : 'applying'
  ) as GeneratedQuestionT['parts'][number]['bloomLevel']
}

function inferComponentType(
  formLevel: string,
  assessmentMode?: string | null
): GeneratedQuestionT['componentType'] {
  const mode = String(assessmentMode || '').toLowerCase()
  if (mode.includes('sba')) return 'SBA'
  if (mode.includes('exam') || mode.includes('final')) return 'FINAL_EXAM'
  // Heuristic: Form 4 Final Exam component exists in Math I; Forms 2–3 are SBA.
  if (/form\s*4/i.test(formLevel)) return 'FINAL_EXAM'
  return 'SBA'
}

function defaultCompetences(): GeneratedQuestionT['keyCompetences'] {
  return ['analytical_thinking', 'problem_solving']
}

/**
 * Map an ECZ exam / practice scenario (+ subQuestions) into GeneratedQuestion.
 * Returns null when there is not enough structure to validate meaningfully.
 */
export function mapScenarioToGeneratedQuestion(params: {
  spec: EczSubjectSpecT
  topicTag: string
  formLevel: string
  scenario: {
    questionNumber?: number
    zambianScenario?: string
    elementOfConstruct?: string
    subQuestions?: Array<{
      number?: string
      commandTerm?: string
      question?: string
      marks?: number
      bloomsLevel?: string
    }>
    totalMarks?: number
  }
  assessmentMode?: string | null
}): { question: GeneratedQuestionT; clientItemId: string } | null {
  const { spec, topicTag, formLevel, scenario } = params
  const scenarioText = String(scenario?.zambianScenario || '').trim()
  const subs = Array.isArray(scenario?.subQuestions) ? scenario.subQuestions : []
  if (!scenarioText && !subs.length) return null

  const resolved = resolveTopicToEoc(spec, topicTag)
  const eocId =
    resolved?.eoc.id ||
    (String(scenario?.elementOfConstruct || '').match(/EoC\d+/i)?.[0] ?? null) ||
    spec.elementsOfConstruct[0]?.id ||
    'EoC1'

  const parts =
    subs.length > 0
      ? subs.map((sq, i) => ({
          label: String(sq.number || `(${String.fromCharCode(97 + i)})`),
          text: [sq.commandTerm, sq.question].filter(Boolean).join(' ').trim() || '—',
          marks: Math.max(1, Number(sq.marks) || 1),
          bloomLevel: normalizeBloom(sq.bloomsLevel),
        }))
      : [
          {
            label: '(a)',
            text: scenarioText.slice(0, 280) || 'Complete the task.',
            marks: Math.max(1, Number(scenario?.totalMarks) || 5),
            bloomLevel: 'applying' as const,
          },
        ]

  const question: GeneratedQuestionT = {
    subjectCode: spec.subjectCode,
    eocId,
    topicTag: String(topicTag || '').trim() || 'unknown',
    formLevel: String(formLevel || '').trim() || 'Form 4',
    componentType: inferComponentType(formLevel, params.assessmentMode),
    scenarioContext: scenarioText || parts.map((p) => p.text).join(' '),
    parts,
    keyCompetences: defaultCompetences(),
  }

  const qn = scenario?.questionNumber != null ? String(scenario.questionNumber) : 'x'
  return { question, clientItemId: `scenario:${qn}` }
}

/**
 * Map a flat practice MCQ/short question into a GeneratedQuestion-shaped object
 * (often fails structural scenario checks — intentional for side-by-side telemetry).
 */
export function mapPracticeQuestionToGeneratedQuestion(params: {
  spec: EczSubjectSpecT
  topicTag: string
  formLevel: string
  question: {
    id?: string
    type?: string
    question?: string
    marks?: number
    explanation?: string
  }
  assessmentMode?: string | null
}): { question: GeneratedQuestionT; clientItemId: string } | null {
  const { spec, topicTag, formLevel, question: q } = params
  const text = String(q?.question || '').trim()
  if (!text) return null

  const resolved = resolveTopicToEoc(spec, topicTag)
  const eocId = resolved?.eoc.id || spec.elementsOfConstruct[0]?.id || 'EoC1'

  const question: GeneratedQuestionT = {
    subjectCode: spec.subjectCode,
    eocId,
    topicTag: String(topicTag || '').trim() || 'unknown',
    formLevel: String(formLevel || '').trim() || 'Form 2',
    componentType: inferComponentType(formLevel, params.assessmentMode),
    scenarioContext: String(q?.explanation || text),
    parts: [
      {
        label: '(a)',
        text,
        marks: Math.max(1, Number(q?.marks) || 1),
        bloomLevel: 'applying',
      },
    ],
    keyCompetences: defaultCompetences(),
  }

  return {
    question,
    clientItemId: String(q?.id || `practice:${text.slice(0, 24)}`),
  }
}

/**
 * Map a quiz-maker question (MCQ / short / scenario-like) into GeneratedQuestion.
 */
export function mapQuizQuestionToGeneratedQuestion(params: {
  spec: EczSubjectSpecT
  topicTag: string
  formLevel: string
  question: {
    id?: string
    type?: string
    question?: string
    zambianScenario?: string
    marks?: number
    explanation?: string
    bloomsLevel?: string
    elementOfConstruct?: string
    subQuestions?: Array<{
      number?: string
      commandTerm?: string
      question?: string
      marks?: number
      bloomsLevel?: string
    }>
  }
  assessmentMode?: string | null
}): { question: GeneratedQuestionT; clientItemId: string } | null {
  const q = params.question
  if (q?.zambianScenario || (Array.isArray(q?.subQuestions) && q.subQuestions.length)) {
    return mapScenarioToGeneratedQuestion({
      spec: params.spec,
      topicTag: params.topicTag,
      formLevel: params.formLevel,
      scenario: {
        zambianScenario: q.zambianScenario || q.question,
        elementOfConstruct: q.elementOfConstruct,
        subQuestions: q.subQuestions,
        totalMarks: q.marks,
      },
      assessmentMode: params.assessmentMode,
    })
  }
  return mapPracticeQuestionToGeneratedQuestion({
    spec: params.spec,
    topicTag: params.topicTag,
    formLevel: params.formLevel,
    question: q,
    assessmentMode: params.assessmentMode,
  })
}
