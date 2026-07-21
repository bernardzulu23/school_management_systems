import {
  extensionFromName,
  formatFileSize,
  inferStudyMaterialType,
  inferRagFileType,
  isAllowedStudyExtension,
  isAllowedRagExtension,
  MAX_DIRECT_UPLOAD_BYTES,
} from '@/lib/uploads/materialFile'

describe('materialFile helpers', () => {
  test('extensionFromName extracts lowercase extension', () => {
    expect(extensionFromName('Notes.PDF')).toBe('pdf')
    expect(extensionFromName('path/to/unit-2.docx')).toBe('docx')
    expect(extensionFromName('noext')).toBe('')
  })

  test('inferStudyMaterialType maps common classroom files', () => {
    expect(inferStudyMaterialType('chapter1.pdf')).toBe('pdf')
    expect(inferStudyMaterialType('slides.pptx')).toBe('powerpoint')
    expect(inferStudyMaterialType('clip.mp4')).toBe('video')
    expect(inferStudyMaterialType('diagram.png')).toBe('image')
    expect(inferStudyMaterialType('pack.zip')).toBe('zip')
    expect(inferStudyMaterialType('notes.docx')).toBe('file')
  })

  test('inferRagFileType only allows pdf/docx/txt', () => {
    expect(inferRagFileType('a.pdf')).toBe('pdf')
    expect(inferRagFileType('a.DOCX')).toBe('docx')
    expect(inferRagFileType('a.txt')).toBe('txt')
    expect(inferRagFileType('a.pptx')).toBeNull()
  })

  test('allowed extension checks', () => {
    expect(isAllowedStudyExtension('x.pdf')).toBe(true)
    expect(isAllowedStudyExtension('x.exe')).toBe(false)
    expect(isAllowedRagExtension('x.pdf')).toBe(true)
    expect(isAllowedRagExtension('x.zip')).toBe(false)
  })

  test('formatFileSize is human readable', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
    expect(formatFileSize(-1)).toBe('')
  })

  test('direct upload limit is under Vercel body cap', () => {
    expect(MAX_DIRECT_UPLOAD_BYTES).toBeLessThanOrEqual(4.5 * 1024 * 1024)
  })
})
