export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

/** PWA push subscription stub — mobile app uses /api/mobile/push/register. */
export async function POST() {
  return NextResponse.json(
    {
      success: true,
      message: 'Web push subscriptions are not configured. Use the mobile app for push.',
    },
    { status: 200 }
  )
}
