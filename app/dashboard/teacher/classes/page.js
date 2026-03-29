'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Users, Calendar, ArrowLeft, Eye, BookOpen, ClipboardList, Loader2 } from 'lucide-react'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'

export default function TeacherClassesPage() {
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [pupils, setPupils] = useState([])
  const [activeTab, setActiveTab] = useState('pupils')
  const [searchTerm, setSearchTerm] = useState('')

  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday.toISOString().slice(0, 10)
  })
  const [lessonPlan, setLessonPlan] = useState('')

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) || null

  const lessonKey = useMemo(() => {
    return selectedAssignment ? `lesson_plan_v1:${selectedAssignment.id}:${weekStart}` : null
  }, [selectedAssignmentId, weekStart])

  const seasonLabel = useMemo(() => {
    const m = new Date(weekStart).getMonth() + 1
    if ([11, 12, 1, 2, 3].includes(m)) return 'Rainy season (planting + fieldwork)'
    if ([4, 5, 6, 7].includes(m)) return 'Cool dry season (harvest + exams)'
    return 'Hot dry season (land prep + revision)'
  }, [weekStart])

  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/teaching-assignments')
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        setAssignments(data)
        if (data.length > 0) setSelectedAssignmentId((prev) => prev || data[0].id)
      } catch {
        toast.error('Failed to load teaching assignments')
      } finally {
        setLoading(false)
      }
    }
    loadAssignments()
  }, [])

  useEffect(() => {
    if (!lessonKey) return
    try {
      const raw = localStorage.getItem(lessonKey)
      setLessonPlan(raw || '')
    } catch {
      setLessonPlan('')
    }
  }, [lessonKey])

  const fetchPupils = async () => {
    if (!selectedAssignment) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/teacher/pupils?classId=${encodeURIComponent(selectedAssignment.classId)}&subjectId=${encodeURIComponent(selectedAssignment.subjectId)}`
      )
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setPupils(Array.isArray(json?.data) ? json.data : [])
    } catch {
      toast.error('Failed to load pupils')
      setPupils([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPupils()
  }, [selectedAssignmentId])

  const filteredPupils = pupils.filter((p) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(q) || (p.exam_number || '').toLowerCase().includes(q)
    )
  })

  return (
    <DashboardLayout title="My Classes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <Users className="h-6 w-6 mr-2" />
                Classroom Management
              </h1>
              <p className="text-royalPurple-text2">
                Switch class + subject instantly and see only enrolled pupils
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rapid Subject Switcher</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2 md:col-span-2">
                <Label>Class + Subject</Label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class + Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.className} · {a.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search Pupils</Label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedAssignment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {selectedAssignment.className} - {selectedAssignment.subjectName}
                </span>
                <span className="text-sm font-normal text-royalPurple-text3">
                  {filteredPupils.length} Pupils
                </span>
              </CardTitle>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant={activeTab === 'pupils' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('pupils')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Pupils
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === 'lesson' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('lesson')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Lesson Planning
                </Button>
                <Link href="/dashboard/teacher/results">
                  <Button size="sm" variant="outline">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Gradebook
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-royalPurple-accentTx" />
                </div>
              ) : activeTab === 'pupils' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-royalPurple-text2 uppercase bg-royalPurple-page">
                      <tr>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Exam No.</th>
                        <th className="px-4 py-3">Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPupils.map((p) => (
                        <tr key={p.id} className="border-b hover:bg-royalPurple-page">
                          <td className="px-4 py-3 font-medium">{p.id}</td>
                          <td className="px-4 py-3">{p.name}</td>
                          <td className="px-4 py-3">{p.exam_number || '-'}</td>
                          <td className="px-4 py-3">{p.contact_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Week Starting</Label>
                      <Input
                        type="date"
                        value={weekStart}
                        onChange={(e) => setWeekStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agricultural Calendar</Label>
                      <div className="text-sm text-royalPurple-text2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {seasonLabel}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Lesson Plan</Label>
                    <textarea
                      value={lessonPlan}
                      onChange={(e) => setLessonPlan(e.target.value)}
                      className="w-full min-h-[160px] border rounded-md p-3 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        if (!lessonKey) return
                        try {
                          localStorage.setItem(lessonKey, lessonPlan || '')
                          toast.success('Lesson plan saved')
                        } catch {
                          toast.error('Failed to save lesson plan')
                        }
                      }}
                    >
                      Save Plan
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
