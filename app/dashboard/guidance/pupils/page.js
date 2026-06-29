'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function GuidancePupilsPage() {
  const [rows, setRows] = useState([])
  const [scope, setScope] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/guidance/pupils', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load pupils')
        setRows(json.data || [])
        setScope(json.scope || '')
      } catch (error) {
        toast.error(error.message || 'Could not load pupil register')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardLayout title="Pupil register">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Confidential pupil register</h1>
          <p className="text-royalPurple-text2 mt-1 text-sm">
            Pupils in your guidance scope{scope ? ` (${scope})` : ''}. Open cases are shown for
            quick reference — full records live in the case log.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pupils</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : rows.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No pupils in your scope.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-royalPurple-text2 border-b border-royalPurple-border">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Class</th>
                      <th className="py-2 pr-4">Exam no.</th>
                      <th className="py-2 pr-4">Open cases</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-b border-royalPurple-border/60">
                        <td className="py-2 pr-4 text-royalPurple-text1 font-medium">{p.name}</td>
                        <td className="py-2 pr-4">{p.class}</td>
                        <td className="py-2 pr-4">{p.exam_number || '—'}</td>
                        <td className="py-2 pr-4">{p.open_cases}</td>
                        <td className="py-2">
                          <Link
                            href={`/dashboard/guidance/cases?pupilId=${p.id}`}
                            className="text-royalPurple-accentTx hover:underline"
                          >
                            Open case
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
