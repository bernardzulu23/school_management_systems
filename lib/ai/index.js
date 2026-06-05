import { AIUnavailableError, AICompletionError } from '@/lib/ai/provider'
import { groqProvider } from '@/lib/ai/providers/groq'
import { geminiProvider } from '@/lib/ai/providers/gemini'

export { AIUnavailableError, AICompletionError }

const PROVIDER_CHAIN = [groqProvider, geminiProvider]

export async function getAIProvider() {
  for (const provider of PROVIDER_CHAIN) {
    if (await provider.isAvailable()) return provider
  }
  throw new AIUnavailableError(
    'No AI provider is configured. Set GROQ_API_KEY and/or GEMINI_API_KEY in environment variables.'
  )
}

/**
 * @param {import('@/lib/ai/provider').AICompletionRequest} request
 */
export async function complete(request) {
  const errors = []

  for (const provider of PROVIDER_CHAIN) {
    if (!(await provider.isAvailable())) continue
    try {
      return await provider.complete(request)
    } catch (error) {
      const msg = error?.message || 'AI completion failed'
      errors.push(`${provider.name}: ${msg}`)
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        import('@sentry/nextjs')
          .then((Sentry) => {
            Sentry.captureException(error, {
              tags: { provider: provider.name, model: process.env.GROQ_MODEL },
            })
          })
          .catch(() => {})
      }
    }
  }

  if (errors.length === 0) {
    throw new AIUnavailableError(
      'No AI provider is configured. Set GROQ_API_KEY and/or GEMINI_API_KEY in environment variables.'
    )
  }

  throw new AICompletionError(`All AI providers failed:\n${errors.join('\n')}`, {
    provider: 'failover',
    model: process.env.GROQ_MODEL,
  })
}
