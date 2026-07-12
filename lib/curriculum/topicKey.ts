/**
 * Stable topic keys for curriculum → scheme week → lesson plan mapping.
 */

export function slugPart(value: string | number | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Prefer CDC id when present; otherwise subject|grade|unit|topicIndex|title.
 */
export function buildTopicKey(opts: {
  cdcId?: string | null
  subject?: string | null
  gradeOrForm?: string | null
  unitNumber?: number | null
  topicIndex?: number | null
  topicTitle?: string | null
}): string {
  const cdc = String(opts.cdcId || '').trim()
  if (cdc) return cdc
  const parts = [
    slugPart(opts.subject) || 'subject',
    slugPart(opts.gradeOrForm) || 'grade',
    `u${Number(opts.unitNumber) || 0}`,
    `t${Number(opts.topicIndex) || 0}`,
    slugPart(opts.topicTitle) || 'topic',
  ]
  return parts.join('|')
}
