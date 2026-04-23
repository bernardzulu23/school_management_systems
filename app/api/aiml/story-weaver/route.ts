import { NextRequest, NextResponse } from 'next/server'
import { generateStory } from '@/lib/aiml/tools/story-weaver'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    if (!body?.title || !body?.grade || !body?.theme || !body?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const story = await generateStory(body)
    return NextResponse.json(story)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate story' },
      { status: 500 }
    )
  }
}
