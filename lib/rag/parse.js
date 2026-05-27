/**
 * Extract plain text from uploaded material bytes.
 * @param {Buffer} buffer
 * @param {'pdf' | 'docx' | 'txt' | string} fileType
 * @returns {Promise<string>}
 */
export async function extractTextFromBuffer(buffer, fileType) {
  const type = String(fileType || '').toLowerCase()
  if (!buffer?.length) return ''

  if (type === 'txt' || type === 'text') {
    return buffer.toString('utf8')
  }

  if (type === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    return String(result?.text || '').trim()
  }

  if (type === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return String(result?.value || '').trim()
  }

  throw new Error(`Unsupported file type for ingestion: ${fileType}`)
}

/**
 * @param {string} fileName
 * @returns {'pdf' | 'docx' | 'txt' | null}
 */
export function inferFileTypeFromName(fileName) {
  const lower = String(fileName || '').toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.txt')) return 'txt'
  return null
}
