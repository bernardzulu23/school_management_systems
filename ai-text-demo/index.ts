import { streamText } from 'ai'
import 'dotenv/config'

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error('Missing AI_GATEWAY_API_KEY. Set it in ai-text-demo/.env.local or env vars.')
  }

  const result = streamText({
    model: 'openai/gpt-5.4',
    prompt: 'Invent a new holiday and describe its traditions.',
  })

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart)
  }

  console.log()
  console.log('Token usage:', await result.usage)
}

main().catch(console.error)
