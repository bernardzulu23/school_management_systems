const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent'

export async function embedWithGemini(text: string): Promise<number[]> {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim()
  if (!apiKey) throw new Error('GEMINI_API_KEY not set for embeddings')

  const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    }),
  })

  if (!res.ok) throw new Error(`Gemini embed error ${res.status}`)
  const data = await res.json()
  const values = data?.embedding?.values
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini returned empty embedding')
  }
  return values as number[]
}
