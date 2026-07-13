/**
 * Post-process AI Story Weaver output by subject content type.
 * Ensures expected section headers and plain-text structure.
 */

import { sanitizePlainText } from '@/lib/ai/plain-text'
import {
  getSubjectPromptTemplate,
  type SubjectContentType,
  type SubjectPromptTemplate,
} from '@/lib/ai/subjectPromptTemplates'

export type FormattedSubjectContent = {
  type: SubjectContentType
  label: string
  subjectKey: string
  text: string
  sectionsFound: string[]
  missingSections: string[]
}

function normalizeHeaderLine(line: string): string {
  return String(line || '')
    .trim()
    .replace(/:+\s*$/, '')
    .toUpperCase()
}

/**
 * Detect which expected section headers appear in the AI output.
 */
export function findSectionsInText(
  text: string,
  expected: string[]
): {
  found: string[]
  missing: string[]
} {
  const lines = String(text || '').split(/\r?\n/)
  const found = new Set<string>()

  for (const line of lines) {
    const n = normalizeHeaderLine(line)
    if (!n) continue
    for (const section of expected) {
      const s = section.toUpperCase()
      if (n === s || n.startsWith(`${s} `) || n.startsWith(`${s}:`) || n.includes(s)) {
        found.add(section)
      }
    }
  }

  const foundList = expected.filter((s) => found.has(s))
  const missing = expected.filter((s) => !found.has(s))
  return { found: foundList, missing }
}

/**
 * Light structural pass: sanitize markdown, ensure title block, append missing headers as prompts.
 */
export function formatByType(
  aiOutput: string,
  type: SubjectContentType,
  template?: SubjectPromptTemplate
): string {
  const cleaned = sanitizePlainText(aiOutput)
  const sections = template?.sections || []
  if (!sections.length) return cleaned

  const { missing } = findSectionsInText(cleaned, sections)
  if (missing.length === 0) return cleaned

  // Soft fallback: append missing section stubs so teachers still see the intended structure
  const stubs = missing
    .map((s) => `\n\n${s}:\n(Teacher note: expand this section if the model omitted it.)`)
    .join('')

  return `${cleaned}${stubs}`.trim()
}

export function formatSubjectContent(params: {
  subject: string
  aiOutput: string
}): FormattedSubjectContent {
  const template = getSubjectPromptTemplate(params.subject)
  const text = formatByType(params.aiOutput, template.type, template)
  const { found, missing } = findSectionsInText(text, template.sections)

  return {
    type: template.type,
    label: template.label,
    subjectKey: params.subject,
    text,
    sectionsFound: found,
    missingSections: missing.filter((s) => !found.includes(s)),
  }
}

/** Human-readable content type for UI chips. */
export function getContentTypeLabel(subject: string): string {
  return getSubjectPromptTemplate(subject).label
}

/** Whether story-type / bilingual / comprehension-only controls should show. */
export function usesStoryControls(subject: string): boolean {
  return getSubjectPromptTemplate(subject).type === 'COMPREHENSION'
}

/**
 * Build a simple HTML document for print / Save as PDF / Word paste.
 * Week-2 will add dedicated PDFKit/docx templates; this is the interim export.
 */
export function buildExportHtml(params: {
  title: string
  grade: string
  subject: string
  setting?: string
  contentTypeLabel: string
  body: string
}): string {
  const bodyHtml = String(params.body || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>${params.title} — ${params.subject}</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.75;color:#111}
  h1{color:#ff3b00;font-size:1.5rem}
  .meta{color:#444;font-size:0.9rem;margin-bottom:1.25rem}
  .type{display:inline-block;border:1px solid #ccc;padding:2px 8px;border-radius:4px;font-size:0.8rem;margin-right:6px}
  hr{border:none;border-top:1px solid #ddd;margin:1.25rem 0}
</style></head><body>
<h1>${params.title}</h1>
<p class="meta">
  <span class="type">${params.contentTypeLabel}</span>
  ${params.grade} · ${params.subject}${params.setting ? ` · ${params.setting}` : ''}
</p>
<hr/>
<div>${bodyHtml}</div>
</body></html>`
}

/**
 * Download as .doc (HTML Word-compatible) in the browser.
 */
export function downloadAsWordDoc(params: { filename: string; html: string }): void {
  if (typeof window === 'undefined') return
  const blob = new Blob(['\ufeff', params.html], {
    type: 'application/msword',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.filename.endsWith('.doc') ? params.filename : `${params.filename}.doc`
  a.click()
  URL.revokeObjectURL(url)
}
