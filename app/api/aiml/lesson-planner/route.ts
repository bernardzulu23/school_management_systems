import { NextRequest, NextResponse } from 'next/server'
import { generateLessonPlan } from '@/lib/aiml/tools/lesson-planner'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    if (!body?.subject || !body?.grade || !body?.topic || !body?.duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const lessonPlan = await generateLessonPlan(body)
    return NextResponse.json(lessonPlan)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate lesson plan' },
      { status: 500 }
    )
  }
}
