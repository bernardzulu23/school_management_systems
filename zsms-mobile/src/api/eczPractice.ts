import { api } from './client'
import type { EczGenerateInput, EczPaper } from '@/types'

export async function generateEczPaper(input: EczGenerateInput): Promise<EczPaper> {
  const data = await api<{ success?: boolean; paper?: EczPaper; error?: string }>(
    '/api/ai/ecz-practice',
    {
      method: 'POST',
      body: JSON.stringify({
        subject: input.subject,
        topic: input.topic,
        examLevel: input.examLevel || 'form1',
        questionCount: input.questionCount ?? 5,
      }),
    }
  )
  if (!data.paper) {
    throw new Error(data.error || 'Failed to generate practice paper')
  }
  return data.paper
}
