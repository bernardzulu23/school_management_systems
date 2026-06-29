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
  { value: 'BURSARY', label: 'Bursary / scholarship' },
  { value: 'INSTITUTION_INFO', label: 'Institution information' },
  { value: 'CAREER_DAY', label: 'Career day / event' },
]
