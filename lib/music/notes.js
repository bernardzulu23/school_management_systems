/** Shared pitch definitions for Digital Music Composer */

const NATURAL_NOTES_C3_B3 = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3']
const NATURAL_NOTES_C4_B4 = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
const NATURAL_NOTES_C5_B5 = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5']
const NATURAL_NOTES_C6 = ['C6']

/** Full natural range C3–C6 for sequencer keyboard */
export const NATURAL_NOTES = [
  ...NATURAL_NOTES_C3_B3,
  ...NATURAL_NOTES_C4_B4,
  ...NATURAL_NOTES_C5_B5,
  ...NATURAL_NOTES_C6,
]

/** Sharps on middle octave (second keyboard row) */
export const SHARP_NOTES = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4']

/** Legacy alias — middle octave naturals (backward compatible presets) */
export const NOTES = NATURAL_NOTES_C4_B4.concat(['C5', 'D5', 'E5'])

const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#10b981',
  '#f43f5e',
  '#6366f1',
  '#14b8a6',
  '#eab308',
  '#a855f7',
  '#64748b',
  '#0ea5e9',
  '#84cc16',
  '#f472b6',
  '#78716c',
  '#0891b2',
  '#dc2626',
  '#7c3aed',
  '#059669',
  '#ca8a04',
  '#be185d',
]

export const NOTE_COLORS = NATURAL_NOTES.map((_, i) => COLOR_PALETTE[i % COLOR_PALETTE.length])

export const SHARP_NOTE_COLORS = SHARP_NOTES.map(
  (_, i) => COLOR_PALETTE[(i + 10) % COLOR_PALETTE.length]
)

export const DURATIONS = ['16n', '8n', '4n', '2n', '1n']
export const DURATION_LABELS = {
  '16n': '1/16',
  '8n': '1/8',
  '4n': '1/4',
  '2n': '1/2',
  '1n': 'Whole',
}

/** Tone.js Salamander sampler URLs for naturals C3–C5 */
export function getSalamanderUrls() {
  const keys = [
    'A0',
    'C1',
    'D#1',
    'F#1',
    'A1',
    'C2',
    'D#2',
    'F#2',
    'A2',
    'C3',
    'D#3',
    'F#3',
    'A3',
    'C4',
    'D#4',
    'F#4',
    'A4',
    'C5',
    'D#5',
    'F#5',
    'A5',
  ]
  const urls = {}
  for (const k of keys) {
    urls[k] = `${k.replace('#', '%23')}.mp3`
  }
  return urls
}

export const PRESETS = [
  {
    name: 'Twinkle',
    sequence: [
      { note: 'C4', duration: '4n' },
      { note: 'C4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'A4', duration: '4n' },
      { note: 'A4', duration: '4n' },
      { note: 'G4', duration: '2n' },
      { note: 'F4', duration: '4n' },
      { note: 'F4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'C4', duration: '2n' },
    ],
  },
  {
    name: 'Scale Up',
    sequence: NATURAL_NOTES_C4_B4.concat(['C5']).map((n) => ({ note: n, duration: '4n' })),
  },
  {
    name: 'Ode to Joy',
    sequence: [
      { note: 'E4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'F4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'F4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'C4', duration: '4n' },
      { note: 'C4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'E4', duration: '2n' },
      { note: 'D4', duration: '4n' },
      { note: 'D4', duration: '2n' },
    ],
  },
]
