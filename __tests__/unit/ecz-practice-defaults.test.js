import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/ai/client', () => ({
  generateAIObject: vi.fn(async () => ({ object: { paper: { examInfo: {} } } })),
}))

import { generateAIObject } from '@/lib/ai/client'
import { generateECZPractice } from '@/lib/aiml/tools/ecz-practice-papers'

describe('generateECZPractice exam level defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults new requests to form1 when no level is provided', async () => {
    await generateECZPractice({
      subject: 'Mathematics',
      grade: '',
      examLevel: '',
      topic: 'Fractions',
      questionCount: 5,
      timeLimit: 60,
    })

    expect(generateAIObject).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.stringContaining('Exam Level: form1'),
      expect.anything()
    )
  })

  it('preserves legacy junior certificate requests', async () => {
    await generateECZPractice({
      subject: 'Mathematics',
      grade: '',
      examLevel: 'JC',
      topic: 'Fractions',
      questionCount: 5,
      timeLimit: 60,
    })

    expect(generateAIObject).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.stringContaining('Exam Level: grade9'),
      expect.anything()
    )
  })
})
