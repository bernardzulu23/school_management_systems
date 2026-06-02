/**
 * @typedef {object} AICompletionRequest
 * @property {string} systemPrompt
 * @property {string} userPrompt
 * @property {number} [maxTokens]
 * @property {number} [temperature]
 * @property {'text'|'json'} [responseFormat]
 */

/**
 * @typedef {object} AICompletionResponse
 * @property {string} text
 * @property {string} provider
 * @property {string} modelUsed
 * @property {number} [tokensUsed]
 */

/**
 * @typedef {object} AIProvider
 * @property {string} name
 * @property {() => Promise<boolean>} isAvailable
 * @property {(request: AICompletionRequest) => Promise<AICompletionResponse>} complete
 */

export class AIUnavailableError extends Error {
  constructor(message = 'No AI provider is configured.') {
    super(message)
    this.name = 'AIUnavailableError'
  }
}

export class AICompletionError extends Error {
  constructor(message, { provider, model } = {}) {
    super(message)
    this.name = 'AICompletionError'
    this.provider = provider
    this.model = model
  }
}
