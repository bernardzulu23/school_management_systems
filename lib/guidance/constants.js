/** k-anonymity threshold for headteacher aggregate reports */
export const GUIDANCE_K_ANONYMITY_THRESHOLD = 3

/**
 * Years after case closure before auto-archive (configurable; confirm with school DPO).
 * Hard deletion after pupil departure uses the same window by default.
 */
export const GUIDANCE_CASE_RETENTION_YEARS = Number(process.env.GUIDANCE_CASE_RETENTION_YEARS || 7)

export const GUIDANCE_LEGAL_BASIS =
  'School duty of care under MoGE guidance and counselling mandate; Data Protection Act No. 3 of 2021 — processing necessary for safeguarding and educational support of pupils.'

export const CASE_CATEGORIES = [
  { value: 'CAREER', label: 'Career guidance' },
  { value: 'ACADEMIC', label: 'Academic support' },
  { value: 'PERSONAL_SOCIAL', label: 'Personal / social' },
  { value: 'HEALTH_WELFARE', label: 'Health & welfare' },
]

export const CONFIDENTIALITY_TIERS = [
  { value: 'STANDARD', label: 'Standard', description: 'Visible to guidance staff in your scope' },
  {
    value: 'SENSITIVE',
    label: 'Sensitive',
    description: 'Assigned guidance teacher only — head sees aggregates only',
  },
  {
    value: 'SAFEGUARDING',
    label: 'Safeguarding',
    description: 'Auto-escalates to headteacher — abuse, self-harm, pregnancy/re-entry',
  },
]

export const RESOURCE_TYPES = [
  { value: 'SUBJECT_FOCUS', label: 'Subjects to concentrate on' },
  { value: 'UNIVERSITY_PROGRAM', label: 'University / programme' },
  { value: 'BURSARY', label: 'Bursary / scholarship' },
  { value: 'INSTITUTION_INFO', label: 'Institution information' },
  { value: 'CAREER_DAY', label: 'Career day / event' },
]

/** Softcopy vault categories aligned to guidance teacher duties */
export const GUIDANCE_DOC_KINDS = [
  { value: 'INDIVIDUAL_COUNSELLING', label: 'Individual counselling' },
  { value: 'GROUP_COUNSELLING', label: 'Group counselling' },
  { value: 'CAREER', label: 'Career guidance' },
  { value: 'ACADEMIC', label: 'Academic guidance' },
  { value: 'SPECIAL_NEEDS_REFERRAL', label: 'Special needs / referral' },
  { value: 'BEHAVIOUR', label: 'Positive behaviour' },
  { value: 'SOCIAL_PREVENTION', label: 'Social problems / prevention' },
  { value: 'PARENT_GUARDIAN', label: 'Parents / guardians' },
  { value: 'STAFF_CONSULT', label: 'Staff consultation' },
  { value: 'PROGRAMME', label: 'Guidance programmes' },
  { value: 'CONFIDENTIAL_RECORD', label: 'Confidential counselling records' },
  { value: 'EXTERNAL_REFERRAL', label: 'External specialist referral' },
  { value: 'MENTAL_HEALTH', label: 'Mental health & wellbeing' },
  { value: 'PROGRESS_FOLLOWUP', label: 'Progress monitoring / follow-up' },
  { value: 'INCLUSION', label: 'Safe & inclusive environment' },
  { value: 'GENERAL', label: 'General' },
]

export const GUIDANCE_DOC_KIND_VALUES = GUIDANCE_DOC_KINDS.map((k) => k.value)
