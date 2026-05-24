'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Eye, FileText, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatLessonPlanForDisplay } from '@/lib/lesson-plans/text'

function statusBadgeClass(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'APPROVED') return 'bg-green-100 text-green-800 border-green-200'
  if (s === 'REJECTED') return 'bg-red-100 text-red-800 border-red-200'
  if (s === 'SUBMITTED') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (s === 'REVISION_REQUESTED') return 'bg-orange-100 text-orange-800 border-orange-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function LessonPlanDownloadButton({
  planId,
  subject,
  form,
  topic,
  variant = 'outline',
  size = 'sm',
  label = 'Download Word',
}: {
  planId: string
  subject: string
  form: string
  topic: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  label?: string
}) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/lesson-plans/${planId}/export?format=word`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${subject}_${form}_${topic.replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Downloaded successfully')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={downloading} variant={variant} size={size}>
      <Download className="h-4 w-4 mr-2" />
      {downloading ? 'Downloading…' : label}
    </Button>
  )
}

export default function LessonPlanViewer({
  planId,
  subject,
  form,
  topic,
  status,
  lessonContent,
  approvalStatus,
  approvalNotes,
  metaLines = [],
  editable = false,
  contentValue,
  onContentChange,
  actions = null,
}) {
  const [displayMode, setDisplayMode] = useState('formatted')
  const [downloading, setDownloading] = useState(false)
  const [content, setContent] = useState(lessonContent || '')

  useEffect(() => {
    setContent(formatLessonPlanForDisplay(lessonContent || ''))
  }, [lessonContent])

  const displayContent = editable ? (contentValue ?? content) : content

  const sections = useMemo(() => {
    const text = formatLessonPlanForDisplay(displayContent)
    return text.split('\n\n').filter(Boolean)
  }, [displayContent])

  const downloadAsWord = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/lesson-plans/${planId}/export?format=word`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${subject}_${form}_${topic.replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Downloaded as Word document')
    } catch {
      toast.error('Failed to download')
    } finally {
      setDownloading(false)
    }
  }

  const downloadAsText = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/lesson-plans/${planId}/export?format=clean-text`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Download failed')

      const data = await response.json()
      const element = document.createElement('a')
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(data.content || '')
      )
      element.setAttribute('download', data.filename || 'lesson-plan.txt')
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      toast.success('Downloaded as text')
    } catch {
      toast.error('Failed to download')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=700')
    if (!printWindow) return

    const clean = formatLessonPlanForDisplay(displayContent)
    const metaHtml = metaLines.map((line) => `<p>${line}</p>`).join('')
    const safeContent = clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')

    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${subject} - ${topic}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; margin: 24px; line-height: 1.6; color: #111; }
      h1 { color: #1F4788; border-bottom: 2px solid #1F4788; padding-bottom: 8px; }
      .meta { margin-bottom: 20px; font-size: 14px; color: #444; }
      .content { white-space: pre-wrap; font-size: 14px; }
      @media print { body { margin: 12mm; } }
    </style>
  </head>
  <body>
    <h1>${subject} — ${topic}</h1>
    <div class="meta">${metaHtml}</div>
    <div class="content">${safeContent}</div>
  </body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="space-y-4">
      <Card variant="glass">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-royalPurple-text1">{subject}</h2>
              <p className="text-sm text-royalPurple-text2 mt-1">
                <strong>Topic:</strong> {topic}
              </p>
              <p className="text-sm text-royalPurple-text2">
                <strong>Form:</strong> {form}
              </p>
              <span
                className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass(approvalStatus || status)}`}
              >
                {String(approvalStatus || status || 'DRAFT').replace(/_/g, ' ')}
              </span>
              {approvalNotes ? (
                <p className="mt-3 text-sm text-royalPurple-text2">
                  <strong>HOD notes:</strong> {approvalNotes}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Button onClick={downloadAsWord} disabled={downloading} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Word
              </Button>
              <Button onClick={downloadAsText} disabled={downloading} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 print:hidden">
        <Button
          variant={displayMode === 'formatted' ? 'primary' : 'outline'}
          onClick={() => setDisplayMode('formatted')}
          size="sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          Formatted
        </Button>
        <Button
          variant={displayMode === 'plain' ? 'primary' : 'outline'}
          onClick={() => setDisplayMode('plain')}
          size="sm"
        >
          <FileText className="h-4 w-4 mr-2" />
          Plain text
        </Button>
      </div>

      <Card variant="glass">
        <CardContent className="p-4 sm:p-6">
          {editable ? (
            <textarea
              value={contentValue ?? content}
              onChange={(e) => {
                setContent(e.target.value)
                onContentChange?.(e.target.value)
              }}
              className="w-full min-h-[320px] p-3 rounded-lg bg-transparent border border-royalPurple-border text-royalPurple-text1 text-sm font-mono leading-relaxed"
            />
          ) : displayMode === 'formatted' ? (
            <div className="space-y-6">
              {sections.map((section, i) => {
                const lines = section.split('\n')
                const firstLine = lines[0] || ''
                const isHeader =
                  firstLine.match(/^[0-9]+\.\s+[A-Z]/) || firstLine.match(/^[A-Z][A-Z0-9\s]+:$/)

                if (isHeader) {
                  return (
                    <div key={i}>
                      <h3 className="text-lg font-bold text-royalPurple-text1 border-b border-royalPurple-border/40 pb-2 mb-3">
                        {firstLine}
                      </h3>
                      {lines.slice(1).map((line, j) =>
                        line.trim() ? (
                          <p key={j} className="text-sm text-royalPurple-text2 mb-2">
                            {line}
                          </p>
                        ) : null
                      )}
                    </div>
                  )
                }

                return (
                  <p key={i} className="text-sm text-royalPurple-text2 whitespace-pre-wrap">
                    {section}
                  </p>
                )
              })}
            </div>
          ) : (
            <pre className="bg-royalPurple-card2/50 p-4 rounded-lg overflow-auto text-sm text-royalPurple-text1 font-mono whitespace-pre-wrap">
              {formatLessonPlanForDisplay(displayContent)}
            </pre>
          )}
        </CardContent>
      </Card>

      {actions ? <div className="print:hidden">{actions}</div> : null}
    </div>
  )
}
