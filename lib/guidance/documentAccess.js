/**
 * Access helpers for guidance softcopy documents.
 */

import { canViewCaseDetail } from '@/lib/guidance/caseAccess'
import { matchesGuidanceScope } from '@/lib/guidance/pupilScope'

/**
 * Whether a guidance assignee may view a vault document.
 * Case-linked docs follow case visibility; standalone docs use confidentiality + uploader.
 */
export function canViewGuidanceDocument({ doc, user, assignment, caseRow = null, isHead = false }) {
  if (!doc || !user) return false

  if (doc.caseId && caseRow) {
    return canViewCaseDetail({ caseRow, user, assignment, isHead })
  }

  if (isHead) return false
  if (!assignment) return false

  if (doc.confidentiality === 'SAFEGUARDING') {
    return String(doc.uploadedById) === String(user.id)
  }

  if (doc.confidentiality === 'SENSITIVE') {
    return String(doc.uploadedById) === String(user.id)
  }

  // STANDARD: any active guidance assignee in school (optionally scoped by pupil class)
  if (doc.pupil?.class != null) {
    return matchesGuidanceScope(doc.pupil.class, assignment.scope)
  }
  return true
}

export function canUploadGuidanceDocument({ assignment }) {
  return Boolean(assignment)
}

export function canManageGuidanceDocument({ doc, user, assignment, caseRow = null }) {
  if (!doc || !user || !assignment) return false
  if (String(doc.uploadedById) === String(user.id)) return true
  if (doc.caseId && caseRow) {
    return (
      canViewCaseDetail({ caseRow, user, assignment, isHead: false }) &&
      String(caseRow.assignedToId) === String(user.id)
    )
  }
  return false
}
