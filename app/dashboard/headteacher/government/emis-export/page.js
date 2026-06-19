'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const CHECKLIST = [
  'School profile and EMIS identifiers',
  'Enrolment by year group and gender',
  'Teaching staff with TSC numbers and qualifications',
]

export default function EmisExportPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [downloading, setDownloading] = useState(false)

  const download = async () => {
    setDownloading(true)
    try {
      const res = await sessionFetch(`/api/government/emis-export?year=${year}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Export failed')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] || `emis-export-${year}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('EMIS workbook downloaded')
    } catch (e) {
      toast.error(e?.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <DashboardLayout title="EMIS Export">
      <FeatureGate featureId="emis-export">
        <div className="space-y-4">
          <Link href="/dashboard/headteacher">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Harmonised Data Collection Tool (HDCT)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-royalPurple-text2">
                Export a three-sheet Excel workbook for MoE EMIS submission: school profile,
                enrolment by year group and gender, and teaching staff register.
              </p>

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="block text-royalPurple-text2 mb-1">Academic year</span>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card w-32"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </label>
                <Button onClick={download} disabled={downloading}>
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? 'Preparing…' : 'Download XLSX'}
                </Button>
              </div>

              <ul className="text-sm text-royalPurple-text2 list-disc pl-5 space-y-1">
                {CHECKLIST.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </FeatureGate>
    </DashboardLayout>
  )
}
