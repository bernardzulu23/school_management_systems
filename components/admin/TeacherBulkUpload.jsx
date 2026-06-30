'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { withBrowserSessionFetchInit } from '@/lib/security/browserSessionHeaders'
import { downloadWorkbookFromApi } from '@/lib/uploads/workbookDbMapping'

function readCsrfToken() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split('; ').find((row) => row.startsWith('csrf_token='))
  if (!match) return ''
  try {
    return decodeURIComponent(match.slice('csrf_token='.length))
  } catch {
    return match.slice('csrf_token='.length)
  }
}

export default function TeacherBulkUpload() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const inputRef = useRef(null)

  async function handleDownloadTemplate() {
    setDownloading(true)
    try {
      await downloadWorkbookFromApi(
        '/api/teachers/bulk-upload/template',
        'ZSMS_Teacher_Bulk_Upload_Template.xlsx'
      )
    } catch (err) {
      setResult({ error: err.message || 'Template download failed' })
      setStatus('error')
    } finally {
      setDownloading(false)
    }
  }

  async function handleUpload(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setResult({ error: 'Please upload a .xlsx file only' })
      setStatus('error')
      return
    }

    setStatus('uploading')
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const csrf = readCsrfToken()
      const res = await fetch(
        '/api/teachers/bulk-upload',
        withBrowserSessionFetchInit({
          method: 'POST',
          body: form,
          credentials: 'include',
          headers: csrf ? { 'X-CSRF-Token': csrf } : {},
        })
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Upload failed')
      }
      setResult(data)
      setStatus('done')
    } catch (err) {
      setResult({ error: err.message || 'Upload failed' })
      setStatus('error')
    }
  }

  function downloadErrorReport(errors) {
    const wb = XLSX.utils.book_new()
    const rows = [
      ['Row #', 'Full Name', 'Email', 'Field', 'Error', 'Fix Required'],
      ...errors.flatMap((e) =>
        e.errors.map((err) => [
          e.excelRow,
          e.full_name || '',
          e.email || '',
          err.field,
          err.error,
          'Fix this row in your Excel file and re-upload',
        ])
      ),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [8, 25, 30, 18, 45, 35].map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, 'Error Report')
    XLSX.writeFile(wb, `ZSMS_Teacher_Upload_Errors_${Date.now()}.xlsx`)
  }

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <div className="flex items-start gap-3 mb-6">
        <FileSpreadsheet className="w-8 h-8 text-royalPurple-accentTx shrink-0" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold text-royalPurple-text1">Bulk Teacher Upload</h2>
          <p className="text-sm text-royalPurple-text2 mt-1">
            Import up to 500 teachers using the official ZSMS Excel template. Column headers align
            with <strong>User</strong>, <strong>Teacher</strong>, <strong>Department</strong>, and{' '}
            <strong>TeachingAssignment</strong> tables — see the Database Mapping sheet.
          </p>
        </div>
      </div>

      <div className="mb-4 p-4 rounded-xl border border-royalPurple-border/50 bg-royalPurple-card/40 space-y-3">
        <p className="text-sm text-royalPurple-text2">
          <strong>Step 1:</strong> Download the template (.xlsx). Do not rename sheets or columns.
        </p>
        <Button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={downloading}
          className="w-full sm:w-auto"
        >
          <Download className="w-4 h-4 mr-2" aria-hidden />
          {downloading ? 'Downloading…' : 'Download teacher upload template'}
        </Button>
        <p className="text-xs text-royalPurple-text3">
          Teaching assignments use <code className="text-xs">Class:Subject</code> pairs separated by
          semicolons, e.g. <code className="text-xs">Form 1A:Mathematics; Form 2B:English</code>.
        </p>
      </div>

      <p className="text-sm font-medium text-royalPurple-text1 mb-2">
        Step 2: Upload completed file
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleUpload(e.dataTransfer.files?.[0])
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-royalPurple-accent bg-royalPurple-accent/10' : 'border-royalPurple-border hover:border-royalPurple-accent/60'}`}
      >
        {status === 'uploading' ? (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="md" label="Uploading" />
            <p className="text-sm text-royalPurple-text2">
              Validating rows and importing teachers…
            </p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto mb-3 text-royalPurple-text3" aria-hidden />
            <p className="text-royalPurple-text2 text-sm">
              Drag and drop your .xlsx file here, or click to browse
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
      </div>

      {status === 'done' && result && (
        <div className="mt-6 p-4 rounded-xl bg-royalPurple-card border border-royalPurple-border text-sm space-y-2">
          <p className="font-medium text-royalPurple-text1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-royalPurple-successTx" aria-hidden />
            Upload complete
          </p>
          <p className="text-royalPurple-successTx">
            {result.insertedCount} of {result.totalRows} teachers imported successfully
          </p>
          {result.errorCount > 0 && (
            <>
              <p className="text-royalPurple-dangerTx flex items-center gap-2">
                <AlertCircle className="w-4 h-4" aria-hidden />
                {result.errorCount} row(s) failed validation or import
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => downloadErrorReport(result.errors)}
              >
                <Download className="w-4 h-4 mr-2" aria-hidden />
                Download error report
              </Button>
            </>
          )}
        </div>
      )}

      {status === 'error' && result?.error && (
        <div className="mt-6 p-4 rounded-xl bg-royalPurple-danger/10 border border-royalPurple-danger/30 text-sm text-royalPurple-dangerTx flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          {result.error}
        </div>
      )}
    </Card>
  )
}
