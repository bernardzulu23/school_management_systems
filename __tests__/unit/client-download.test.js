import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadBulkUploadErrorCsv } from '@/lib/uploads/clientDownload'

describe('downloadBulkUploadErrorCsv', () => {
  let createObjectURL
  let revokeObjectURL
  let click
  let remove
  let appendChild

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock')
    revokeObjectURL = vi.fn()
    click = vi.fn()
    remove = vi.fn()
    appendChild = vi.fn()

    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL
    global.document = {
      createElement: vi.fn((tag) => {
        if (tag === 'a') {
          return { href: '', download: '', click, remove }
        }
        return {}
      }),
      body: { appendChild },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.document
  })

  it('downloads a CSV with error rows without using ExcelJS', () => {
    downloadBulkUploadErrorCsv(
      [
        {
          excelRow: 4,
          full_name: 'Chanda Banda',
          email: 'chanda@school.edu.zm',
          errors: [{ field: 'email', error: 'Duplicate email' }],
        },
      ],
      'errors.csv'
    )

    expect(createObjectURL).toHaveBeenCalled()
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('text/csv')
    expect(click).toHaveBeenCalled()
    expect(appendChild).toHaveBeenCalled()
  })
})
