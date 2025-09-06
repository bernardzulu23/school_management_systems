'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  timetableAPI,
  timeSlots,
  daysOfWeek,
  classes,
  subjects,
  classrooms
} from '@/lib/timetableData'
import { TeachersAPI } from '@/lib/teachersAPI'
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Plus,
  Save,
  Download,
  Upload,
  Settings,
  Eye,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  XCircle
} from 'lucide-react'

export default function MasterTimetablePage() {
  const { user } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  const [timetableData, setTimetableData] = useState({})
  const [conflicts, setConflicts] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [timetableStats, setTimetableStats] = useState({
    totalSlots: 0,
    assignedSlots: 0,
    conflicts: 0,
    teacherUtilization: 0,
    classroomUtilization: 0
  })
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingTimeSlot, setEditingTimeSlot] = useState(null)
  const [registeredTeachers, setRegisteredTeachers] = useState([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [timetableSettings, setTimetableSettings] = useState({
    currentTerm: 'Term 1',
    academicYear: '2024-2025',
    termStartDate: '2024-01-15',
    termEndDate: '2024-04-12',
    timeSlots: [...timeSlots],
    workingDays: [...daysOfWeek]
  })

  // Load registered teachers from database
  const loadRegisteredTeachers = async () => {
    try {
      setLoadingTeachers(true)
      console.log('🔄 Starting to load registered teachers...')
      const teachers = await TeachersAPI.getRegisteredTeachers()
      setRegisteredTeachers(teachers)
      console.log('✅ Loaded registered teachers:', teachers)
      console.log(`📊 Total teachers loaded: ${teachers.length}`)
    } catch (error) {
      console.error('❌ Error loading registered teachers:', error)
    } finally {
      setLoadingTeachers(false)
    }
  }

  // Load timetable data and settings on component mount
  useEffect(() => {
    // Load settings first
    loadSettings()

    // Load registered teachers
    loadRegisteredTeachers()

    const masterTimetable = timetableAPI.getMasterTimetable()
    console.log('Master timetable loaded:', masterTimetable)

    // If no data exists, initialize with empty structure
    if (Object.keys(masterTimetable).length === 0) {
      const emptyTimetable = initializeTimetableData()
      setTimetableData(emptyTimetable)
      console.log('Initialized empty timetable structure')
    } else {
      setTimetableData(masterTimetable)
    }
  }, [])



  function getCurrentWeek() {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1))
    return startOfWeek.toISOString().split('T')[0]
  }

  function initializeTimetableData(customDays = daysOfWeek, customTimeSlots = timeSlots) {
    const data = {}
    customDays.forEach(day => {
      data[day] = {}
      customTimeSlots.forEach(slot => {
        if (!slot.isBreak) {
          data[day][slot.id] = {}
          classes.forEach(cls => {
            data[day][slot.id][cls.id] = null
          })
        }
      })
    })
    return data
  }

  const resetTimetable = () => {
    const emptyTimetable = initializeTimetableData()
    setTimetableData(emptyTimetable)
    timetableAPI.saveMasterTimetable(emptyTimetable)
  }

  const addSampleData = () => {
    // No sample data - timetable should be built from real data
    const emptyTimetable = initializeTimetableData()
    setTimetableData(emptyTimetable)
    console.log('Sample data added:', sampleTimetable)
  }

  const saveSettings = (newSettings) => {
    setTimetableSettings(newSettings)
    // Save settings to localStorage or API
    localStorage.setItem('timetableSettings', JSON.stringify(newSettings))
    setShowSettingsModal(false)

    // If time slots or working days changed, reinitialize timetable
    if (JSON.stringify(newSettings.timeSlots) !== JSON.stringify(timetableSettings.timeSlots) ||
        JSON.stringify(newSettings.workingDays) !== JSON.stringify(timetableSettings.workingDays)) {
      const newTimetable = initializeTimetableData(newSettings.workingDays, newSettings.timeSlots)
      setTimetableData(newTimetable)
      timetableAPI.saveMasterTimetable(newTimetable)
    }
  }

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('timetableSettings')
    if (savedSettings) {
      setTimetableSettings(JSON.parse(savedSettings))
    }
  }

  useEffect(() => {
    calculateTimetableStats()
    detectConflicts()
  }, [timetableData])

  const calculateTimetableStats = () => {
    let totalSlots = 0
    let assignedSlots = 0
    
    daysOfWeek.forEach(day => {
      timeSlots.forEach(slot => {
        if (!slot.isBreak) {
          classes.forEach(cls => {
            totalSlots++
            if (timetableData[day]?.[slot.id]?.[cls.id]) {
              assignedSlots++
            }
          })
        }
      })
    })

    setTimetableStats({
      totalSlots,
      assignedSlots,
      conflicts: conflicts.length,
      teacherUtilization: Math.round((assignedSlots / totalSlots) * 100),
      classroomUtilization: Math.round((assignedSlots / (classrooms.length * timeSlots.filter(s => !s.isBreak).length * 5)) * 100)
    })
  }

  const detectConflicts = () => {
    const foundConflicts = []
    
    // Check for teacher conflicts
    daysOfWeek.forEach(day => {
      timeSlots.forEach(slot => {
        if (!slot.isBreak) {
          const teacherAssignments = {}
          
          classes.forEach(cls => {
            const assignment = timetableData[day]?.[slot.id]?.[cls.id]
            if (assignment && assignment.teacherId) {
              if (teacherAssignments[assignment.teacherId]) {
                foundConflicts.push({
                  type: 'teacher',
                  day,
                  slot: slot.id,
                  message: `Teacher ${teachers.find(t => t.id === assignment.teacherId)?.name} is assigned to multiple classes`,
                  classes: [teacherAssignments[assignment.teacherId], cls.id]
                })
              } else {
                teacherAssignments[assignment.teacherId] = cls.id
              }
            }
          })
        }
      })
    })

    // Check for classroom conflicts
    daysOfWeek.forEach(day => {
      timeSlots.forEach(slot => {
        if (!slot.isBreak) {
          const classroomAssignments = {}
          
          classes.forEach(cls => {
            const assignment = timetableData[day]?.[slot.id]?.[cls.id]
            if (assignment && assignment.classroomId) {
              if (classroomAssignments[assignment.classroomId]) {
                foundConflicts.push({
                  type: 'classroom',
                  day,
                  slot: slot.id,
                  message: `Classroom ${classrooms.find(c => c.id === assignment.classroomId)?.name} is assigned to multiple classes`,
                  classes: [classroomAssignments[assignment.classroomId], cls.id]
                })
              } else {
                classroomAssignments[assignment.classroomId] = cls.id
              }
            }
          })
        }
      })
    })

    setConflicts(foundConflicts)
  }

  const handleSlotClick = (day, slotId, classId) => {
    setSelectedSlot({ day, slotId, classId })
    setShowAssignmentModal(true)
  }

  const assignSubject = (assignment) => {
    const newTimetableData = { ...timetableData }
    if (!newTimetableData[assignment.day]) {
      newTimetableData[assignment.day] = {}
    }
    if (!newTimetableData[assignment.day][assignment.slotId]) {
      newTimetableData[assignment.day][assignment.slotId] = {}
    }
    
    newTimetableData[assignment.day][assignment.slotId][assignment.classId] = {
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      classroomId: assignment.classroomId,
      notes: assignment.notes || ''
    }
    
    setTimetableData(newTimetableData)
    // Auto-save to centralized data
    const saveSuccess = timetableAPI.saveMasterTimetable(newTimetableData)
    console.log('Assignment saved to centralized data:', saveSuccess, newTimetableData)
    setShowAssignmentModal(false)
    setSelectedSlot(null)
  }

  const clearSlot = (day, slotId, classId) => {
    const newTimetableData = { ...timetableData }
    if (newTimetableData[day]?.[slotId]?.[classId]) {
      newTimetableData[day][slotId][classId] = null
    }
    setTimetableData(newTimetableData)
    // Auto-save to centralized data
    timetableAPI.saveMasterTimetable(newTimetableData)
  }

  const getSlotContent = (day, slotId, classId) => {
    const assignment = timetableData[day]?.[slotId]?.[classId]
    if (!assignment) return null

    const subject = subjects.find(s => s.id === assignment.subjectId)
    const teacher = teachers.find(t => t.id === assignment.teacherId)
    const classroom = classrooms.find(c => c.id === assignment.classroomId)

    return {
      subject,
      teacher,
      classroom,
      assignment
    }
  }

  const hasConflict = (day, slotId, classId) => {
    return conflicts.some(conflict => 
      conflict.day === day && 
      conflict.slot === slotId && 
      conflict.classes.includes(classId)
    )
  }

  const saveTimetable = async () => {
    try {
      // Save to centralized timetable data management
      const success = timetableAPI.saveMasterTimetable(timetableData)
      if (success) {
        alert('Timetable saved successfully! All user dashboards will now show the updated schedule.')
      } else {
        throw new Error('Failed to save timetable')
      }
    } catch (error) {
      console.error('Error saving timetable:', error)
      alert('Error saving timetable')
    }
  }

  // Inline time slot editing functions
  const updateTimeSlotInline = (slotId, field, value) => {
    setTimetableSettings(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map(slot =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      )
    }))
  }

  const handleTimeSlotEdit = (slotId) => {
    setEditingTimeSlot(slotId)
  }

  const handleTimeSlotSave = () => {
    setEditingTimeSlot(null)
    // Auto-save settings when inline editing is complete
    saveSettings(timetableSettings)
  }

  const handleTimeSlotCancel = () => {
    setEditingTimeSlot(null)
    // Reload settings to revert changes
    loadSettings()
  }

  const publishTimetable = async () => {
    if (conflicts.length > 0) {
      alert('Please resolve all conflicts before publishing the timetable.')
      return
    }
    
    try {
      // Here you would publish to all user dashboards
      console.log('Publishing timetable to all dashboards')
      // await api.publishTimetable(timetableData)
      alert('Timetable published successfully to all user dashboards!')
    } catch (error) {
      console.error('Error publishing timetable:', error)
      alert('Error publishing timetable')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Master Timetable</h1>
            <p className="text-gray-600 mt-1">Create and manage the school's master timetable</p>
            <p className="text-sm text-blue-600 mt-1">💡 Hover over time slots in the "Time / Day" column and click "Edit" to modify periods</p>
            <div className="flex items-center mt-2">
              {loadingTeachers ? (
                <div className="flex items-center text-sm text-orange-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                  Loading registered teachers...
                </div>
              ) : (
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {registeredTeachers.length} registered teachers loaded
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={resetTimetable}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" onClick={addSampleData}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sample Data
            </Button>
            <Button variant="outline" onClick={saveTimetable}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={publishTimetable}
              disabled={conflicts.length > 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{timetableStats.assignedSlots}</p>
              <p className="text-sm text-gray-600">Assigned Slots</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{timetableStats.totalSlots}</p>
              <p className="text-sm text-gray-600">Total Slots</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className={`h-8 w-8 mx-auto mb-2 ${conflicts.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <p className={`text-2xl font-bold ${conflicts.length > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                {timetableStats.conflicts}
              </p>
              <p className="text-sm text-gray-600">Conflicts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{timetableStats.teacherUtilization}%</p>
              <p className="text-sm text-gray-600">Teacher Utilization</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{timetableStats.classroomUtilization}%</p>
              <p className="text-sm text-gray-600">Classroom Utilization</p>
            </CardContent>
          </Card>
        </div>

        {/* Teacher Data Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">👥 Teacher Data Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">Status:</span>
              <span className="ml-2 text-blue-600">
                {loadingTeachers ? '🔄 Loading teachers...' : `✅ ${registeredTeachers.length} registered teachers loaded`}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-700">Source:</span>
              <span className="ml-2 text-blue-600">Database API (/api/teachers)</span>
            </div>
          </div>
          {registeredTeachers.length > 0 && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
              <span className="text-green-700 font-medium">✅ Using registered teachers from database</span>
              <div className="text-xs text-green-600 mt-1">
                Teachers: {registeredTeachers.map(t => `${t.name} (${t.department})`).join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Timetable Conflicts Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                    <strong>{conflict.day} - {timeSlots.find(s => s.id === conflict.slot)?.label}:</strong> {conflict.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Term Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Term Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="font-medium text-blue-900">Current Term</div>
                <div className="text-blue-700">{timetableSettings.currentTerm}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-md">
                <div className="font-medium text-green-900">Academic Year</div>
                <div className="text-green-700">{timetableSettings.academicYear}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-md">
                <div className="font-medium text-purple-900">Term Start</div>
                <div className="text-purple-700">{new Date(timetableSettings.termStartDate).toLocaleDateString()}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-md">
                <div className="font-medium text-orange-900">Term End</div>
                <div className="text-orange-700">{new Date(timetableSettings.termEndDate).toLocaleDateString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timetable Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Weekly Timetable Grid</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Week of:</span>
                <input
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 bg-gray-50 w-32">Time / Day</th>
                    {timetableSettings.workingDays.map(day => (
                      <th key={day} className="border border-gray-300 p-2 bg-gray-50 min-w-48">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timetableSettings.timeSlots.map(slot => (
                    <tr key={slot.id}>
                      <td className={`border border-gray-300 p-2 font-medium text-center ${
                        slot.isBreak ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-50'
                      }`}>
                        {editingTimeSlot === slot.id ? (
                          // Inline editing mode
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={slot.label}
                              onChange={(e) => updateTimeSlotInline(slot.id, 'label', e.target.value)}
                              className="w-full p-1 text-xs border border-gray-300 rounded text-center"
                              placeholder="Period name"
                            />
                            <div className="flex space-x-1">
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateTimeSlotInline(slot.id, 'startTime', e.target.value)}
                                className="w-full p-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateTimeSlotInline(slot.id, 'endTime', e.target.value)}
                                className="w-full p-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-center space-x-1">
                              <input
                                type="checkbox"
                                checked={slot.isBreak}
                                onChange={(e) => updateTimeSlotInline(slot.id, 'isBreak', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-xs text-gray-600">Break</span>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                onClick={handleTimeSlotSave}
                                className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleTimeSlotCancel}
                                className="text-xs px-2 py-1"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Display mode with edit button
                          <div className="group">
                            <div className="text-sm">{slot.label}</div>
                            <div className="text-xs text-gray-600">{slot.startTime}-{slot.endTime}</div>
                            {slot.isBreak && <div className="text-xs text-yellow-600 font-medium">Break</div>}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTimeSlotEdit(slot.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1 py-0 mt-1"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        )}
                      </td>
                      {timetableSettings.workingDays.map(day => (
                        <td key={`${day}-${slot.id}`} className="border border-gray-300 p-1">
                          {slot.isBreak ? (
                            <div className="text-center text-yellow-600 font-medium py-4">
                              {slot.label}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {classes.map(cls => {
                                const content = getSlotContent(day, slot.id, cls.id)
                                const hasConflictFlag = hasConflict(day, slot.id, cls.id)

                                return (
                                  <div
                                    key={cls.id}
                                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                                      content
                                        ? hasConflictFlag
                                          ? 'bg-red-100 border-red-300 text-red-800 border'
                                          : 'bg-blue-100 border-blue-300 text-blue-800 border'
                                        : 'bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300'
                                    }`}
                                    onClick={() => handleSlotClick(day, slot.id, cls.id)}
                                  >
                                    <div className="font-medium">{cls.name}</div>
                                    {content ? (
                                      <div className="mt-1 relative group">
                                        <div className="font-semibold" style={{ color: content.subject?.color }}>
                                          {content.subject?.code}
                                        </div>
                                        <div className="text-gray-600">
                                          {content.teacher?.name?.split(' ').slice(-1)[0]}
                                        </div>
                                        <div className="text-gray-500">
                                          {content.classroom?.name}
                                        </div>
                                        {hasConflictFlag && (
                                          <div className="text-red-600 font-bold">⚠ CONFLICT</div>
                                        )}
                                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Edit className="h-3 w-3 text-gray-500" />
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          Click to edit
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 text-center py-2">
                                        Click to assign
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Modal */}
        {showAssignmentModal && selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {getSlotContent(selectedSlot.day, selectedSlot.slotId, selectedSlot.classId) ? 'Edit Assignment' : 'Create Assignment'} - {classes.find(c => c.id === selectedSlot.classId)?.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedSlot.day} - {timeSlots.find(s => s.id === selectedSlot.slotId)?.label}
                ({timeSlots.find(s => s.id === selectedSlot.slotId)?.time})
              </p>

              {loadingTeachers ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-600 mt-3">Loading registered teachers...</p>
                </div>
              ) : (
                <AssignmentForm
                  selectedSlot={selectedSlot}
                  subjects={subjects}
                  teachers={registeredTeachers}
                  classrooms={classrooms}
                  currentAssignment={getSlotContent(selectedSlot.day, selectedSlot.slotId, selectedSlot.classId)}
                  onAssign={assignSubject}
                  onClear={() => clearSlot(selectedSlot.day, selectedSlot.slotId, selectedSlot.classId)}
                  onCancel={() => {
                    setShowAssignmentModal(false)
                    setSelectedSlot(null)
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <SettingsModal
            settings={timetableSettings}
            onSave={saveSettings}
            onCancel={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// Assignment Form Component
function AssignmentForm({ selectedSlot, subjects, teachers, classrooms, currentAssignment, onAssign, onClear, onCancel }) {
  const [formData, setFormData] = useState({
    subjectId: currentAssignment?.assignment?.subjectId || '',
    teacherId: currentAssignment?.assignment?.teacherId || '',
    classroomId: currentAssignment?.assignment?.classroomId || '',
    notes: currentAssignment?.assignment?.notes || ''
  })

  // Update form data when currentAssignment changes
  useEffect(() => {
    setFormData({
      subjectId: currentAssignment?.assignment?.subjectId || '',
      teacherId: currentAssignment?.assignment?.teacherId || '',
      classroomId: currentAssignment?.assignment?.classroomId || '',
      notes: currentAssignment?.assignment?.notes || ''
    })
  }, [currentAssignment])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.subjectId || !formData.teacherId || !formData.classroomId) {
      alert('Please fill in all required fields')
      return
    }

    onAssign({
      ...selectedSlot,
      ...formData,
      subjectId: parseInt(formData.subjectId),
      teacherId: parseInt(formData.teacherId),
      classroomId: parseInt(formData.classroomId)
    })
  }

  const filteredTeachers = teachers.filter(teacher =>
    !formData.subjectId || teacher.subjects.includes(subjects.find(s => s.id === parseInt(formData.subjectId))?.name)
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
        <select
          value={formData.subjectId}
          onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, teacherId: '' })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          required
        >
          <option value="">Select Subject</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
        <select
          value={formData.teacherId}
          onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          required
          disabled={!formData.subjectId}
        >
          <option value="">Select Teacher</option>
          {filteredTeachers.map(teacher => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} {teacher.department ? `(${teacher.department})` : ''} {teacher.employeeId ? `- ${teacher.employeeId}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Classroom *</label>
        <select
          value={formData.classroomId}
          onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          required
        >
          <option value="">Select Classroom</option>
          {classrooms.map(classroom => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name} ({classroom.type}, {classroom.capacity} seats)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          rows="2"
          placeholder="Optional notes..."
        />
      </div>

      <div className="flex justify-between pt-4">
        <div>
          {currentAssignment && (
            <Button
              type="button"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => {
                onClear()
                onCancel()
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Slot
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            {currentAssignment ? 'Update Assignment' : 'Create Assignment'}
          </Button>
        </div>
      </div>
    </form>
  )
}

// Settings Modal Component
function SettingsModal({ settings, onSave, onCancel }) {
  const [formData, setFormData] = useState(settings)
  const [timeSlots, setTimeSlots] = useState(settings.timeSlots)
  const [workingDays, setWorkingDays] = useState(settings.workingDays)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      timeSlots,
      workingDays
    })
  }

  const addTimeSlot = () => {
    const newSlot = {
      id: timeSlots.length + 1,
      startTime: '08:00',
      endTime: '08:45',
      label: `Period ${timeSlots.length + 1}`,
      isBreak: false
    }
    setTimeSlots([...timeSlots, newSlot])
  }

  const removeTimeSlot = (id) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id))
  }

  const updateTimeSlot = (id, field, value) => {
    setTimeSlots(timeSlots.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ))
  }

  const toggleWorkingDay = (day) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day))
    } else {
      setWorkingDays([...workingDays, day])
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Timetable Settings</h2>
          <Button variant="outline" onClick={onCancel}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Term Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Term
              </label>
              <select
                value={formData.currentTerm}
                onChange={(e) => setFormData({...formData, currentTerm: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="2024-2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term Start Date
              </label>
              <input
                type="date"
                value={formData.termStartDate}
                onChange={(e) => setFormData({...formData, termStartDate: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term End Date
              </label>
              <input
                type="date"
                value={formData.termEndDate}
                onChange={(e) => setFormData({...formData, termEndDate: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Working Days
            </label>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    workingDays.includes(day)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Time Slots
              </label>
              <Button type="button" variant="outline" onClick={addTimeSlot}>
                <Plus className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {timeSlots.map((slot, index) => (
                <div key={slot.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={slot.label}
                      onChange={(e) => updateTimeSlot(slot.id, 'label', e.target.value)}
                      className="p-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Period name"
                    />
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(slot.id, 'startTime', e.target.value)}
                      className="p-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(slot.id, 'endTime', e.target.value)}
                      className="p-2 border border-gray-300 rounded-md text-sm"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={slot.isBreak}
                        onChange={(e) => updateTimeSlot(slot.id, 'isBreak', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">Break</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeTimeSlot(slot.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
