'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from 'lucide-react'

export default function SmsLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSmsLogs = async () => {
    setLoading(true)
    try {
      // This is a placeholder for a real API endpoint to fetch SMS logs
      // const response = await api.get('/sms/logs');
      // setLogs(response.data);
      setLogs([
        { id: 1, from: '+1234567890', to: '+0987654321', text: 'GRADES 12345', direction: 'in', created_at: '2024-01-01 10:00:00' },
        { id: 2, from: '+0987654321', to: '+1234567890', text: 'Latest grades for John Doe: Math: 85/100, Science: 92/100', direction: 'out', created_at: '2024-01-01 10:00:05' },
      ])
    } catch (error) {
      console.error('Error fetching SMS logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSmsLogs()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📱 SMS Interaction Logs
              </h1>
              <p className="text-gray-600">
                View incoming and outgoing SMS messages
              </p>
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.direction === 'in' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {log.direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{log.from}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{log.to}</td>
                      <td className="px-6 py-4 whitespace-pre-wrap">{log.text}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{log.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}