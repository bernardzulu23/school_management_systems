import { generateAIObject } from '@/lib/ai/client'
import { QuizClassAnalysisSchema } from '@/lib/ai/schemas'

const ANALYSIS_SYSTEM =
  'You are a Zambian CBC teaching advisor. Analyse class quiz results and recommend whether the teacher should re-teach the topic.'

function buildAnalysisPrompt({ assessment, stats, wrongAnswers }) {
  const wrongLines = wrongAnswers.length
    ? wrongAnswers
        .slice(0, 15)
        .map(
          (w, i) =>
            `${i + 1}. Q: ${w.question}\n   Wrong count: ${w.wrongCount}/${w.totalAttempts}\n   Topic hint: ${w.topic || assessment.topic || assessment.subject}`
        )
        .join('\n')
    : 'No wrong-answer patterns yet.'

  return `Class quiz analysis request:
Title: ${assessment.title}
Subject: ${assessment.subject}
Class: ${assessment.class}
Topic: ${assessment.topic || assessment.title}
Class size: ${stats.classSize}
Attempted: ${stats.attempted}
Class average: ${stats.averagePercentage}%
Students below 65%: ${stats.needsSupportCount}

Most-missed questions:
${wrongLines}

Return:
- summary of class performance
- classAverage (number)
- strugglingTopics (array)
- recommendReteach (boolean)
- reteachRationale (why re-teach or not)
- suggestedActivities (3-5 concrete classroom activities)
- studentsNeedingSupport (brief list or count description)`
}

export function fallbackQuizClassAnalysis({ assessment, stats, wrongAnswers }) {
  const avg = stats.averagePercentage ?? 0
  const topWrong = wrongAnswers.slice(0, 3).map((w) => w.question)
  const recommendReteach = avg < 65 || wrongAnswers.some((w) => w.wrongRate >= 0.4)
  return {
    summary:
      avg >= 75
        ? `Class average is ${avg}% for ${assessment.title}. Most students demonstrate solid understanding.`
        : `Class average is ${avg}% for ${assessment.title}. Several students need more support on core concepts.`,
    classAverage: avg,
    strugglingTopics: topWrong.length
      ? topWrong
      : [assessment.topic || assessment.subject || 'Core syllabus topics'],
    recommendReteach,
    reteachRationale: recommendReteach
      ? `Class average (${avg}%) is below the 65% threshold or many students missed the same questions. A short re-teach session is recommended.`
      : `Class average (${avg}%) suggests most students grasped the topic. Continue with the next unit; offer targeted support for struggling learners.`,
    suggestedActivities: recommendReteach
      ? [
          'Brief recap of key concepts with worked examples',
          'Pair students for peer explanation of missed items',
          'Short formative exit ticket after re-teach',
        ]
      : [
          'Extension activity for high performers',
          'Small-group clinic for students below 65%',
          'Link to next topic with a bridging warm-up',
        ],
    studentsNeedingSupport: `${stats.needsSupportCount} student(s) scored below 65%`,
  }
}

export function aggregateWrongAnswers(submissions, questions) {
  const byId = new Map(
    (questions || []).map((q, idx) => [
      String(q.id || `q_${idx + 1}`),
      { question: q.question, topic: q.topic },
    ])
  )
  const counts = new Map()

  for (const sub of submissions) {
    let content = null
    try {
      content = sub.content ? JSON.parse(sub.content) : null
    } catch {
      content = null
    }
    const review = Array.isArray(content?.review) ? content.review : []
    for (const item of review) {
      if (item.isCorrect) continue
      const id = String(item.id)
      const prev = counts.get(id) || { wrongCount: 0, totalAttempts: 0, question: item.question }
      prev.wrongCount += 1
      prev.totalAttempts += 1
      prev.question = prev.question || byId.get(id)?.question || item.question
      prev.topic = byId.get(id)?.topic
      counts.set(id, prev)
    }
    for (const item of review.filter((r) => r.isCorrect)) {
      const id = String(item.id)
      const prev = counts.get(id) || {
        wrongCount: 0,
        totalAttempts: 0,
        question: item.question,
      }
      prev.totalAttempts += 1
      counts.set(id, prev)
    }
  }

  return [...counts.values()]
    .map((w) => ({
      ...w,
      wrongRate: w.totalAttempts > 0 ? w.wrongCount / w.totalAttempts : 0,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
}

export async function generateQuizClassAnalysis({ assessment, stats, submissions, questions }) {
  const wrongAnswers = aggregateWrongAnswers(submissions, questions)
  const input = { assessment, stats, wrongAnswers }

  try {
    const result = await generateAIObject({
      system: ANALYSIS_SYSTEM,
      prompt: buildAnalysisPrompt(input),
      schema: QuizClassAnalysisSchema,
    })
    return { ...result, generatedAt: new Date().toISOString(), source: 'ai' }
  } catch {
    return {
      ...fallbackQuizClassAnalysis(input),
      generatedAt: new Date().toISOString(),
      source: 'fallback',
    }
  }
}
