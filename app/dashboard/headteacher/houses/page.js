'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, RefreshCw, Trophy, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function HousesPage() {
  const year = new Date().getFullYear()
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [houseName, setHouseName] = useState('')
  const [houseColor, setHouseColor] = useState('')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignHouseId, setAssignHouseId] = useState('')
  const [students, setStudents] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch(`/api/houses?year=${year}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load houses')
      setHouses(json.data || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load houses')
      setHouses([])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    load()
    api.getStudents({ limit: 500 }).then((res) => {
      setStudents(res.data?.data || res.data || [])
    })
  }, [load])

  const createHouse = async (e) => {
    e.preventDefault()
    if (!houseName.trim()) return
    try {
      const res = await sessionFetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: houseName.trim(), color: houseColor.trim() || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to create house')
      toast.success('House created')
      setHouseName('')
      setHouseColor('')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed to create house')
    }
  }

  const assignStudent = async (e) => {
    e.preventDefault()
    if (!assignStudentId || !assignHouseId) return
    try {
      const res = await sessionFetch('/api/houses/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: assignStudentId, houseId: assignHouseId, year }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to assign student')
      toast.success('Student assigned to house')
      setAssignStudentId('')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed to assign student')
    }
  }

  const studentList = Array.isArray(students) ? students : []

  return (
    <DashboardLayout title="Inter-house">
      <FeatureGate featureId="inter-house">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/headteacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <Trophy className="h-7 w-7" />
              Inter-house competitions
            </h1>
            <p className="text-royalPurple-text2">
              Social participation houses for {year} — not linked to dormitories. Assign any student
              to any house to balance teams for sports and events.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create house</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createHouse} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                  placeholder="House name (e.g. Red House, Eagles)"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                />
                <input
                  className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                  placeholder="Colour label (optional)"
                  value={houseColor}
                  onChange={(e) => setHouseColor(e.target.value)}
                />
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Create house
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assign student to house</CardTitle>
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
                  value={assignHouseId}
                  onChange={(e) => setAssignHouseId(e.target.value)}
                >
                  <option value="">Select house</option>
                  {houses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.memberCount} members)
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

          {loading ? (
            <LoadingSpinner />
          ) : (
            houses.map((house) => (
              <Card key={house.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap justify-between items-center gap-2">
                    <span className="flex items-center gap-2">
                      {house.color ? (
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-royalPurple-border"
                          style={{
                            backgroundColor: house.color.startsWith('#') ? house.color : undefined,
                          }}
                          title={house.color}
                        />
                      ) : null}
                      {house.name}
                    </span>
                    <span className="text-sm font-normal text-royalPurple-text2">
                      {house.memberCount} members · {house.genderStats?.male ?? 0} male ·{' '}
                      {house.genderStats?.female ?? 0} female
                      {(house.genderStats?.unknown ?? 0) > 0
                        ? ` · ${house.genderStats.unknown} unknown`
                        : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="zsms-table w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-3">Student</th>
                        <th className="text-left py-2 px-3">Class</th>
                        <th className="text-left py-2 px-3">Exam #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(house.members || []).map((m) => (
                        <tr key={m.studentId}>
                          <td className="py-2 px-3">{m.name}</td>
                          <td className="py-2 px-3">{m.class}</td>
                          <td className="py-2 px-3">{m.examNumber || '—'}</td>
                        </tr>
                      ))}
                      {!house.members?.length ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-royalPurple-text3">
                            No members yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </FeatureGate>
    </DashboardLayout>
  )
}
