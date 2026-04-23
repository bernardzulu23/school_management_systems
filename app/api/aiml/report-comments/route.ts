import { NextRequest, NextResponse } from 'next/server'
import { generateReportComment } from '@/lib/aiml/tools/report-comments'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    if (
      !body?.name ||
      !body?.subject ||
      !body?.grade ||
      body?.marks === undefined ||
      body?.attendance === undefined ||
      !body?.participation ||
      !body?.strengths ||
      !body?.areasOfImprovement
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const comment = await generateReportComment(body)
    return NextResponse.json(comment)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate report comment' },
      { status: 500 }
    )
  }
}
