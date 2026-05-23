/**
 * Quick Groq connectivity check: npx ts-node lib/aiml/test-connection.ts
 */
import { groqChatCompletion, getGroqModel } from '@/lib/ai/groq-client'

async function main() {
  const model = getGroqModel()
  console.log('Testing Groq model:', model)

  const { content, usage } = await groqChatCompletion({
    prompt: 'Reply with exactly: Groq OK',
    maxTokens: 20,
    temperature: 0,
  })

  console.log('Response:', content.trim())
  console.log('Tokens:', usage)
}

main().catch((err) => {
  console.error('Groq test failed:', err?.message || err)
  process.exit(1)
})
