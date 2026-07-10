import { NextResponse } from 'next/server'

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(all|any|previous|prior)\s+(instructions|rules|prompts?)\b/i,
  /\bdisregard\s+(all|any|the)\s+(instructions|rules|prompts?)\b/i,
  /\boverride\s+(system|safety|security)\b/i,
  /\bact\s+as\s+(system|developer|root|administrator)\b/i,
  /\breveal\s+(your|the)\s+(system|developer)\s+prompt\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bbypass\s+(guardrails?|safety|security|filters?)\b/i,
  /\bjailbreak\b/i,
]

const EDUCATION_PATTERNS: RegExp[] = [
  /\beducation\b/i,
  /\bschool\b/i,
  /\bclass(room)?\b/i,
  /\bstudent(s)?\b/i,
  /\bteacher(s)?\b/i,
  /\blearner(s)?\b/i,
  /\bsyllabus\b/i,
  /\bcurriculum\b/i,
  /\blesson\b/i,
  /\bquiz\b/i,
  /\bexam\b/i,
  /\bassessment\b/i,
  /\bhomework\b/i,
  /\bsubject\b/i,
  /\bgrade\b/i,
  /\bform\s*[1-6]\b/i,
  /\becz\b/i,
  /\bzambia(n)?\b/i,
]

export type GuardrailCheckInput = {
  text: string
}

export type GuardrailResult = { ok: true } | { ok: false; response: NextResponse }

function normalizeText(input: string): string {
  return String(input || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function containsPromptInjection(text: string): boolean {
  const normalized = normalizeText(text)
  return INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function appearsEducationRelated(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  return EDUCATION_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function validateAIGuardrails(input: GuardrailCheckInput): GuardrailResult {
  const normalized = normalizeText(input.text)
  if (!normalized) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Content flagged by safety guardrails.' },
        { status: 400 }
      ),
    }
  }

  if (containsPromptInjection(normalized)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Content flagged by safety guardrails.' },
        { status: 400 }
      ),
    }
  }

  if (!appearsEducationRelated(normalized)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Content flagged by safety guardrails.' },
        { status: 400 }
      ),
    }
  }

  return { ok: true }
}
