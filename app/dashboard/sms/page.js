'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

export default function SmsLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSmsLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sms/logs?limit=300', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to load SMS logs')
      setLogs(Array.isArray(json?.data) ? json.data : [])
    } catch (error) {
      console.error('Error fetching SMS logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSmsLogs()
  }, [])

  return (
    <DashboardLayout title="SMS Interaction Logs">
      <div className="bg-royalPurple-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1">SMS Interaction Logs</h1>
              <p className="text-royalPurple-text2">View incoming and outgoing SMS messages</p>
            </div>
            <Button onClick={fetchSmsLogs} className="btn-secondary btn-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Logs
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <div className="p-6">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <table className="min-w-full divide-y divide-royalPurple-border">
                <thead className="bg-royalPurple-page">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Direction
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      From
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      To
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Message
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-royalPurple-card divide-y divide-royalPurple-border">
                  {logs.map((log, idx) => (
                    <tr key={String(log.id || `${log.createdAt || ''}-${idx}`)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.direction === 'in'
                              ? 'bg-royalPurple-accent text-royalPurple-accentTx'
                              : log.direction === 'dlr'
                                ? 'bg-amber-500/20 text-amber-700'
                                : 'bg-royalPurple-success text-royalPurple-successTx'
                          }`}
                        >
                          {log.direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.from || log.phoneNumber || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {Array.isArray(log.to) ? log.to.join(', ') : (log.to ?? '—')}
                      </td>
                      <td className="px-6 py-4 whitespace-pre-wrap">
                        {log.text || log.message || log.status || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {!logs.length && !loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-royalPurple-text3"
                      >
                        No SMS logs found for this school yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
