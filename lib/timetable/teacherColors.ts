/** aSc-matched 20-color accessible palette for teacher identification. */
export const ASC_PALETTE = [
  '#4FC3F7',
  '#81C784',
  '#FFB74D',
  '#F06292',
  '#BA68C8',
  '#4DB6AC',
  '#FF8A65',
  '#90A4AE',
  '#AED581',
  '#FFD54F',
  '#4DD0E1',
  '#A5D6A7',
  '#FFCC02',
  '#EF9A9A',
  '#CE93D8',
  '#80DEEA',
  '#C5E1A5',
  '#FFE082',
  '#F48FB1',
  '#B0BEC5',
]

export function buildTeacherColorMap(teacherIds: string[]): Map<string, string> {
  const map = new Map<string, string>()
  const sorted = [...new Set(teacherIds.map(String).filter(Boolean))].sort()
  sorted.forEach((id, i) => map.set(id, ASC_PALETTE[i % ASC_PALETTE.length]))
  return map
}

export function teacherCardStyle(hexColor: string) {
  return {
    backgroundColor: `${hexColor}22`,
    borderLeft: `3px solid ${hexColor}`,
    borderColor: hexColor,
  }
}
