/** @returns {'unpaid'|'partial'|'paid'|'overdue'} */
export function computeInvoiceStatus(netAmount, amountPaid, dueDate, now = new Date()) {
  const net = Number(netAmount || 0)
  const paid = Number(amountPaid || 0)
  const balance = net - paid
  if (balance <= 0) return 'paid'
  if (paid > 0) {
    const due = dueDate ? new Date(dueDate) : null
    if (due && due < now) return 'overdue'
    return 'partial'
  }
  const due = dueDate ? new Date(dueDate) : null
  if (due && due < now) return 'overdue'
  return 'unpaid'
}

export function pickParentPhone(student) {
  return (
    student?.parent_father_contact ||
    student?.parent_mother_contact ||
    student?.guardian_contact ||
    null
  )
}

export function computeSiblingDiscount(amount, siblingGroup) {
  if (!siblingGroup) return { discount: 0, discountType: null }
  const rate = Number(siblingGroup.discount ?? 0.1)
  const discount = Math.round(Number(amount) * rate * 100) / 100
  return { discount, discountType: 'sibling' }
}
