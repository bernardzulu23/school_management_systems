import { NextRequest, NextResponse } from 'next/server'
import { generateQuiz } from '@/lib/aiml/tools/quiz-maker'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    if (!body?.topic || !body?.grade || !body?.questionCount || !body?.questionTypes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const quiz = await generateQuiz(body)
    return NextResponse.json(quiz)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}
