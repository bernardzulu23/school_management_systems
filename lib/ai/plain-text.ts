/**
 * Shared plain-text rules and sanitization for human-readable AI output.
 * Used by story weaver, report comments, lesson plans, study assistant, chat, etc.
 */

export const PLAIN_TEXT_OUTPUT_RULES = `CRITICAL: Use PLAIN TEXT ONLY. No markdown:
- Do NOT use # headers (### Title)
- Do NOT use ** or __ or * for bold/italic
- Do NOT use backticks or code fences
- Do NOT use --- horizontal rules

Instead:
- Put section titles on their own line as plain text (e.g. File Compression Methods)
- Use dash bullets for lists: - item
- Use numbers for ordered lists: 1. 2. 3.
- Use clear blank lines between sections`

/**
 * Strip markdown markers while keeping readable list structure.
 * Markdown bullets (* / +) become plain "- " bullets.
 */
export function sanitizePlainText(text: string): string {
  if (!text) return ''

  let out = String(text)
    .replace(/^\s*---+?\s*$/gm, '')
    .replace(/^\s*---+[ \t]*/gm, '')
    .replace(/^\s*\*{3,}\s*$/gm, '')
    .replace(/^\s*[—–]\s*$/gm, '')
    .replace(/^\s*[—–][ \t]*/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')

  // Normalize markdown list markers to plain dashes before stripping italics.
  out = out.replace(/^[\t ]*[+*]\s+/gm, '- ')
  out = out.replace(/^[\t ]*-\s+/gm, '- ')

  // Remaining single-asterisk / underscore emphasis (not list markers).
  out = out
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return out
}

/** Alias for lesson-plan and legacy imports */
export const sanitizeText = sanitizePlainText
