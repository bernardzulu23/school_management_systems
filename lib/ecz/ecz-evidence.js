/** ECZ SBA evidence retention (Rule 7 — 2 years). */

export const EVIDENCE_RETENTION_YEARS = 2

export const EVIDENCE_ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

export const EVIDENCE_MAX_BYTES = 25 * 1024 * 1024

export function computeEvidenceExpiryDate(uploadedAt = new Date()) {
  const d = new Date(uploadedAt)
  d.setFullYear(d.getFullYear() + EVIDENCE_RETENTION_YEARS)
  return d
}

/** @returns {'ok' | 'urgent' | 'expired'} */
export function getEvidenceRetentionStatus(expiryDate) {
  const exp = new Date(expiryDate)
  const now = new Date()
  if (exp <= now) return 'expired'
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  if (days <= 90) return 'urgent'
  return 'ok'
}

export function daysUntilExpiry(expiryDate) {
  const exp = new Date(expiryDate)
  return Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24))
}
