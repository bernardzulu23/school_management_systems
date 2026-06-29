export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { fetchMarketingHomepage } from '@/lib/sanity/marketingHomepage'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const GET = withSecureHandler(async function GET() {
  try {
    const content = await fetchMarketingHomepage()
    if (!content) {
      return NextResponse.json({ configured: false, content: null }, { status: 200 })
    }

    return NextResponse.json({ configured: true, content })
  } catch {
    return NextResponse.json(
      { configured: false, content: null, error: 'Failed to load marketing content' },
      { status: 500 }
    )
  }
})
