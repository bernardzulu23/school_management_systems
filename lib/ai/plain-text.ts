/**
 * Shared plain-text rules and sanitization for human-readable AI output.
 * Used by story weaver, report comments, lesson plans, study assistant, etc.
 */

export const PLAIN_TEXT_OUTPUT_RULES = `CRITICAL: Use PLAIN TEXT ONLY. NO markdown formatting:
- Do NOT use asterisks (*) for bold or italic
- Do NOT use # for headers
- Do NOT use ** or __ for emphasis
- Do NOT use underscores for formatting
- Do NOT use backticks or code fences
- Do NOT use --- horizontal rules or markdown dividers

Instead:
- Use ALL CAPS for section headers: COMPREHENSION QUESTIONS:, VOCABULARY EXERCISES:, etc.
- Use numbers for lists: 1. 2. 3.
- Use clear blank lines between sections`

export function sanitizePlainText(text: string): string {
  if (!text) return ''

  return text
    .replace(/^\s*---+?\s*$/gm, '')
    .replace(/^\s*---+[ \t]*/gm, '')
    .replace(/^\s*\*{3,}\s*$/gm, '')
    .replace(/^\s*[—–]\s*$/gm, '')
    .replace(/^\s*[—–][ \t]*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Alias for lesson-plan and legacy imports */
export const sanitizeText = sanitizePlainText
