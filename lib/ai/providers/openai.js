/** @type {import('../provider').AIProvider} */
export const openaiProvider = {
  name: 'openai',
  async isAvailable() {
    return false
  },
  async complete() {
    throw new Error(
      'OpenAI provider is not enabled. Set OPENAI_API_KEY and implement openaiProvider.complete().'
    )
  },
}
