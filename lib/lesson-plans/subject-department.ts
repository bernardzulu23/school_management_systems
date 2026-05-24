import { DEPARTMENTS } from '@/config/subjects'

function normalizeSubject(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Map UI subject labels to department names using shared subject config. */
export function resolveDepartmentForSubject(subject: unknown): string | null {
  const needle = normalizeSubject(subject)
  if (!needle) return null

  for (const dept of DEPARTMENTS) {
    for (const s of dept.subjects) {
      const candidate = normalizeSubject(s)
      if (candidate === needle) return dept.name
      if (candidate.includes(needle) || needle.includes(candidate)) return dept.name
    }
  }

  const aliases: Record<string, string> = {
    'english language': 'Literature and Languages',
    'integrated science': 'Natural Sciences',
    'computer studies / ict': 'Natural Sciences',
    'religious education': 'Social Sciences',
    'civic education': 'Social Sciences',
    'social studies': 'Social Sciences',
    'principles of accounts': 'Business Studies',
    'financial literacy': 'Business Studies',
    'home economics': 'Home Economics',
    'art & design': 'Expressive Arts',
    'physical education': 'Expressive Arts',
    'zambian languages': 'Literature and Languages',
  }

  return aliases[needle] || null
}
