/**
 * Ministry of Education Zambia — professional lesson plan generator.
 * Plain-text output only (no markdown) for clean printing and Word export.
 */

import { groqChatCompletion } from '@/lib/ai/groq-client'
import {
  buildMandatoryWorkedExamplesBlock,
  getSubjectExampleRequirements,
  resolveCanonicalSubject,
} from '@/lib/ai/subject-adaptive-prompts'
import {
  formatLessonPlanForDisplay,
  parseLessonPlanContent,
  sanitizeText,
} from '@/lib/lesson-plans/text'

export { formatLessonPlanForDisplay, parseLessonPlanContent, sanitizeText }

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

export function buildProfessionalLessonPlanPrompt(
  input: ProfessionalLessonPlanInput,
  ragBlock = ''
): string {
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

  const ragSection = String(ragBlock || '').trim()
    ? `\n\nSchool reference materials (cite as [Ref N] when used):\n${String(ragBlock).trim()}\n`
    : ''

  return `You are creating a PROFESSIONAL lesson plan matching Ministry of Education Zambia standards.
${ragSection}

CRITICAL: Use PLAIN TEXT ONLY. NO markdown formatting:
- Do NOT use asterisks (*) for bold or italic
- Do NOT use # for headers
- Do NOT use ** for emphasis
- Do NOT use underscores for formatting
- Do NOT use backticks for code

Instead:
- Use ALL CAPS for section headers: LESSON GOAL:, TEACHING MATERIALS:, etc.
- Use numbers for lists: 1. 2. 3.
- Use clear spacing between sections

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

OUTPUT FORMAT — use this exact structure (PLAIN TEXT, no markdown):

MINISTRY OF EDUCATION
LESSON PLAN

SCHOOL: _________________ DATE: ________________ TIME: ___________
TEACHER: ________________ FORM: ${input.form}
SUBJECT: ${canonical}
TOPIC: ${input.topic}
SUB-TOPIC: ${subTopic}
DURATION: ${duration} minutes
TOTAL PUPILS: ${input.totalPupils ?? '______'} BOYS: ${input.boys ?? '______'} GIRLS: ${input.girls ?? '______'}

LESSON GOAL (SMART):
[One specific, measurable objective for ${subTopic}]

GENERAL COMPETENCES:
1. Analytical / Critical Thinking
2. Collaboration
3. Communication

SPECIFIC COMPETENCES:
[Competence specific to ${subTopic}]

PRIOR KNOWLEDGE:
[What Form ${input.form} learners should already know]

LEARNING ENVIRONMENT:
Physical: Classroom
Technological: Chalkboard [add ICT if relevant]

TEACHING AND LEARNING MATERIALS:
[List 5+ specific, low-cost Zambian resources — NOT generic "textbook only"]

EXPECTED STANDARD:
[Clear outcome learners must demonstrate]

LESSON PROGRESSION:

STAGE 1: INTRODUCTION (${intro} minutes)
Teacher Activities:
1. [Hook with real ${place} scenario]
Learner Activities:
1. [Listen, respond]
Assessment Criteria:
[Identify key ideas]

STAGE 2: DEVELOPMENT (${development} minutes)
Teacher Activities:
1. [Explain with examples]
Learner Activities:
1. [Copy notes, discuss in pairs]
Assessment Criteria:
[Correct responses]

STAGE 3: EXPLANATION (${explanation} minutes)
Teacher Activities:
1. [Worked examples on board]
Learner Activities:
1. [Attempt problems]
Assessment Criteria:
[Accuracy of steps]

STAGE 4: SYNTHESIS (${synthesis} minutes)
Teacher Activities:
1. [Supervise practice]
Learner Activities:
1. [Solve similar problems]
Assessment Criteria:
[Correct answers]

STAGE 5: CONCLUSION (${conclusion} minutes)
Teacher Activities:
1. [Recap, assign homework]
Learner Activities:
1. [Summarise learning]
Assessment Criteria:
[Quick check]

WORKED EXAMPLES (${reqs.workedExamples} minimum):
[Number each: EXAMPLE 1, EXAMPLE 2… Each with Zambian name, place, EVERY calculation step, Answer: …]

PRACTICE EXERCISES (${reqs.practiceProblems} minimum):
[Each with Expected Answer and hint steps]

HOMEWORK (4 questions minimum):
[Each with expected answer]

ASSESSMENT STRATEGIES:
Formative: observation, discussion, quizzes, peer review
Summative: written test, practical task

LESSON EVALUATION:
[Space for teacher reflection after teaching]

COMPETENCE CONTINUITY:
[Link to next lesson on ${input.topic}]

FORBIDDEN: generic phrases like "students will learn concepts" without worked solutions.
Write the COMPLETE lesson plan now in plain text only.`
}

export async function generateProfessionalLessonPlan(
  input: ProfessionalLessonPlanInput,
  options: { ragBlock?: string } = {}
): Promise<{ content: string; tokensUsed: number }> {
  const prompt = buildProfessionalLessonPlanPrompt(input, options.ragBlock || '')
  const { content, usage } = await groqChatCompletion({
    prompt,
    maxTokens: 6000,
    temperature: 0.65,
  })
  return { content: sanitizeText(content), tokensUsed: usage.completionTokens }
}
