/** ECZ special accommodation types and allowed measures (Rule 6). */

export const ACCOMMODATION_TYPES = [
  {
    id: 'VISUAL_IMPAIRMENT',
    label: 'Visual impairment',
    icon: '👁',
    measures: [
      'Braille papers',
      'Enlarged print',
      'Extra time',
      'Reader / scribe',
      'Separate venue',
    ],
  },
  {
    id: 'HEARING_IMPAIRMENT',
    label: 'Hearing impairment',
    icon: '👂',
    measures: [
      'Sign language interpreter',
      'Written instructions',
      'Extra time',
      'Front-row seating',
    ],
  },
  {
    id: 'PHYSICAL_DISABILITY',
    label: 'Physical disability',
    icon: '🦽',
    measures: [
      'Accessible venue',
      'Scribe',
      'Extra time',
      'Assistive devices',
      'Ground-floor room',
    ],
  },
  {
    id: 'LEARNING_DIFFICULTY',
    label: 'Learning difficulty',
    icon: '📚',
    measures: ['Scribe', 'Extra time', 'Separate venue', 'Simplified papers', 'Rest breaks'],
  },
  {
    id: 'MEDICAL_CONDITION',
    label: 'Medical condition',
    icon: '🏥',
    measures: [
      'Rest breaks',
      'Medication access',
      'Extra time',
      'Flexible seating',
      'Separate venue',
    ],
  },
]

export function getAccommodationType(id) {
  return ACCOMMODATION_TYPES.find((t) => t.id === id) || null
}

export function accommodationTypeLabel(id) {
  return getAccommodationType(id)?.label || String(id || '').replace(/_/g, ' ')
}
