import { NextRequest, NextResponse } from 'next/server'
import { generateECZPractice } from '@/lib/aiml/tools/ecz-practice-papers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    if (
      !body?.subject ||
      !body?.grade ||
      !body?.examLevel ||
      !body?.questionCount ||
      !body?.timeLimit
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const paper = await generateECZPractice(body)
    return NextResponse.json(paper)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate practice paper' },
      { status: 500 }
    )
  }
}
