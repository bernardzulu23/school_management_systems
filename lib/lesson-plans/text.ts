/** Shared plain-text cleanup for lesson plan display, export, and generation. */

import { sanitizePlainText } from '@/lib/ai/plain-text'
import { stripLessonPlanHeaderBlock } from '@/lib/lesson-plans/header-block'

export { sanitizePlainText as sanitizeText } from '@/lib/ai/plain-text'

/** Remove AI-generated framework preamble so we can inject the teacher's form values instead. */
export function stripAiFrameworkSection(text: string): string {
  if (!text) return ''

  const cleaned = sanitizePlainText(text)
  const sectionStart = cleaned.search(
    /\n\s*(?:RATIONALE:|LEARNING OUTCOMES|1\.\s+GENERAL COMPETENCE|LESSON PLAN HEADER)\b/i
  )

  if (sectionStart >= 0) {
    return cleaned.slice(sectionStart).trim()
  }

  if (/^FRAMEWORK ELEMENTS\b/im.test(cleaned)) {
    return ''
  }

  return cleaned
}

export type ComposeLessonPlanOptions = {
  headerBlock?: string | null
  frameworkBlock?: string | null
}

export function composeLessonPlanDisplay(
  rawContent: string,
  options?: ComposeLessonPlanOptions | string | null
): string {
  const opts: ComposeLessonPlanOptions =
    typeof options === 'string' || options == null ? { frameworkBlock: options } : options

  let body = sanitizePlainText(rawContent)
  body = stripLessonPlanHeaderBlock(body)
  body = stripAiFrameworkSection(body)

  const parts = [opts.headerBlock, opts.frameworkBlock, body].filter((p) => String(p || '').trim())
  return parts.join('\n\n').trim()
}

export function formatLessonPlanForDisplay(content: string): string {
  return sanitizePlainText(content)
}

export function parseLessonPlanContent(content: string): {
  header: string
  sections: Array<{ title: string; content: string }>
  rawText: string
} {
  const clean = sanitizePlainText(content)
  const lines = clean.split('\n')

  const sections: Array<{ title: string; content: string }> = []
  let currentSection = ''
  let currentContent = ''

  for (const line of lines) {
    if (line.match(/^[A-Z][A-Z0-9\s]+:/) && currentSection) {
      sections.push({ title: currentSection, content: currentContent.trim() })
      currentSection = line.replace(':', '').trim()
      currentContent = ''
    } else if (line.match(/^[A-Z][A-Z0-9\s]+:$/)) {
      currentSection = line.replace(':', '').trim()
      currentContent = ''
    } else {
      currentContent += line + '\n'
    }
  }

  if (currentSection) {
    sections.push({ title: currentSection, content: currentContent.trim() })
  }

  return {
    header: sections[0]?.content || '',
    sections,
    rawText: clean,
  }
}
