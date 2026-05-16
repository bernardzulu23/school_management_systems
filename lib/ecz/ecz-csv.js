/** Generate ECZ submission CSV from aggregated SBA scores. */

export function generateECZCSV({ school, subjectName, formLevel, academicYear, rows }) {
  const centre = school?.eczCentreNumber || school?.centreNumber || 'N/A'
  const schoolName = school?.name || 'Unknown School'

  let csv = 'SUBJECT,FORM,SCHOOL,CENTRE_NUMBER,YEAR\n'
  csv += `"${subjectName}",${formLevel},"${schoolName.replace(/"/g, '""')}",${centre},${academicYear}\n\n`
  csv += 'LEARNER_NAME,LEARNER_NUMBER,SBA_SCORE\n'

  for (const row of rows) {
    const name = String(row.learnerName || '').replace(/"/g, '""')
    const number = row.learnerNumber || 'N/A'
    const score = row.sbaScore ?? 0
    csv += `"${name}",${number},${score}\n`
  }

  return csv
}
