# ZSMS AI Features — Complete Integration Guide

## What's in this package

| File                                | Destination in your project            |
| ----------------------------------- | -------------------------------------- |
| api-routes/story-weaver-route.js    | app/api/ai/story-weaver/route.js       |
| api-routes/lesson-planner-route.js  | app/api/ai/lesson-planner/route.js     |
| api-routes/quiz-maker-route.js      | app/api/ai/quiz-maker/route.js         |
| api-routes/report-comments-route.js | app/api/ai/report-comments/route.js    |
| api-routes/ecz-practice-route.js    | app/api/ai/ecz-practice/route.js       |
| lib/aiUsageTracker.js               | lib/middleware/aiUsageTracker.js       |
| lib/useAIStream.js                  | hooks/useAIStream.js                   |
| components/UpgradePrompt.js         | components/shared/UpgradePrompt.js     |
| components/AILessonPlanner.js       | components/creative/AILessonPlanner.js |

## Step 1 — Database migration

Add to prisma/schema.prisma (from schema-additions.prisma):

- AIUsageLog model
- plan, planExpiresAt, trialEndsAt fields to School model

Then run:

```bash
npx prisma migrate dev --name add_ai_usage_and_plans
npx prisma generate
```

## Step 2 — Environment variables

In Railway Variables and .env.local:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

## Step 3 — Install dependencies (if not already)

```bash
npm install @anthropic-ai/sdk
```

## Step 4 — Upgrade your existing story weaver

Replace app/api/ai/story-weaver/route.js with api-routes/story-weaver-route.js

Then update AIStoryWeaver.js to use the streaming hook:

```javascript
import { useAIStream } from '@/hooks/useAIStream'

// Replace your existing fetch call with:
const { text, loading, error, done, start, reset } = useAIStream('/api/ai/story-weaver')

// Replace generateStory function with:
const generate = () => start(form)

// Text now streams in real-time — update your render:
<div>{text}{loading && <span className="cursor-blink">|</span>}</div>
```

## Step 5 — Create pages for each AI tool

```javascript
// app/dashboard/teacher/lesson-planner/page.js
import AILessonPlanner from '@/components/creative/AILessonPlanner'
export default function Page() {
  return <AILessonPlanner />
}

// Repeat for: story-weaver, quiz-maker, report-comments
// app/dashboard/student/ecz-practice/page.js
```

## Step 6 — Wire up Creative Teaching Hub

In CreativeTeachingHub.js, the featureId-to-route mapping:

```javascript
const ROUTES = {
  'ai-story-weaver': '/dashboard/teacher/story-weaver',
  'ai-lesson-planner': '/dashboard/teacher/lesson-planner',
  'ai-quiz-maker': '/dashboard/teacher/quiz-maker',
  'ai-report-comments': '/dashboard/teacher/report-comments',
  'ecz-practice': '/dashboard/student/ecz-practice',
}
```

## Step 7 — Set plans for existing schools

In your admin dashboard or via DB:

```sql
-- Give all existing schools Standard trial
UPDATE "School"
SET plan = 'standard',
    "trialEndsAt" = NOW() + INTERVAL '30 days'
WHERE plan IS NULL OR plan = 'trial';
```

## How streaming works

1. User clicks Generate
2. useAIStream sends POST to /api/ai/[feature]
3. API creates a ReadableStream connected to Claude's stream
4. Text arrives word-by-word via Server-Sent Events (SSE)
5. useAIStream updates `text` state in real-time
6. UI renders text as it arrives — same as ChatGPT

## AI Usage limits by plan

| Plan     | AI Requests/month | Features                                               |
| -------- | ----------------- | ------------------------------------------------------ |
| trial    | 10                | All Standard features                                  |
| basic    | 0                 | No AI features                                         |
| standard | 50                | Story weaver, lesson planner, quiz maker, ECZ practice |
| premium  | unlimited         | Everything including report comments                   |

## Testing

```bash
# Test story weaver
curl -X POST http://localhost:3000/api/ai/story-weaver \
  -H "Content-Type: application/json" \
  -d '{"grade":"Form 3","subject":"English","topic":"Water cycle","storyType":"story"}'

# Should stream SSE events in real time
```

///Story weaver route · JS

// app/api/ai/story-weaver/route.js
// Upgraded to streaming — text appears word by word like ChatGPT
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { requireFeature } from '@/lib/middleware/planGate'
import { trackAIUsage, checkAILimit } from '@/lib/middleware/aiUsageTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ALLOWED_ROLES = ['teacher', 'hod', 'headteacher', 'administrator', 'admin']

const TYPE_INSTRUCTIONS = {
story: 'Write an engaging narrative story with named Zambian characters, a clear plot with beginning, middle, and end, plus a moral or educational lesson.',
fable: 'Write a fable featuring animals native to Zambia (elephant, crocodile, eagle, lion, baboon, etc.) that teaches the educational concept through their actions and dialogue.',
dialogue: 'Write a realistic, natural conversation between 2-3 Zambian students or community members that explores and explains the topic through their discussion.',
poem: 'Write an educational poem with rhyme, rhythm, and vivid imagery that teaches the concept memorably. Include a title.',
}

export async function POST(req) {
const schoolId = await getSchoolIdFromRequest(req)
if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 401 })

const user = await getAuthUser(req)
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

if (!ALLOWED_ROLES.includes(user.role?.toLowerCase())) {
return NextResponse.json({ error: 'Teachers and above only' }, { status: 403 })
}

const planBlock = await requireFeature(schoolId, 'ai-story-weaver')
if (planBlock) return planBlock

const limitBlock = await checkAILimit(schoolId)
if (limitBlock) return limitBlock

const { grade, subject, topic, storyType = 'story', setting = 'Eastern Province', length = '4-5 paragraphs', includeQuestions = true } = await req.json()

if (!topic?.trim()) return NextResponse.json({ error: 'Topic is required' }, { status: 400 })

const prompt = `You are an educational content writer for Zambian secondary schools.

Create a ${storyType} for ${grade} students studying ${subject}.
Topic: ${topic}
Setting: ${setting}, Zambia
Length: ${length}

Instructions:

- ${TYPE_INSTRUCTIONS[storyType] || TYPE_INSTRUCTIONS.story}
- Use authentic Zambian names: Chanda, Mwamba, Nalumino, Bwalya, Thandiwe, Mutale, Mulenga, Chipego
- Reference real Zambian places, foods, customs, and culture naturally
- Educational content must be accurate and Zambian curriculum-aligned
- Write in clear English appropriate for ${grade}
${includeQuestions ? `
  After the story, add:

---

COMPREHENSION QUESTIONS:

1. [Recall question]
2. [Inference/understanding question]
3. [Critical thinking/discussion question]
4. [Real-life Zambia connection question]` : ''}

Write now:`

// Use streaming — text appears in real time
const encoder = new TextEncoder()

const stream = new ReadableStream({
async start(controller) {
try {
const claudeStream = await client.messages.stream({
model: 'claude-sonnet-4-6',
max_tokens: 1500,
messages: [{ role: 'user', content: prompt }]
})

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const data = JSON.stringify({ text: event.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        await trackAIUsage(schoolId, 'story-weaver')
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
        controller.close()
      }
    }

})

return new Response(stream, {
headers: {
'Content-Type': 'text/event-stream',
'Cache-Control': 'no-cache',
'Connection': 'keep-alive',
}
})
}

//Lesson planner route · JS
// app/api/ai/lesson-planner/route.js
import Anthropic from '@anthropic-ai/sdk'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { requireFeature } from '@/lib/middleware/planGate'
import { trackAIUsage, checkAILimit } from '@/lib/middleware/aiUsageTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
const schoolId = await getSchoolIdFromRequest(req)
if (!schoolId) return new Response('No school', { status: 401 })

const user = await getAuthUser(req)
if (!user) return new Response('Unauthorized', { status: 401 })

const planBlock = await requireFeature(schoolId, 'ai-lesson-planner')
if (planBlock) return planBlock

const limitBlock = await checkAILimit(schoolId)
if (limitBlock) return limitBlock

const { grade, subject, topic, duration = '40 mins', learningStyle = 'mixed', priorKnowledge = '' } = await req.json()

if (!topic?.trim() || !subject?.trim()) {
return new Response(JSON.stringify({ error: 'Topic and subject required' }), { status: 400 })
}

const prompt = `You are a Zambian curriculum specialist creating lesson plans for secondary schools.

Create a complete, detailed lesson plan with this structure:

LESSON PLAN
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Duration: ${duration}
Learning Style: ${learningStyle}
${priorKnowledge ? `Prior Knowledge: ${priorKnowledge}` : ''}

Format your response with these exact sections:

## LEARNING OBJECTIVES

List 3-4 specific, measurable objectives (what students will be able to DO after this lesson).

## MATERIALS AND RESOURCES

List all materials needed (include locally available Zambian materials where possible).

## LESSON OUTLINE

### Introduction / Starter (5 minutes)

How to engage and activate prior knowledge.

### Main Teaching Activity (${parseInt(duration) - 15 || 25} minutes)

Step-by-step teaching with Zambian examples and context.

### Student Practice Activity (10 minutes)

What students do to practise the concept.

### Closure / Summary (5 minutes)

How to consolidate learning.

## ASSESSMENT

How you will know students have met the objectives (include specific questions to ask).

## DIFFERENTIATION

- Support for struggling students:
- Challenge for advanced students:

## HOMEWORK

One meaningful homework task connected to Zambian daily life.

## TEACHER NOTES

Key vocabulary, common misconceptions, and tips.

Use Zambian context, examples from daily Zambian life, and align to ECZ syllabus requirements.`

const encoder = new TextEncoder()
const stream = new ReadableStream({
async start(controller) {
try {
const claudeStream = await client.messages.stream({
model: 'claude-sonnet-4-6',
max_tokens: 2000,
messages: [{ role: 'user', content: prompt }]
})

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }

        await trackAIUsage(schoolId, 'lesson-planner')
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
        controller.close()
      }
    }

})

return new Response(stream, {
headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
})
}

//Quiz maker route · JS

// app/api/ai/quiz-maker/route.js
// Returns structured JSON quiz — not streaming (needs valid JSON)
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { requireFeature } from '@/lib/middleware/planGate'
import { trackAIUsage, checkAILimit } from '@/lib/middleware/aiUsageTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
const schoolId = await getSchoolIdFromRequest(req)
if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 401 })

const user = await getAuthUser(req)
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const planBlock = await requireFeature(schoolId, 'ai-quiz-maker')
if (planBlock) return planBlock

const limitBlock = await checkAILimit(schoolId)
if (limitBlock) return limitBlock

const {
grade,
subject,
topic,
questionTypes = ['mcq', 'true_false'],
difficulty = 'medium',
questionCount = 10,
includeAnswers = true,
} = await req.json()

if (!topic?.trim()) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

const prompt = `You are a Zambian ECZ-aligned assessment specialist.

Generate a quiz for ${grade} ${subject} students on: ${topic}
Difficulty: ${difficulty}
Question types requested: ${questionTypes.join(', ')}
Total questions: ${questionCount}

Return ONLY valid JSON in this exact format (no extra text):
{
"title": "Quiz title",
"grade": "${grade}",
  "subject": "${subject}",
"topic": "${topic}",
  "difficulty": "${difficulty}",
"estimatedTime": "X minutes",
"questions": [
{
"id": 1,
"type": "mcq",
"question": "Question text here?",
"options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
"answer": "A",
"explanation": "Brief explanation of why this is correct",
"marks": 1
},
{
"id": 2,
"type": "true_false",
"question": "Statement to evaluate as true or false.",
"answer": "True",
"explanation": "Explanation",
"marks": 1
},
{
"id": 3,
"type": "short_answer",
"question": "Short answer question?",
"answer": "Expected answer",
"explanation": "What a good answer should include",
"marks": 2
}
],
"totalMarks": 12,
"curriculumAlignment": "ECZ ${grade} ${subject} syllabus reference"
}

Rules:

- Use Zambian context, examples, and names where relevant
- MCQ options must be clearly labelled A, B, C, D
- Short answer questions worth 2 marks
- Make questions curriculum-relevant and at the right difficulty
- Mix question types as requested
- Total questions must equal ${questionCount}`

  try {
  const message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 3000,
  messages: [{ role: 'user', content: prompt }]
  })

      const rawText = message.content[0]?.text || ''
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid JSON response from AI')

      const quiz = JSON.parse(jsonMatch[0])
      await trackAIUsage(schoolId, 'quiz-maker')

      return NextResponse.json({ quiz, generated: true })

  } catch (err) {
  console.error('[quiz-maker]', err.message)
  return NextResponse.json({ error: 'Failed to generate quiz. Try again.' }, { status: 500 })
  }
  }

//Report comments route · JS
// app/api/ai/report-comments/route.js
import Anthropic from '@anthropic-ai/sdk'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { requireFeature } from '@/lib/middleware/planGate'
import { trackAIUsage, checkAILimit } from '@/lib/middleware/aiUsageTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
const schoolId = await getSchoolIdFromRequest(req)
if (!schoolId) return new Response('No school', { status: 401 })

const user = await getAuthUser(req)
if (!user) return new Response('Unauthorized', { status: 401 })

const planBlock = await requireFeature(schoolId, 'ai-report-comments')
if (planBlock) return planBlock

const limitBlock = await checkAILimit(schoolId)
if (limitBlock) return limitBlock

const {
studentName,
grade,
term,
attendance,
subjects,
strengths,
areasForImprovement,
behaviour,
tone = 'professional',
commentLength = 'medium',
} = await req.json()

if (!studentName?.trim()) return new Response(JSON.stringify({ error: 'Student name required' }), { status: 400 })

const lengthMap = { short: '2-3 sentences', medium: '4-5 sentences', long: '6-8 sentences' }
const toneMap = {
professional: 'formal and professional',
encouraging: 'warm, encouraging, and positive while honest',
constructive: 'constructive and growth-focused',
}

const subjectSummary = subjects?.map(s => `${s.name}: ${s.mark}% (${s.grade})`).join(', ') || 'No subject data provided'

const prompt = `You are a Zambian secondary school educator writing student report card comments.

Write a ${lengthMap[commentLength]} report comment for:
Student: ${studentName}
Grade/Form: ${grade}
Term: ${term}
Attendance: ${attendance || 'Not specified'}
Subject performance: ${subjectSummary}
Strengths observed: ${strengths || 'To be determined from grades'}
Areas needing improvement: ${areasForImprovement || 'General improvement needed'}
Behaviour/attitude: ${behaviour || 'Generally satisfactory'}
Tone required: ${toneMap[tone] || toneMap.professional}

Rules:

- Never use the student's name more than once (use "they/their" after first mention)
- Be specific about academic performance
- Include ONE actionable recommendation
- Avoid clichés like "hardworking student" without evidence
- Reference Zambian educational context where appropriate
- Do not fabricate specific test scores or events not mentioned
- End with a forward-looking statement about next term

Write only the comment text, no labels or formatting:`

const encoder = new TextEncoder()
const stream = new ReadableStream({
async start(controller) {
try {
const claudeStream = await client.messages.stream({
model: 'claude-sonnet-4-6',
max_tokens: 400,
messages: [{ role: 'user', content: prompt }]
})

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }

        await trackAIUsage(schoolId, 'report-comments')
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
        controller.close()
      }
    }

})

return new Response(stream, {
headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
})
}

//Ecz practice route · JS

// app/api/ai/ecz-practice/route.js
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { requireFeature } from '@/lib/middleware/planGate'
import { trackAIUsage, checkAILimit } from '@/lib/middleware/aiUsageTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ECZ_SUBJECTS = {
'English Language': { grade9: true, grade12: true },
'Mathematics': { grade9: true, grade12: true },
'Integrated Science': { grade9: true, grade12: false },
'Social Studies': { grade9: true, grade12: false },
'Biology': { grade9: false, grade12: true },
'Chemistry': { grade9: false, grade12: true },
'Physics': { grade9: false, grade12: true },
'Geography': { grade9: true, grade12: true },
'History': { grade9: true, grade12: true },
'Civic Education': { grade9: true, grade12: true },
'Computer Studies': { grade9: true, grade12: true },
'Commerce': { grade9: false, grade12: true },
'Accounts': { grade9: false, grade12: true },
}

export async function POST(req) {
const schoolId = await getSchoolIdFromRequest(req)
if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 401 })

const user = await getAuthUser(req)
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const planBlock = await requireFeature(schoolId, 'ecz-practice')
if (planBlock) return planBlock

const limitBlock = await checkAILimit(schoolId)
if (limitBlock) return limitBlock

const {
examLevel = 'grade9',
subject,
topic,
paperType = 'paper1',
questionCount = 5,
year = new Date().getFullYear(),
} = await req.json()

if (!subject?.trim()) return NextResponse.json({ error: 'Subject required' }, { status: 400 })

const levelLabel = examLevel === 'grade9' ? 'Grade 9 (Junior Secondary)' : 'Grade 12 (Senior Secondary)'
const paperLabel = paperType === 'paper1' ? 'Paper 1 (Multiple Choice)' : 'Paper 2 (Structured/Essay)'

const prompt = `You are an ECZ (Examinations Council of Zambia) question setter with deep knowledge of the Zambian curriculum.

Generate ${questionCount} ${paperLabel} practice questions for:
Examination: ECZ ${levelLabel} Examinations
Subject: ${subject}
${topic ? `Topic/Chapter: ${topic}` : 'Topics: Cover major syllabus areas'}
Style: Past-paper authentic (mirror actual ECZ question style and difficulty)

Return ONLY valid JSON:
{
"examInfo": {
"subject": "${subject}",
    "level": "${levelLabel}",
"paperType": "${paperLabel}",
    "topic": "${topic || 'Mixed topics'}",
"totalMarks": 0,
"timeAllowed": "X minutes",
"instructions": "Answer ALL questions. / Answer X questions from Section..."
},
"questions": [
{
"number": 1,
"type": "mcq",
"marks": 1,
"question": "Question text",
"options": ["A. Option", "B. Option", "C. Option", "D. Option"],
"answer": "A",
"explanation": "Why A is correct"
}
],
"markingGuide": "Brief marking notes for teacher"
}

For Paper 2, use types: "structured" (2-4 marks with sub-parts a,b,c) or "essay" (8-12 marks).
For Paper 1, use type: "mcq" (1 mark each).

Make questions realistic to actual ECZ style — not too easy, use Zambian context where possible.`

try {
const message = await client.messages.create({
model: 'claude-sonnet-4-6',
max_tokens: 3500,
messages: [{ role: 'user', content: prompt }]
})

    const rawText = message.content[0]?.text || ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI returned invalid format')

    const paper = JSON.parse(jsonMatch[0])
    paper.examInfo.totalMarks = paper.questions.reduce((sum, q) => sum + (q.marks || 1), 0)

    await trackAIUsage(schoolId, 'ecz-practice')
    return NextResponse.json({ paper, subjects: Object.keys(ECZ_SUBJECTS) })

} catch (err) {
console.error('[ecz-practice]', err.message)
return NextResponse.json({ error: 'Failed to generate practice paper.' }, { status: 500 })
}
}

export async function GET() {
return NextResponse.json({ subjects: Object.keys(ECZ_SUBJECTS) })
}

//Aiusagetracker · JS
// lib/middleware/aiUsageTracker.js
// Tracks AI usage per school per month — enforces 50/month limit on Standard plan
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { planIncludes } from '@/lib/plans'

export async function trackAIUsage(schoolId, featureId) {
const now = new Date()
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

try {
await prisma.aIUsageLog.upsert({
where: { schoolId_monthKey_featureId: { schoolId, monthKey, featureId } },
update: { count: { increment: 1 }, lastUsedAt: now },
create: { schoolId, monthKey, featureId, count: 1, lastUsedAt: now }
})
} catch {
// Non-blocking — don't fail the request if tracking fails
}
}

export async function checkAILimit(schoolId) {
try {
const school = await prisma.school.findUnique({
where: { id: schoolId },
select: { plan: true }
})

    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

    // Premium has unlimited AI — no check needed
    if (school.plan?.toLowerCase() === 'premium') return null

    // Basic has no AI features — blocked at requireFeature level
    // Standard gets 50/month
    if (school.plan?.toLowerCase() === 'standard') {
      const now = new Date()
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const usage = await prisma.aIUsageLog.findMany({
        where: { schoolId, monthKey },
        select: { count: true }
      })

      const totalUsed = usage.reduce((sum, u) => sum + u.count, 0)
      const STANDARD_LIMIT = 50

      if (totalUsed >= STANDARD_LIMIT) {
        return NextResponse.json({
          error: `Monthly AI limit reached (${STANDARD_LIMIT} requests/month on Standard plan)`,
          code: 'AI_LIMIT_REACHED',
          used: totalUsed,
          limit: STANDARD_LIMIT,
          upgradeMessage: 'Upgrade to Premium for unlimited AI requests'
        }, { status: 429 })
      }
    }

    return null // No limit hit

} catch {
return null // Non-blocking — allow if DB check fails
}
}

export async function getAIUsageStats(schoolId) {
const now = new Date()
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const school = await prisma.school.findUnique({
where: { id: schoolId },
select: { plan: true }
})

const usage = await prisma.aIUsageLog.findMany({
where: { schoolId, monthKey },
select: { featureId: true, count: true, lastUsedAt: true },
orderBy: { count: 'desc' }
})

const totalUsed = usage.reduce((sum, u) => sum + u.count, 0)
const plan = school?.plan?.toLowerCase() || 'basic'
const limit = plan === 'premium' ? null : plan === 'standard' ? 50 : 0

return {
totalUsed,
limit,
remaining: limit === null ? 'unlimited' : Math.max(0, limit - totalUsed),
plan,
breakdown: usage,
monthKey
}
}

//Useaistream · JS
// hooks/useAIStream.js
// Reusable hook for all streaming AI features
// Usage: const { stream, text, loading, error, start, reset } = useAIStream('/api/ai/story-weaver')
'use client'
import { useState, useCallback, useRef } from 'react'

export function useAIStream(endpoint) {
const [text, setText] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
const [done, setDone] = useState(false)
const abortRef = useRef(null)

const start = useCallback(async (body) => {
setText('')
setError('')
setDone(false)
setLoading(true)

    // Cancel any in-progress stream
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.error || `Request failed (${res.status})`

        // Handle plan restriction
        if (res.status === 403 && errData.code === 'PLAN_UPGRADE_REQUIRED') {
          setError(`UPGRADE_REQUIRED:${errData.currentPlan}`)
        } else if (res.status === 402 && errData.code === 'PLAN_EXPIRED') {
          setError('PLAN_EXPIRED')
        } else if (res.status === 429 && errData.code === 'AI_LIMIT_REACHED') {
          setError(`AI_LIMIT:${errData.used}/${errData.limit}`)
        } else {
          setError(msg)
        }
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done: streamDone } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { setDone(true); break }

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) { setError(parsed.error); break }
            if (parsed.text) setText(prev => prev + parsed.text)
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Connection error. Check your internet.')
      }
    } finally {
      setLoading(false)
    }

}, [endpoint])

const reset = useCallback(() => {
if (abortRef.current) abortRef.current.abort()
setText('')
setError('')
setLoading(false)
setDone(false)
}, [])

return { text, loading, error, done, start, reset }
}

// Non-streaming version for JSON responses (quiz maker, ecz practice)
export function useAIFetch(endpoint) {
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

const fetch\_ = useCallback(async (body) => {
setData(null)
setError('')
setLoading(true)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 403) setError(`UPGRADE_REQUIRED:${json.currentPlan || 'basic'}`)
        else if (res.status === 429) setError(`AI_LIMIT:${json.used}/${json.limit}`)
        else setError(json.error || 'Request failed')
      } else {
        setData(json)
      }
    } catch (err) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }

}, [endpoint])

return { data, loading, error, fetch: fetch\_ }
}

//Upgradeprompt · JS
// components/shared/UpgradePrompt.js
// Shown when useAIStream or useAIFetch gets an upgrade error
'use client'
import { useRouter } from 'next/navigation'

export default function UpgradePrompt({ error, onDismiss }) {
const router = useRouter()

if (!error) return null

if (error === 'PLAN_EXPIRED') {
return (
<div style={containerStyle('#3b0a0a', '#7f1d1d', '#fca5a5')}>
<div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
<p style={{ fontWeight: 700, marginBottom: 4 }}>Your subscription has expired</p>
<p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>Renew your plan to continue using AI features.</p>
<button onClick={() => router.push('/dashboard/billing')} style={btnStyle('#ef4444')}>Renew Plan →</button>
</div>
)
}

if (error.startsWith('AI_LIMIT:')) {
const [used, limit] = error.replace('AI_LIMIT:', '').split('/')
const pct = Math.round((Number(used) / Number(limit)) \* 100)
return (
<div style={containerStyle('#2d1f0a', '#92400e', '#fcd34d')}>
<div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
<p style={{ fontWeight: 700, marginBottom: 4 }}>Monthly AI limit reached</p>
<div style={{ height: 6, background: '#1a1207', borderRadius: 99, marginBottom: 8, overflow: 'hidden' }}>
<div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 99 }} />
</div>
<p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>{used} of {limit} AI requests used this month. Upgrade to Premium for unlimited AI.</p>
<div style={{ display: 'flex', gap: 8 }}>
<button onClick={() => router.push('/dashboard/billing')} style={btnStyle('#f59e0b')}>Upgrade to Premium →</button>
{onDismiss && <button onClick={onDismiss} style={{ ...btnStyle('transparent'), border: '1px solid #92400e', color: '#fcd34d' }}>Dismiss</button>}
</div>
</div>
)
}

if (error.startsWith('UPGRADE_REQUIRED:')) {
const currentPlan = error.replace('UPGRADE_REQUIRED:', '')
const nextPlan = currentPlan === 'basic' ? 'Standard' : 'Premium'
const nextPrice = currentPlan === 'basic' ? 'K300' : 'K600'
return (
<div style={containerStyle('#1e0c2d', '#6d28d9', '#a78bfa')}>
<div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
<p style={{ fontWeight: 700, marginBottom: 4 }}>{nextPlan} plan required</p>
<p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
This feature is not available on your current {currentPlan} plan.
Upgrade to {nextPlan} ({nextPrice}/month) to unlock this and many more features.
</p>
<div style={{ display: 'flex', gap: 8 }}>
<button onClick={() => router.push('/dashboard/billing')} style={btnStyle('#7c3aed')}>Upgrade to {nextPlan} →</button>
{onDismiss && <button onClick={onDismiss} style={{ ...btnStyle('transparent'), border: '1px solid #6d28d9', color: '#a78bfa' }}>See all plans</button>}
</div>
</div>
)
}

// Generic error
return (
<div style={containerStyle('#3b0a0a', '#7f1d1d', '#fca5a5')}>
<p style={{ fontWeight: 700, marginBottom: 4 }}>Something went wrong</p>
<p style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>{error}</p>
{onDismiss && <button onClick={onDismiss} style={btnStyle('#ef4444')}>Try again</button>}
</div>
)
}

function containerStyle(bg, border, color) {
return {
background: bg, border: `1px solid ${border}`, borderRadius: 12,
padding: '1.25rem', color, marginBottom: 16, textAlign: 'center'
}
}

function btnStyle(bg) {
return {
background: bg, border: 'none', borderRadius: 8,
padding: '9px 20px', fontWeight: 700, fontSize: 13,
cursor: 'pointer', color: bg === 'transparent' ? 'inherit' : '#170d28'
}
}
//Ailessonplanner · JS
// components/creative/AILessonPlanner.js
'use client'
import { useState } from 'react'
import { useAIStream } from '@/hooks/useAIStream'
import UpgradePrompt from '@/components/shared/UpgradePrompt'

const GRADES = ['Form 1','Form 2','Form 3','Form 4','Form 5']
const SUBJECTS = ['English','Mathematics','Integrated Science','Biology','Chemistry','Physics','Geography','History','Social Studies','Civic Education','Computer Studies','Commerce','Accounts','Religious Education']
const DURATIONS = ['30 mins','40 mins','45 mins','60 mins','80 mins (double period)']
const STYLES = ['mixed','visual','kinesthetic','auditory','discussion-based']

export default function AILessonPlanner({ user, school }) {
const [form, setForm] = useState({ grade: 'Form 3', subject: 'English', topic: '', duration: '40 mins', learningStyle: 'mixed', priorKnowledge: '' })
const { text, loading, error, done, start, reset } = useAIStream('/api/ai/lesson-planner')

const generate = () => {
if (!form.topic.trim()) return
start(form)
}

const printPlan = () => {
const win = window.open('', '\_blank')
win.document.write(`<html><head><title>Lesson Plan — ${form.topic}</title>
    <style>body{font-family:Georgia,serif;max-width:750px;margin:40px auto;line-height:1.8;color:#111}
    h1,h2{color:#4c1d95}h2{border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    pre{white-space:pre-wrap;font-family:inherit}</style></head><body>
    <h1>Lesson Plan</h1>
    <p><strong>Subject:</strong> ${form.subject} | <strong>Grade:</strong> ${form.grade} | <strong>Duration:</strong> ${form.duration}</p>
    <pre>${text}</pre></body></html>`)
win.print()
}

const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

return (
<div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh', background: '#170d28' }}>
<div style={{ borderRight: '1px solid #3b2a66', overflowY: 'auto', padding: '1.25rem' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
<span style={{ fontSize: 22 }}>📝</span>
<div>
<p style={{ color: '#ede9fe', fontWeight: 700, margin: 0 }}>AI Lesson Planner</p>
<p style={{ color: '#6d28d9', fontSize: 11, margin: 0 }}>ECZ curriculum aligned</p>
</div>
</div>

        {[{ label: 'Grade', key: 'grade', opts: GRADES },
          { label: 'Subject', key: 'subject', opts: SUBJECTS },
          { label: 'Duration', key: 'duration', opts: DURATIONS },
          { label: 'Learning Style', key: 'learningStyle', opts: STYLES }
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <Label>{f.label}</Label>
            <select value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={selectStyle}>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}

        <Label>Topic / Lesson Title *</Label>
        <input placeholder="e.g. The Water Cycle, Ohm's Law, Photosynthesis..." value={form.topic} onChange={e => set('topic', e.target.value)} style={inputStyle} />

        <Label>Students' Prior Knowledge</Label>
        <textarea placeholder="What do students already know? (optional)" value={form.priorKnowledge} onChange={e => set('priorKnowledge', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

        {error && <UpgradePrompt error={error} onDismiss={reset} />}

        <button onClick={generate} disabled={loading || !form.topic.trim()} style={{
          width: '100%', padding: '12px', background: loading ? '#4b3575' : '#7c3aed',
          border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700,
          fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8
        }}>
          {loading ? <><Spinner />Generating plan...</> : '✨ Generate Lesson Plan'}
        </button>

        {(text || loading) && (
          <button onClick={reset} style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px solid #3b2a66', borderRadius: 8, color: '#a78bfa', fontSize: 13, cursor: 'pointer' }}>
            🔄 Start New Plan
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {text && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#2d1f4e', borderBottom: '1px solid #3b2a66' }}>
            <button onClick={printPlan} style={actionBtn}>🖨️ Print / Save PDF</button>
            <button onClick={() => navigator.clipboard.writeText(text)} style={actionBtn}>📋 Copy</button>
            <span style={{ marginLeft: 'auto', color: '#6d28d9', fontSize: 12, alignSelf: 'center' }}>
              {done ? '✓ Complete' : '⏳ Generating...'}
            </span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {!text && !loading && (
            <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>📋</div>
              <p style={{ color: '#ede9fe', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Your lesson plan will appear here</p>
              <p style={{ color: '#6d28d9', fontSize: 13, maxWidth: 380, margin: '0 auto' }}>
                Fill in the form, enter your topic, and click Generate. Claude will write a complete, ECZ-aligned lesson plan in seconds.
              </p>
            </div>
          )}

          {(text || loading) && (
            <div style={{ background: '#2d1f4e', borderRadius: 14, padding: '1.75rem', border: '1px solid #3b2a66', maxWidth: 780, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {[form.grade, form.subject, form.duration].map(t => (
                  <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: '#261843', border: '1px solid #3b2a66', color: '#a78bfa' }}>{t}</span>
                ))}
              </div>
              <div style={{ color: '#ede9fe', lineHeight: 1.9, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {text}
                {loading && <span style={{ display: 'inline-block', width: 10, height: 16, background: '#7c3aed', marginLeft: 2, animation: 'blink 1s step-end infinite' }} />}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>

)
}

function Label({ children }) {
return <p style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, marginBottom: 5, marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</p>
}

function Spinner() {
return <div style={{ width: 14, height: 14, border: '2px solid #fff3', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
}

const inputStyle = { width: '100%', padding: '9px 11px', background: '#261843', border: '1px solid #3b2a66', borderRadius: 8, color: '#ede9fe', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 4 }
const selectStyle = { ...inputStyle, cursor: 'pointer', marginBottom: 4 }
const actionBtn = { padding: '6px 14px', background: '#261843', border: '1px solid #3b2a66', borderRadius: 8, color: '#a78bfa', fontSize: 12, cursor: 'pointer' }

//Schema additions · PRISMA

// ADD THESE TO prisma/schema.prisma
// Then run: npx prisma migrate dev --name add_ai_usage_tracking

// ── AI Usage Tracking ────────────────────────────────────────
model AIUsageLog {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
featureId String // "story-weaver" | "lesson-planner" | "quiz-maker" | etc.
monthKey String // "2025-04"
count Int @default(0)
lastUsedAt DateTime @default(now())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([schoolId, monthKey, featureId])
@@index([schoolId, monthKey])
}

// Also add to School model:
// plan String @default("trial") // "trial" | "basic" | "standard" | "premium"
// planExpiresAt DateTime?
// trialEndsAt DateTime?
// aiUsageLogs AIUsageLog[]

// ── Steps to apply ───────────────────────────────────────────
// 1. Add above to prisma/schema.prisma
// 2. npx prisma migrate dev --name add_ai_usage_and_plans
// 3. npx prisma generate
//
// Then set trial period for existing schools:
// UPDATE "School" SET "plan" = 'trial',
// "trialEndsAt" = NOW() + INTERVAL '30 days'
// WHERE "plan" IS NULL;
