/**
 * Client helper: download assessment paper as PDF or DOCX via the shared export API.
 * Prefer this over HTML blobs / print-only flows.
 */

/**
 * @param {import('@/lib/exports/assessmentPaper').AssessmentPaperPayload} paper
 * @param {'pdf'|'word'} format
 */
export async function downloadAssessmentPaper(paper, format = 'pdf') {
  const res = await fetch('/api/exports/assessment-paper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ format, paper }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || json.message || `Export failed (${res.status})`)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const filename =
    match?.[1] ||
    `${String(paper.title || 'assessment').replace(/[^a-zA-Z0-9]+/g, '_')}.${
      format === 'word' ? 'docx' : 'pdf'
    }`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
