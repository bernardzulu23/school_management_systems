export interface AIMessage {
  role: 'user' | 'system' | 'assistant'
  content: string
}

export interface AIResponse {
  text: string
  provider: 'groq' | 'gemini' | 'openrouter'
  model: string
}

export interface AIProvider {
  name: 'groq' | 'gemini' | 'openrouter'
  model: string
  isAvailable(): Promise<boolean>
  chat(messages: AIMessage[]): Promise<string>
}
