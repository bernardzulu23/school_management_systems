import { embedWithGemini } from '@/lib/ai/embeddings/gemini'
import { embedWithJina, type JinaTask } from '@/lib/ai/embeddings/jina'

type EmbedTask = JinaTask

export async function embedWithFallback(
  text: string,
  task: EmbedTask = 'retrieval.passage'
): Promise<{ vector: number[]; provider: string }> {
  const geminiTask = task === 'retrieval.query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT'

  try {
    const vector = await embedWithGemini(text)
    console.log('[AI:Embed] provider=gemini', { task: geminiTask })
    return { vector, provider: 'gemini' }
  } catch (err) {
    console.warn('[AI:Embed] Gemini failed, trying Jina', err)
  }

  try {
    const vector = await embedWithJina(text, task)
    console.log('[AI:Embed] provider=jina', { task })
    return { vector, provider: 'jina' }
  } catch (err) {
    throw new Error(`All embedding providers failed: ${err}`)
  }
}
