import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { groqChatCompletion } from '@/lib/ai/groq-client'
import {
  buildLessonPlanPrompt,
  buildQuizPrompt,
  buildStoryPrompt,
  buildReportCommentPrompt,
  performanceLevelFromPercentage,
} from '@/lib/ai/subject-adaptive-prompts'

function safeText(value, maxLen) {
  const s = String(value || '')
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
}

async function logAIRequest({ schoolId, feature, prompt, response, tokensUsed }) {
  await prisma.aIRequest.create({
    data: {
      id: crypto.randomUUID(),
      schoolId,
      feature,
      prompt: safeText(prompt, 500),
      response: safeText(response, 20000),
      tokens: Number(tokensUsed || 0),
    },
  })
}

async function runGroqPrompt({ schoolId, feature, prompt, maxTokens = 2000, temperature = 0.7 }) {
  const { content, usage } = await groqChatCompletion({
    prompt,
    maxTokens,
    temperature,
  })
  await logAIRequest({
    schoolId,
    feature,
    prompt,
    response: content,
    tokensUsed: usage.completionTokens,
  })
  return { content, tokensUsed: usage.completionTokens }
}

export async function generateCBCLesson({ grade, subject, topic, duration, schoolId }) {
  const prompt = buildLessonPlanPrompt({
    subject,
    grade: String(grade),
    topic,
    duration: Number(duration) || 40,
  })

  try {
    const { content, tokensUsed } = await runGroqPrompt({
      schoolId,
      feature: 'ai-lesson-planner',
      prompt,
      maxTokens: 4500,
    })
    return { success: true, lesson: content, tokensUsed }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to generate lesson' }
  }
}

export async function generateQuiz({ grade, subject, topic, questionCount = 10, schoolId }) {
  const prompt = buildQuizPrompt({
    subject,
    grade: String(grade),
    topic,
    numQuestions: questionCount,
  })

  try {
    const { content, tokensUsed } = await runGroqPrompt({
      schoolId,
      feature: 'ai-quiz-maker',
      prompt,
      maxTokens: 3000,
      temperature: 0.5,
    })
    return { success: true, quiz: content, tokensUsed }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to generate quiz' }
  }
}

export async function generateReportComments({
  studentName,
  grade,
  subject,
  marks,
  maxMarks,
  behavior,
  attendance,
  strengths,
  areasForImprovement,
  schoolId,
}) {
  const pct = maxMarks ? (Number(marks) / Number(maxMarks)) * 100 : 0
  const prompt = buildReportCommentPrompt({
    subject,
    studentName,
    grade: String(grade),
    performanceLevel: performanceLevelFromPercentage(pct),
    behavior,
    attendance,
    strengths,
    areasForImprovement,
  })

  try {
    const { content, tokensUsed } = await runGroqPrompt({
      schoolId,
      feature: 'ai-report-comments',
      prompt,
      maxTokens: 500,
      temperature: 0.6,
    })
    return { success: true, comment: content, tokensUsed }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to generate comment' }
  }
}

export async function generateStory({
  grade,
  theme,
  length = 'short',
  zambianContext = true,
  schoolId,
}) {
  const wordTargets = { short: 300, medium: 600, long: 1000 }
  const prompt = buildStoryPrompt({
    subject: 'English (Core)',
    grade: String(grade),
    theme,
    wordCount: wordTargets[length] || 300,
    storyType: 'Narrative Story',
    setting: zambianContext ? 'Zambia' : 'General',
    includeQuestions: true,
  })

  try {
    const { content, tokensUsed } = await runGroqPrompt({
      schoolId,
      feature: 'ai-story-weaver',
      prompt,
      maxTokens: 2000,
      temperature: 0.8,
    })
    return { success: true, story: content, tokensUsed }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to generate story' }
  }
}

export async function generatePhonicsLesson({ grade, phonic, schoolId }) {
  const prompt = `Create a phonics lesson for Zambian Grade ${grade} students.

Sound/Phoneme: /${phonic}/

Include:
1. Pronunciation guide
2. Introduction activity
3. Letter cards and flashcards (ASCII format)
4. 10 words containing "${phonic}"
5. Blending activities
6. Short sentences using words with "${phonic}"
7. Fun activity
8. Home practice suggestions for parents

Use practical activities for limited resources and include Zambian context where possible.`

  try {
    const { content, tokensUsed } = await runGroqPrompt({
      schoolId,
      feature: 'phonics-trainer',
      prompt,
      maxTokens: 1500,
    })
    return { success: true, lesson: content, tokensUsed }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to generate phonics lesson' }
  }
}

export async function analyzeCBCCompetencies({ studentName, grade, observations, schoolId }) {
  const observationsText = Array.isArray(observations)
    ? observations
        .map(
          (obs, i) =>
            `${i + 1}. ${obs?.competency || 'Competency'}: ${obs?.evidence || ''} (Date: ${obs?.date || ''})`
        )
        .join('\n')
    : ''

  const prompt = `Analyze a Zambian student's CBC competency development.

Student: ${studentName}
Grade: ${grade}

Teacher Observations:
${observationsText}

Assess: Critical thinking, Creativity, Collaboration, Communication, Digital literacy (if applicable).

For each competency provide: level (Emerging/Developing/Proficient/Mastery), evidence, next steps, suggested activities.
Also provide overall summary, strengths, priority development areas, and parent recommendations.`

  try {
    const { content, tokensUsed } = await runGroqPrompt({
      schoolId,
      feature: 'cbc-competency-tracker',
      prompt,
      maxTokens: 2000,
    })
    return { success: true, analysis: content, tokensUsed }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to analyze competencies' }
  }
}
