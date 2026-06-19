'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { normalizeRoomGender } from '@/lib/hostel/genderMatch'
import { normalizeStudentGender } from '@/lib/government/genderReport'
import { Home, Plus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

function studentMatchesRoom(student, roomGender) {
  const room = normalizeRoomGender(roomGender)
  if (room === 'mixed') return true
  const g = normalizeStudentGender(student?.gender ?? student?.user?.gender)
  if (g === 'Male') return room === 'male'
  if (g === 'Female') return room === 'female'
  return false
}

export default function HostelPage() {
  const queryClient = useQueryClient()
  const year = new Date().getFullYear()
  const [roomName, setRoomName] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [gender, setGender] = useState('male')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignRoomId, setAssignRoomId] = useState('')

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['hostel-rooms', year],
    queryFn: () => api.getHostelRooms({ year }).then((res) => res.data?.data || []),
  })

  const { data: students } = useQuery({
    queryKey: ['hostel-students'],
    queryFn: () => api.getStudents({ limit: 500 }).then((res) => res.data?.data || res.data || []),
  })

  const studentList = Array.isArray(students) ? students : []
  const selectedRoom = (rooms || []).find((r) => r.id === assignRoomId)
  const selectedRoomGender = normalizeRoomGender(selectedRoom?.gender)

  const assignableStudents = useMemo(() => {
    if (!assignRoomId || selectedRoomGender === 'mixed') return studentList
    return studentList.filter((s) => studentMatchesRoom(s, selectedRoom?.gender))
  }, [studentList, assignRoomId, selectedRoom?.gender, selectedRoomGender])

  const createRoom = async (e) => {
    e.preventDefault()
    if (!roomName.trim()) return
    try {
      await api.createHostelRoom({
        name: roomName.trim(),
        capacity: Number(capacity) || 4,
        gender,
      })
      setRoomName('')
      toast.success('Room created')
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms', year] })
    } catch (err) {
      toast.error(err?.message || 'Failed to create room')
    }
  }

  const assignStudent = async (e) => {
    e.preventDefault()
    if (!assignStudentId || !assignRoomId) return
    try {
      await api.assignStudentHostel({
        studentId: assignStudentId,
        roomId: assignRoomId,
        year,
      })
      toast.success('Student assigned to room')
      setAssignStudentId('')
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms', year] })
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to assign student')
    }
  }

  const assignHint =
    assignRoomId && selectedRoomGender !== 'mixed'
      ? `Showing ${selectedRoomGender} students only for this dormitory.`
      : null

  return (
    <DashboardLayout title="Hostel & Boarding">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <Home className="h-7 w-7" />
            Hostel rooms
          </h1>
          <p className="text-royalPurple-text2">
            Boarding lists for {year} — assign students to dormitory rooms.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add room</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRoom} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                placeholder="Room name (e.g. Dormitory A — Room 3)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <input
                type="number"
                min={1}
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                placeholder="Capacity"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
              <select
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="mixed">Mixed</option>
              </select>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Create room
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign boarder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={assignStudent} className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                  value={assignRoomId}
                  onChange={(e) => {
                    setAssignRoomId(e.target.value)
                    setAssignStudentId('')
                  }}
                >
                  <option value="">Select room</option>
                  {(rooms || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.boardedCount}/{r.capacity}) · {r.gender}
                    </option>
                  ))}
                </select>
                <select
                  className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  disabled={!assignRoomId}
                >
                  <option value="">Select student</option>
                  {assignableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class})
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={!assignStudentId || !assignRoomId}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>
              {assignHint ? <p className="text-xs text-royalPurple-text2">{assignHint}</p> : null}
            </form>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-royalPurple-text2">Loading rooms…</p>
        ) : (
          (rooms || []).map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{room.name}</span>
                  <span className="text-sm font-normal text-royalPurple-text2 capitalize">
                    {room.gender} · {room.boardedCount}/{room.capacity} boarded
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
                    {(room.students || []).map((s) => (
                      <tr
                        key={s.studentId}
                        className={s.genderMismatch ? 'bg-red-50/80' : undefined}
                      >
                        <td className="py-2 px-3">
                          {s.name}
                          {s.genderMismatch ? (
                            <span className="ml-2 text-xs text-red-600">Gender mismatch</span>
                          ) : null}
                        </td>
                        <td className="py-2 px-3">{s.class}</td>
                        <td className="py-2 px-3">{s.examNumber || '—'}</td>
                      </tr>
                    ))}
                    {!room.students?.length ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-royalPurple-text3">
                          No boarders in this room yet.
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
    </DashboardLayout>
  )
}
