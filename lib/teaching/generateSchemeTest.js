/**
 * Scheme-grounded midterm / EoT question generation with hard ECZ validation gate.
 */
import crypto from 'crypto'
import { generateAIObject } from '@/lib/ai/client'
import { QuizGenerationSchema, parseQuizObject } from '@/lib/ai/schemas'
import { loadEocSpec } from '@/lib/ecz/eoc/load-eoc-spec'
import { validateQuestion } from '@/lib/ecz/eoc/question-validator'
import { mapQuizQuestionToGeneratedQuestion } from '@/lib/ecz/eoc/mapExistingGeneration'
import { writeEczValidationLog } from '@/lib/ecz/eoc/writeValidationLog'
import { resolveAssessmentMode, ASSESSMENT_MODES } from '@/lib/ecz/assessment-engine'
import { buildSchemeContentBlock, retainValidatedQuestions } from '@/lib/teaching/schemeTestTopics'

const SYSTEM = `You are a Zambian CBC / ECZ assessment expert for the 2023 curriculum.
Return ONLY questions that assess the provided SCHEME OF WORK topics.
Do not invent generic topics outside the scheme block.
Use Zambian classroom contexts. Follow ECZ-style command terms and Bloom levels.`

function buildUserPrompt({
  subject,
  gradeOrForm,
  slot,
  schemeBlock,
  questionCount,
  difficulty,
  assessmentMode,
  topicHints,
}) {
  const modeHint =
    assessmentMode === ASSESSMENT_MODES.SECONDARY_SCENARIO
      ? 'Use secondary ECZ scenario style (zambianScenario + subQuestions with marks). No bare MCQ/true-false.'
      : 'Use clear formative/summative items (MCQ or short structured questions) appropriate for the grade.'

  const slotLabel = slot === 'end_of_term' ? 'End of term test' : 'Mid-term assessment'

  return [
    `Create a ${slotLabel} paper for ${subject}, ${gradeOrForm}.`,
    `Difficulty: ${difficulty}. Question count: ${questionCount}.`,
    modeHint,
    `Topics to cover (distribute coverage): ${topicHints}`,
    '',
    schemeBlock,
    '',
    'Each question must clearly map to one of the scheme weeks/topics above.',
    'Include marks, bloomsLevel, and brief explanation/marking guidance.',
  ].join('\n')
}

/**
 * @returns {Promise<{ questions: any[], rejectedCount: number, coverage: any[], assessmentMode: string, generationId: string }>}
 */
export async function generateSchemeTestPaper(params) {
  const {
    schoolId,
    subject,
    gradeOrForm,
    schoolLevel,
    slot,
    selectedTopics,
    questionCount = 10,
    difficulty = 'medium',
  } = params

  const assessmentMode = resolveAssessmentMode({
    schoolLevel,
    gradeLevel: gradeOrForm,
    purpose: slot === 'end_of_term' ? 'exam' : 'summative',
  })

  const schemeBlock = buildSchemeContentBlock(selectedTopics)
  const topicHints = selectedTopics.map((t) => `W${t.week}:${t.topicTitle}`).join(', ')
  const generationId = crypto.randomUUID()
  const source = slot === 'end_of_term' ? 'scheme_end_of_term' : 'scheme_mid_term'
  const spec = loadEocSpec(subject)

  const target = Math.min(30, Math.max(1, Number(questionCount) || 10))
  const validated = []
  let rejectedCount = 0
  let attempts = 0
  const maxAttempts = Math.max(target * 3, 6)

  while (validated.length < target && attempts < maxAttempts) {
    attempts += 1
    const remaining = target - validated.length
    const batchSize = Math.min(5, remaining)

    const { object } = await generateAIObject(
      QuizGenerationSchema,
      SYSTEM,
      buildUserPrompt({
        subject,
        gradeOrForm,
        slot,
        schemeBlock,
        questionCount: batchSize,
        difficulty,
        assessmentMode,
        topicHints,
      }),
      { temperature: 0.65, maxOutputTokens: 4500 }
    )

    const parsed = parseQuizObject(object)
    const batch =
      parsed.success && Array.isArray(parsed.data?.questions) ? parsed.data.questions : []
    if (!batch.length) {
      rejectedCount += 1
      continue
    }

    for (const raw of batch) {
      if (validated.length >= target) break
      const topicTag =
        String(
          raw.topic ||
            raw.topicTag ||
            selectedTopics[validated.length % selectedTopics.length]?.topicTitle ||
            ''
        ).trim() || selectedTopics[0]?.topicTitle

      const q = {
        id: raw.id || crypto.randomUUID(),
        type:
          raw.type || (assessmentMode === ASSESSMENT_MODES.SECONDARY_SCENARIO ? 'scenario' : 'mcq'),
        question: raw.question || raw.text || '',
        zambianScenario: raw.zambianScenario,
        options: raw.options,
        answer: raw.answer,
        explanation: raw.explanation,
        marks: Number(raw.marks) || Math.max(1, Math.floor(40 / target)),
        bloomsLevel: raw.bloomsLevel || raw.bloomLevel,
        commandTerm: raw.commandTerm,
        elementOfConstruct: raw.elementOfConstruct,
        subQuestions: raw.subQuestions,
        topic: topicTag,
        schemeWeek: selectedTopics.find(
          (t) =>
            String(t.topicTitle).toLowerCase() === String(topicTag).toLowerCase() ||
            String(t.topicKey).toLowerCase() === String(topicTag).toLowerCase()
        )?.week,
      }

      if (!String(q.question || q.zambianScenario || '').trim()) {
        rejectedCount += 1
        continue
      }

      // No EoC corpus for this subject — accept structurally complete scheme-grounded items.
      if (!spec) {
        validated.push(q)
        continue
      }

      let mapped = mapQuizQuestionToGeneratedQuestion({
        spec,
        topicTag,
        formLevel: gradeOrForm,
        question: q,
        assessmentMode,
      })
      if (!mapped) {
        rejectedCount += 1
        continue
      }

      let validation = await validateQuestion(spec, mapped.question, { runSemanticCheck: false })
      let repaired = false

      if (!validation.valid) {
        // One repair pass: regenerate a single replacement item for this topic.
        try {
          const repairPrompt = [
            SYSTEM,
            '',
            schemeBlock,
            '',
            `Regenerate ONE valid ${slot === 'end_of_term' ? 'EoT' : 'mid-term'} question for topic: ${topicTag}.`,
            `Previous item failed ECZ validation: ${JSON.stringify(validation.issues).slice(0, 800)}`,
            modeLine(assessmentMode),
            '',
            `Return a full quiz object with exactly 1 question covering: ${topicTag}`,
          ].join('\n')

          const { object: repairedObj } = await generateAIObject(
            QuizGenerationSchema,
            SYSTEM,
            repairPrompt,
            { temperature: 0.4, maxOutputTokens: 2500 }
          )
          const repairedParsed = parseQuizObject(repairedObj)
          const rq =
            repairedParsed.success && Array.isArray(repairedParsed.data?.questions)
              ? repairedParsed.data.questions[0]
              : null
          if (rq) {
            const repairedQ = {
              ...q,
              ...rq,
              id: q.id,
              topic: topicTag,
              question: rq.question || rq.text || q.question,
              zambianScenario: rq.zambianScenario || q.zambianScenario,
              subQuestions: rq.subQuestions || q.subQuestions,
            }
            mapped = mapQuizQuestionToGeneratedQuestion({
              spec,
              topicTag,
              formLevel: gradeOrForm,
              question: repairedQ,
              assessmentMode,
            })
            if (mapped) {
              validation = await validateQuestion(spec, mapped.question, {
                runSemanticCheck: false,
              })
              repaired = true
              if (validation.valid) {
                Object.assign(q, repairedQ)
              }
            }
          }
        } catch {
          /* keep invalid */
        }
      }

      await writeEczValidationLog({
        schoolId,
        source,
        generationId,
        clientItemId: String(q.id),
        subjectCode: spec.subjectCode,
        topicTag,
        resolvedEocId: mapped?.question?.eocId || null,
        examLevelOrForm: gradeOrForm,
        valid: validation.valid,
        issues: validation.issues || [],
        meta: { slot, repaired, assessmentMode },
      }).catch(() => {})

      if (validation.valid) {
        validated.push(q)
      } else {
        rejectedCount += 1
      }
    }
  }

  // Hard gate: never surface invalid items (retainValidatedQuestions is the contract helper).
  const gated = retainValidatedQuestions(validated.map((q) => ({ question: q, valid: true })))
  const finalQuestions = gated.questions

  const coverage = selectedTopics.map((t) => ({
    week: t.week,
    topicKey: t.topicKey,
    topicTitle: t.topicTitle,
    questionCount: finalQuestions.filter(
      (q) =>
        Number(q.schemeWeek) === t.week ||
        String(q.topic || '').toLowerCase() === String(t.topicTitle).toLowerCase()
    ).length,
  }))

  return {
    questions: finalQuestions,
    rejectedCount,
    coverage,
    assessmentMode,
    generationId,
    questionCountRequested: target,
    questionCountReturned: finalQuestions.length,
  }
}

function modeLine(assessmentMode) {
  return assessmentMode === ASSESSMENT_MODES.SECONDARY_SCENARIO
    ? 'Use secondary scenario style with subQuestions.'
    : 'Use MCQ or short structured questions.'
}
