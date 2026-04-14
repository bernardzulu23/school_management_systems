import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function pickModel() {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
}

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

export async function generateCBCLesson({ grade, subject, topic, duration, schoolId }) {
  const isZambianContext = ['Life Skills', 'Citizenship', 'Environmental Studies'].includes(subject)

  const prompt = `You are a Zambian education expert creating a Competency-Based Curriculum (CBC) lesson.

Grade Level: ${grade}
Subject: ${subject}
Topic: ${topic}
Duration: ${duration} minutes
Context: ${isZambianContext ? 'Zambian primary/secondary school' : 'General'}

Create a detailed lesson plan that includes:
1. Learning Objectives (CBC Core Competencies): critical thinking, creativity, collaboration, communication
2. Lesson Outline: introduction, main activities, group work, reflection/closure
3. Materials Needed (consider limited resources)
4. Assessment Methods (formative, not just written exams)
5. Differentiation strategies for mixed-ability classes
6. Connections to Zambian context/curriculum

Format as JSON with clear sections.`

  try {
    const message = await client.messages.create({
      model: pickModel(),
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const lesson = String(message?.content?.[0]?.text || '')
    await logAIRequest({
      schoolId,
      feature: 'ai-lesson-planner',
      prompt,
      response: lesson,
      tokensUsed: message?.usage?.output_tokens,
    })

    return { success: true, lesson, tokensUsed: message?.usage?.output_tokens || 0 }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to generate lesson' }
  }
}

export async function generateQuiz({ grade, subject, topic, questionCount = 10, schoolId }) {
  const prompt = `Create a formative quiz for Zambian students.

Grade: ${grade}
Subject: ${subject}
Topic: ${topic}
Question Count: ${questionCount}
Curriculum: CBC (Competency-Based)

Requirements:
- Mix question types (multiple choice, short answer, matching)
- Age-appropriate for ${grade}
- Aligned to CBC competencies, not just recall
- Include critical thinking questions
- Reference Zambian context where appropriate

Return JSON: { "questions": [ ... ] } where each question includes:
id, type, question, options (if MCQ), correctAnswer, marks, competencies, explanation.`

  try {
    const message = await client.messages.create({
      model: pickModel(),
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const quiz = String(message?.content?.[0]?.text || '')
    await logAIRequest({
      schoolId,
      feature: 'ai-quiz-maker',
      prompt,
      response: quiz,
      tokensUsed: message?.usage?.output_tokens,
    })

    return { success: true, quiz, tokensUsed: message?.usage?.output_tokens || 0 }
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
  const percentage = maxMarks ? ((Number(marks) / Number(maxMarks)) * 100).toFixed(1) : '0.0'
  const prompt = `Generate a meaningful report comment for a Zambian student.

Student: ${studentName}
Grade: ${grade}
Subject: ${subject}
Performance: ${marks}/${maxMarks} (${percentage}%)
Behavior: ${behavior}
Attendance: ${attendance}
Strengths: ${(strengths || []).join(', ')}
Areas for Improvement: ${(areasForImprovement || []).join(', ')}

Write a personalized, encouraging comment:
- 3-4 sentences
- Simple English (teachers/parents will read it)
- Positive even if marks are low
- Reference CBC competencies where relevant
- Do NOT include marks or percentages.`

  try {
    const message = await client.messages.create({
      model: pickModel(),
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const comment = String(message?.content?.[0]?.text || '')
    await logAIRequest({
      schoolId,
      feature: 'ai-report-comments',
      prompt,
      response: comment,
      tokensUsed: message?.usage?.output_tokens,
    })

    return { success: true, comment, tokensUsed: message?.usage?.output_tokens || 0 }
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
  const prompt = `Write an engaging story for Zambian Grade ${grade} students.

Theme: ${theme}
Target Length: approximately ${wordTargets[length] || 300} words
Context: ${zambianContext ? 'Include Zambian setting, characters, or cultural elements' : 'Generic'}

Requirements:
- Age-appropriate vocabulary for Grade ${grade}
- Clear beginning, middle, end
- Include a subtle lesson or moral

After the story, include:
- 5 comprehension questions
- 3 vocabulary words to discuss
- 1 discussion prompt`

  try {
    const message = await client.messages.create({
      model: pickModel(),
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const story = String(message?.content?.[0]?.text || '')
    await logAIRequest({
      schoolId,
      feature: 'ai-story-weaver',
      prompt,
      response: story,
      tokensUsed: message?.usage?.output_tokens,
    })

    return { success: true, story, tokensUsed: message?.usage?.output_tokens || 0 }
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
    const message = await client.messages.create({
      model: pickModel(),
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const lesson = String(message?.content?.[0]?.text || '')
    await logAIRequest({
      schoolId,
      feature: 'phonics-trainer',
      prompt,
      response: lesson,
      tokensUsed: message?.usage?.output_tokens,
    })

    return { success: true, lesson, tokensUsed: message?.usage?.output_tokens || 0 }
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
    const message = await client.messages.create({
      model: pickModel(),
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = String(message?.content?.[0]?.text || '')
    await logAIRequest({
      schoolId,
      feature: 'cbc-competency-tracker',
      prompt,
      response: analysis,
      tokensUsed: message?.usage?.output_tokens,
    })

    return { success: true, analysis, tokensUsed: message?.usage?.output_tokens || 0 }
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to analyze competencies' }
  }
}
