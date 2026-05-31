/** Two-letter subject codes for compact aSc-style timetable cells. */

const KNOWN: Record<string, string> = {
  mathematics: 'Ma',
  math: 'Ma',
  maths: 'Ma',
  english: 'En',
  'english language': 'En',
  geography: 'Ge',
  history: 'Hi',
  physics: 'Ph',
  chemistry: 'Ch',
  biology: 'Bi',
  science: 'Sc',
  'integrated science': 'Is',
  civics: 'Ci',
  religious: 'Re',
  'religious education': 'Re',
  music: 'Mu',
  art: 'Ar',
  'physical education': 'Pe',
  pe: 'Pe',
  ict: 'It',
  computer: 'It',
  'computer studies': 'It',
  commerce: 'Co',
  accounts: 'Ac',
  accounting: 'Ac',
  economics: 'Ec',
  agriculture: 'Ag',
  french: 'Fr',
  spanish: 'Sp',
  chichewa: 'Ch',
  nyanja: 'Ny',
  bemba: 'Be',
  lozi: 'Lo',
  tonga: 'To',
  lunda: 'Lu',
  kaonde: 'Ka',
  luvale: 'Lv',
  nature: 'Na',
  'social studies': 'Ss',
  technology: 'Te',
  design: 'Dt',
  'design and technology': 'Dt',
}

function normalizeKey(name: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Prefer subject `code` from DB when present; otherwise map or first two letters. */
export function abbreviateSubject(name: string | undefined | null, code?: string | null): string {
  const c = String(code || '').trim()
  if (c.length >= 2 && c.length <= 4) return c.slice(0, 2).toUpperCase()
  if (c.length === 1) return c.toUpperCase()

  const key = normalizeKey(name || '')
  if (KNOWN[key]) return KNOWN[key]

  const words = key.split(/[\s/\-]+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  const w = words[0] || '??'
  return w.slice(0, 2).toUpperCase()
}
