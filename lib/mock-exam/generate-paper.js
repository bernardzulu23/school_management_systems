import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { assertGroqConfigured, generateAIObject } from '@/lib/ai/client'
import { ECZPracticePaperSchema } from '@/lib/ai/schemas'
import { buildEczPracticePrompt } from '@/lib/ai/subject-adaptive-prompts'
import { appendRagToSystemPrompt, buildRagContextForQuery } from '@/lib/ai/rag-context'
import { getSchoolPlanForUsage, trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { normalizeEczExamLevel, isValidEczExamLevel } from '@/lib/ecz/ecz-practice-levels'

const ECZ_PRACTICE_SYSTEM =
  'You are an ECZ examination specialist for Zambian schools. Create valid practice papers with Zambian context. Match the requested exam level exactly. Use ECZ command terms (State, Define, Explain, Calculate). For Forms 1-4 prefer scenario-based structured questions over trivial multiple choice.'

/** Higher temp so each mock exam start yields a fresh paper. */
export const MOCK_EXAM_TEMPERATURE = 0.7

/**
 * Generate an ECZ-aligned exam paper via AI + optional RAG.
 * @param {{ subject: string, topic: string, examLevel: string, questionCount?: number, schoolId: string, gradeLevel?: string, variationSeed?: string }}
 */
export async function generateMockExamPaper({
  subject,
  topic,
  examLevel,
  questionCount = 8,
  schoolId,
  gradeLevel,
  variationSeed,
}) {
  const level = normalizeEczExamLevel(examLevel)
  if (!isValidEczExamLevel(level)) {
    throw new Error('Invalid exam level')
  }

  assertGroqConfigured()

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) throw new Error('School not found')

  const count = Math.min(15, Math.max(3, Number(questionCount) || 8))
  const seed = String(variationSeed || '').trim() || crypto.randomUUID()
  let prompt = buildEczPracticePrompt({ subject, examLevel: level, topic, questionCount: count })
  prompt = `${prompt}\n\nProduce a fresh unique mock exam paper (variation: ${seed}). Do not reuse prior wording.`

  const rag = await buildRagContextForQuery({
    query: `${subject} ${level} ${topic} ECZ mock examination`,
    schoolId,
    schoolPlan: school.plan,
    subject,
    gradeLevel: gradeLevel || level,
  })
  if (rag.block) {
    prompt = `${prompt}\n\n---\nSchool reference materials (cite textbook refs as [Ref N]):\n${rag.block}`
  }

  const { object: parsed, usage } = await generateAIObject(
    ECZPracticePaperSchema,
    rag.block ? appendRagToSystemPrompt(ECZ_PRACTICE_SYSTEM, rag.block) : ECZ_PRACTICE_SYSTEM,
    prompt,
    { maxTokens: 3000, temperature: MOCK_EXAM_TEMPERATURE }
  )

  const paper = parsed?.paper
  if (!paper || !Array.isArray(paper.questions) || !paper.questions.length) {
    throw new Error('AI returned invalid exam paper')
  }

  await trackAIUsage(schoolId, 'mock-exam')
  await prisma.aIRequest.create({
    data: {
      id: crypto.randomUUID(),
      schoolId,
      feature: 'mock-exam',
      prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
      response:
        JSON.stringify(parsed).length > 20000
          ? JSON.stringify(parsed).slice(0, 20000)
          : JSON.stringify(parsed),
      tokens: usage.outputTokens,
    },
  })

  return { paper, ragReferences: rag.refs?.length ? rag.refs : undefined }
}
