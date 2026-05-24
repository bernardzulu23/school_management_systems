/** Shared plain-text cleanup for lesson plan display, export, and generation. */

export function sanitizeText(text: string): string {
  if (!text) return ''

  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function formatLessonPlanForDisplay(content: string): string {
  return sanitizeText(content)
}

export function parseLessonPlanContent(content: string): {
  header: string
  sections: Array<{ title: string; content: string }>
  rawText: string
} {
  const clean = sanitizeText(content)
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
