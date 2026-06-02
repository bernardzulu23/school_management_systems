import { AIUnavailableError, AICompletionError } from '@/lib/ai/provider'
import { groqProvider } from '@/lib/ai/providers/groq'
import { openaiProvider } from '@/lib/ai/providers/openai'

export { AIUnavailableError, AICompletionError }

export async function getAIProvider() {
  if (await groqProvider.isAvailable()) return groqProvider
  if (await openaiProvider.isAvailable()) return openaiProvider
  throw new AIUnavailableError(
    'No AI provider is configured. Set GROQ_API_KEY in environment variables.'
  )
}

/**
 * @param {import('@/lib/ai/provider').AICompletionRequest} request
 */
export async function complete(request) {
  const provider = await getAIProvider()
  try {
    return await provider.complete(request)
  } catch (error) {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs')
        .then((Sentry) => {
          Sentry.captureException(error, {
            tags: { provider: provider.name, model: process.env.GROQ_MODEL },
          })
        })
        .catch(() => {})
    }
    if (error instanceof AIUnavailableError) throw error
    throw new AICompletionError(error?.message || 'AI completion failed', {
      provider: provider.name,
      model: process.env.GROQ_MODEL,
    })
  }
}
