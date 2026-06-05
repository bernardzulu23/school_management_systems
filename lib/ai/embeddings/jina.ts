export type JinaTask = 'retrieval.passage' | 'retrieval.query'

export async function embedWithJina(
  text: string,
  task: JinaTask = 'retrieval.passage'
): Promise<number[]> {
  const apiKey = String(process.env.JINA_API_KEY || '').trim()
  if (!apiKey) throw new Error('JINA_API_KEY not set for embeddings')

  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: [text],
      task,
      dimensions: 768,
    }),
  })

  if (!res.ok) throw new Error(`Jina embed error ${res.status}`)
  const data = await res.json()
  const embedding = data?.data?.[0]?.embedding
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Jina returned empty embedding')
  }
  return embedding as number[]
}
