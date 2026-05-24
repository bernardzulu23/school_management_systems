/**
 * Ministry of Education Zambia — professional lesson plan generator (Bernard Tito / Mr Banda format).
 * Uses Groq (same stack as the rest of ZSMS) — not Anthropic.
 */

import { groqChatCompletion } from '@/lib/ai/groq-client'
import {
  buildMandatoryWorkedExamplesBlock,
  getSubjectExampleRequirements,
  resolveCanonicalSubject,
} from '@/lib/ai/subject-adaptive-prompts'

const ZAMBIAN_PLACES = [
  'Lusaka',
  'Kitwe',
  'Ndola',
  'Kabwe',
  'Chipata',
  'Livingstone',
  'Kasama',
  'Solwezi',
  'Mongu',
  'Choma',
]

const ZAMBIAN_NAMES = ['Bwalya', 'Mwila', 'Chanda', 'Nalubamba', 'Bupe', 'Mutale', 'Kasonde']

export type ProfessionalLessonPlanInput = {
  subject: string
  form: string
  topic: string
  subTopic: string
  duration?: number
  term?: string
  totalPupils?: number
  boys?: number
  girls?: number
}

function stageMinutes(duration: number, fraction: number) {
  return Math.max(1, Math.round(duration * fraction))
}

export function buildProfessionalLessonPlanPrompt(input: ProfessionalLessonPlanInput): string {
  const canonical = resolveCanonicalSubject(input.subject)
  const duration = Number(input.duration) || 40
  const subTopic = String(input.subTopic || input.topic).trim()
  const place = ZAMBIAN_PLACES[Math.floor(Math.random() * ZAMBIAN_PLACES.length)]
  const name = ZAMBIAN_NAMES[Math.floor(Math.random() * ZAMBIAN_NAMES.length)]
  const reqs = getSubjectExampleRequirements(canonical)
  const mandatoryBlock = buildMandatoryWorkedExamplesBlock({
    subject: canonical,
    grade: input.form,
    topic: input.topic,
    duration,
  })

  const intro = stageMinutes(duration, 0.1)
  const development = stageMinutes(duration, 0.3)
  const explanation = stageMinutes(duration, 0.25)
  const synthesis = stageMinutes(duration, 0.2)
  const conclusion = duration - intro - development - explanation - synthesis

  return `You are creating a PROFESSIONAL lesson plan matching Ministry of Education Zambia standards (Bernard Tito / Mr Banda format).

LESSON DETAILS:
- Subject: ${canonical}
- Form/Grade: ${input.form}
- Topic: ${input.topic}
- Sub-Topic: ${subTopic}
- Duration: ${duration} minutes
- Term: ${input.term || 'Term 1'}
- Example place: ${place}, Zambia
- Example learner name: ${name}

${mandatoryBlock}

OUTPUT FORMAT — use this exact structure (markdown):

# MINISTRY OF EDUCATION
# LESSON PLAN

## SCHOOL: _________________ DATE: ________________ TIME: ___________
## TEACHER: ________________ FORM: ${input.form}
## SUBJECT: ${canonical}
## TOPIC: ${input.topic}
## SUB-TOPIC: ${subTopic}
## DURATION: ${duration} minutes
## TOTAL PUPILS: ${input.totalPupils ?? '______'} BOYS: ${input.boys ?? '______'} GIRLS: ${input.girls ?? '______'}

## LESSON GOAL (SMART)
[One specific, measurable objective for ${subTopic}]

## GENERAL COMPETENCES
- Analytical / Critical Thinking
- Collaboration
- Communication

## SPECIFIC COMPETENCES
- [Competence specific to ${subTopic}]

## PRIOR KNOWLEDGE
[What Form ${input.form} learners should already know]

## LEARNING ENVIRONMENT
- Physical: Classroom
- Technological: Chalkboard [add ICT if relevant]

## TEACHING & LEARNING MATERIALS
[List 5+ specific, low-cost Zambian resources — NOT generic "textbook only"]

## EXPECTED STANDARD
[Clear outcome learners must demonstrate]

## LESSON PROGRESSION

| STAGE | TIME | TEACHER ROLE | LEARNER ROLE | ASSESSMENT |
|-------|------|--------------|--------------|------------|
| INTRODUCTION | ${intro} min | Hook with real ${place} scenario | Listen, respond | Identify key ideas |
| DEVELOPMENT | ${development} min | Explain with examples | Copy notes, discuss in pairs | Correct responses |
| EXPLANATION | ${explanation} min | Worked examples on board | Attempt problems | Accuracy of steps |
| SYNTHESIS | ${synthesis} min | Supervise practice | Solve similar problems | Correct answers |
| CONCLUSION | ${conclusion} min | Recap, assign homework | Summarise learning | Quick check |

## WORKED EXAMPLES (${reqs.workedExamples} minimum)
[Number each: Example 1, Example 2… Each with Zambian name, place, EVERY calculation step, Answer: …]

## PRACTICE EXERCISES (${reqs.practiceProblems} minimum)
[Each with Expected Answer and hint steps]

## HOMEWORK (4 questions minimum)
[Each with expected answer]

## ASSESSMENT STRATEGIES
Formative: observation, discussion, quizzes, peer review
Summative: written test, practical task

## LESSON EVALUATION
[Space for teacher reflection after teaching]

## COMPETENCE CONTINUITY
[Link to next lesson on ${input.topic}]

FORBIDDEN: generic phrases like "students will learn concepts" without worked solutions.
Write the COMPLETE lesson plan now.`
}

export async function generateProfessionalLessonPlan(
  input: ProfessionalLessonPlanInput
): Promise<{ content: string; tokensUsed: number }> {
  const prompt = buildProfessionalLessonPlanPrompt(input)
  const { content, usage } = await groqChatCompletion({
    prompt,
    maxTokens: 6000,
    temperature: 0.65,
  })
  return { content, tokensUsed: usage.completionTokens }
}

export function formatLessonPlanForDisplay(content: string): string {
  return String(content || '').trim()
}
