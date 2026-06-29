/**
 * Format a CDC curriculum record as an embeddable RAG chunk (one record = one chunk).
 * @param {import('./types').CurriculumRecord} record
 * @param {import('./types').CurriculumMeta} [meta]
 */
export function formatCurriculumRecord(record, meta = {}) {
  const competences = (record.specificCompetences || []).map((c) => `- ${c}`).join('\n')
  const activities = (record.learningActivities || []).map((a) => `- ${a}`).join('\n')
  const keywords = (record.keywords || []).join(', ')
  const assessments = (record.suggestedAssessmentTypes || []).join(', ')

  const lines = [
    'Zambia CDC 2024 Chemistry Syllabus (Ordinary Level)',
    `Form ${record.form} | Topic ${record.topicNumber}: ${record.topic}`,
    `Subtopic ${record.subtopicNumber}: ${record.subtopic}`,
    `Chunk ID: ${record.id}`,
    '',
    'Specific competences:',
    competences,
    '',
    'Learning activities:',
    activities,
    '',
    `Expected standard: ${record.expectedStandard}`,
    '',
    `Keywords: ${keywords}`,
    '',
    `Suggested assessment types: ${assessments}`,
  ]

  if (meta.source) {
    lines.push('', `Source: ${meta.source}`)
  }
  if (meta.isbn) {
    lines.push(`ISBN: ${meta.isbn}`)
  }

  return lines.join('\n')
}

/**
 * @param {import('./types').CurriculumRecord[]} records
 * @param {import('./types').CurriculumMeta} [meta]
 */
export function formatCurriculumRecords(records, meta = {}) {
  return (records || []).map((r) => formatCurriculumRecord(r, meta))
}
