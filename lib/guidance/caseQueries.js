export const guidanceCaseListInclude = {
  pupil: { select: { id: true, name: true, class: true, exam_number: true } },
  assignedTo: { select: { id: true, name: true } },
  escalation: {
    select: { id: true, escalatedToId: true, acknowledgedAt: true, escalatedAt: true },
  },
  _count: { select: { logs: true, referrals: true } },
}

export const guidanceCaseDetailInclude = {
  pupil: {
    select: {
      id: true,
      name: true,
      class: true,
      exam_number: true,
      parent_father_name: true,
      parent_father_contact: true,
      parent_mother_name: true,
      parent_mother_contact: true,
      guardian_name: true,
      guardian_contact: true,
    },
  },
  assignedTo: { select: { id: true, name: true } },
  openedBy: { select: { id: true, name: true } },
  escalation: true,
  logs: {
    orderBy: { date: 'desc' },
    include: { loggedBy: { select: { id: true, name: true } } },
  },
  referrals: { orderBy: { referralDate: 'desc' } },
  reEntry: true,
}
