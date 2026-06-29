export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { withSecureHandler } from '@/lib/middleware/secureApi'

function isSet(name) {
  return String(process.env[name] || '').trim().length > 0
}

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const providers = {
    huggingface: { configured: isSet('HUGGINGFACE_API_KEY') },
    openai: { configured: isSet('OPENAI_API_KEY') },
    voyage: { configured: isSet('VOYAGE_API_KEY') },
  }

  const configuredProviders = Object.entries(providers)
    .filter(([, v]) => v.configured)
    .map(([k]) => k)

  return NextResponse.json({
    success: true,
    ragEmbeddingsConfigured: configuredProviders.length > 0,
    configuredProviders,
    providers,
    recommendation:
      configuredProviders.length > 0
        ? `Primary configured providers: ${configuredProviders.join(', ')}`
        : 'Set at least one of HUGGINGFACE_API_KEY, OPENAI_API_KEY, or VOYAGE_API_KEY',
  })
})
