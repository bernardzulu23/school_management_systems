'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { Bus, Plus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TransportPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [driver, setDriver] = useState('')
  const [capacity, setCapacity] = useState('')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignRouteId, setAssignRouteId] = useState('')

  const { data: routes, isLoading } = useQuery({
    queryKey: ['transport-routes'],
    queryFn: () => api.getTransportRoutes().then((res) => res.data?.data || []),
  })

  const { data: students } = useQuery({
    queryKey: ['transport-students'],
    queryFn: () => api.getStudents({ limit: 500 }).then((res) => res.data?.data || res.data || []),
  })

  const createRoute = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await api.createTransportRoute({
        name: name.trim(),
        driver: driver.trim() || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      })
      setName('')
      setDriver('')
      setCapacity('')
      toast.success('Route created')
      queryClient.invalidateQueries({ queryKey: ['transport-routes'] })
    } catch (err) {
      toast.error(err?.message || 'Failed to create route')
    }
  }

  const assignStudent = async (e) => {
    e.preventDefault()
    if (!assignStudentId || !assignRouteId) return
    try {
      await api.assignStudentBusRoute({ studentId: assignStudentId, routeId: assignRouteId })
      toast.success('Student assigned to route')
      setAssignStudentId('')
      queryClient.invalidateQueries({ queryKey: ['transport-routes'] })
    } catch (err) {
      toast.error(err?.message || 'Failed to assign student')
    }
  }

  const studentList = Array.isArray(students) ? students : []

  return (
    <DashboardLayout title="School Transport">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <Bus className="h-7 w-7" />
            Bus routes
          </h1>
          <p className="text-royalPurple-text2">Assign students to routes for transport lists.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add route</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRoute} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                placeholder="Route name (e.g. Route A — Kabulonga)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                placeholder="Driver"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              />
              <input
                type="number"
                min={1}
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                placeholder="Capacity"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Create route
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign student to route</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={assignStudent} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(e.target.value)}
              >
                <option value="">Select student</option>
                {studentList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.class})
                  </option>
                ))}
              </select>
              <select
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                value={assignRouteId}
                onChange={(e) => setAssignRouteId(e.target.value)}
              >
                <option value="">Select route</option>
                {(routes || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Button type="submit">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign
              </Button>
            </form>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-royalPurple-text2">Loading routes…</p>
        ) : (
          (routes || []).map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{route.name}</span>
                  <span className="text-sm font-normal text-royalPurple-text2">
                    {route.studentCount || 0}
                    {route.capacity ? ` / ${route.capacity}` : ''} students
                    {route.driver ? ` · ${route.driver}` : ''}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="zsms-table w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-3">Student</th>
                        <th className="text-left py-2 px-3">Class</th>
                        <th className="text-left py-2 px-3">Exam #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(route.students || []).map((s) => (
                        <tr key={s.studentId}>
                          <td className="py-2 px-3">{s.name}</td>
                          <td className="py-2 px-3">{s.class}</td>
                          <td className="py-2 px-3">{s.examNumber || '—'}</td>
                        </tr>
                      ))}
                      {!route.students?.length ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-royalPurple-text3">
                            No students on this route yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
