import React, { useEffect, useState } from 'react'
import { Briefcase, FileText, GraduationCap, BookOpen, Plus, Trash2 } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import { api } from '@/lib/api'
import { DEPARTMENTS as FALLBACK_DEPARTMENTS, GRADE_LEVELS, SECTIONS } from '@/lib/constants'
import { SCHOOL_SUBJECTS } from '@/data/subjects'
import SubjectSelection from '@/components/registration/SubjectSelection'

export default function ProfessionalInfoStep({
  formData,
  errors,
  onInputChange,
  onSubjectsChange,
  onDepartmentsChange,
  onTeachingAssignmentsChange,
  role,
}) {
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const [classesRes, subjectsRes, departmentsRes] = await Promise.all([
          api.get('/classes'),
          api.get('/subjects'),
          api.get('/departments'),
        ])

        const classList = Array.isArray(classesRes.data?.data) ? classesRes.data.data : []
        const subjectList = Array.isArray(subjectsRes.data?.data) ? subjectsRes.data.data : []
        const deptList = Array.isArray(departmentsRes.data?.data) ? departmentsRes.data.data : []

        setClasses(classList)
        setSubjects(subjectList)
        setDepartments(deptList)
      } catch (error) {
        console.error('Failed to fetch classes:', error)
      }
    }
    fetchClasses()
  }, [])

  const departmentIds = Array.isArray(formData.department_ids) ? formData.department_ids : []
  const teachingAssignments = Array.isArray(formData.teaching_assignments)
    ? formData.teaching_assignments
    : []
  const subjectLabel = (name) => {
    const found = SCHOOL_SUBJECTS.find((s) => s.name === name)
    return found ? `${found.name} (${found.category})` : name
  }

  const addTeachingAssignmentRow = () => {
    const next = [
      ...teachingAssignments,
      { classId: '', subjectId: '', className: '', subjectName: '' },
    ]
    onTeachingAssignmentsChange?.(next)
  }

  const removeTeachingAssignmentRow = (index) => {
    const next = teachingAssignments.filter((_, i) => i !== index)
    onTeachingAssignmentsChange?.(next)
  }

  const updateTeachingAssignmentRow = (index, patch) => {
    const next = teachingAssignments.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onTeachingAssignmentsChange?.(next)
  }

  const resolveSubjectName = (value) => {
    if (!value) return { subjectId: '', subjectName: '' }
    const found = subjects.find((s) => s.id === value)
    if (found) return { subjectId: found.id, subjectName: found.name }
    return { subjectId: '', subjectName: value }
  }

  const updateClassFromParts = (index, nextYearGroup, nextSection) => {
    const year_group = String(nextYearGroup || '').trim()
    const section = String(nextSection || '').trim()
    const className = year_group && section ? `${year_group}${section}` : ''
    const match = className ? classes.find((c) => c.name === className) : null
    updateTeachingAssignmentRow(index, {
      year_group,
      section,
      classId: match?.id || '',
      className: match?.name || className,
    })
  }

  return (
    <FormSection title="Professional Information" icon={Briefcase}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormGroup
            label="TS Number"
            name="ts_number"
            value={formData.ts_number}
            onChange={onInputChange}
            placeholder="Enter TS number"
            required
            icon={FileText}
            error={errors.ts_number}
            aria-describedby="ts_number-error"
          />

          <FormGroup
            label="Department"
            name="department"
            type="select"
            value={formData.department}
            onChange={onInputChange}
            required={role !== 'teacher'}
            error={errors.department}
            icon={Briefcase}
            aria-describedby="department-error"
          >
            <option value="">Select Department</option>
            {(departments.length > 0 ? departments.map((d) => d.name) : FALLBACK_DEPARTMENTS).map(
              (dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              )
            )}
          </FormGroup>

          <FormGroup
            label="Years of Experience"
            name="experience_years"
            type="number"
            value={formData.experience_years}
            onChange={onInputChange}
            placeholder="Enter years of experience"
            icon={Briefcase}
            error={errors.experience_years}
            aria-describedby="experience_years-error"
          />

          <FormGroup
            label="Qualifications"
            name="qualifications"
            type="textarea"
            value={formData.qualifications}
            onChange={onInputChange}
            rows={3}
            placeholder="Enter your qualifications"
            required
            error={errors.qualifications}
            className="md:col-span-2"
            icon={GraduationCap}
            aria-describedby="qualifications-error"
          />
        </div>

        {role === 'teacher' && (
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
            <h4 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Departments (Multi-select)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(departments.length > 0
                ? departments
                : FALLBACK_DEPARTMENTS.map((name) => ({ id: name, name }))
              ).map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={departmentIds.includes(dept.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...departmentIds, dept.id]
                        : departmentIds.filter((id) => id !== dept.id)
                      onDepartmentsChange?.(next)
                    }}
                  />
                  <span>{dept.name}</span>
                </label>
              ))}
            </div>
            {errors.department_ids && (
              <p className="text-red-500 text-sm mt-2">{errors.department_ids}</p>
            )}
          </div>
        )}

        {role === 'teacher' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Teaching Assignments
              </h4>
              <button
                type="button"
                onClick={addTeachingAssignmentRow}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {teachingAssignments.length === 0 && (
              <p className="text-sm text-gray-600">Add at least one class + subject pair.</p>
            )}

            <div className="space-y-3">
              {teachingAssignments.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Grade</label>
                    <select
                      value={row.year_group || ''}
                      onChange={(e) => updateClassFromParts(idx, e.target.value, row.section)}
                      className="w-full border rounded-md p-2 text-sm"
                    >
                      <option value="">Select Year Group</option>
                      {GRADE_LEVELS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Section</label>
                    <select
                      value={row.section || ''}
                      onChange={(e) => updateClassFromParts(idx, row.year_group, e.target.value)}
                      className="w-full border rounded-md p-2 text-sm"
                    >
                      <option value="">Select Section</option>
                      {SECTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Subject</label>
                    <select
                      value={row.subjectId || row.subjectName || ''}
                      onChange={(e) =>
                        updateTeachingAssignmentRow(idx, resolveSubjectName(e.target.value))
                      }
                      className="w-full border rounded-md p-2 text-sm"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {subjectLabel(s.name)}
                        </option>
                      ))}
                      {SCHOOL_SUBJECTS.filter(
                        (s) => !subjects.some((db) => db.name === s.name)
                      ).map((s) => (
                        <option key={s.id} value={s.name}>
                          {subjectLabel(s.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeTeachingAssignmentRow(idx)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {errors.teaching_assignments && (
              <p className="text-red-500 text-sm mt-2">{errors.teaching_assignments}</p>
            )}
          </div>
        )}

        {/* Subject Assignment */}
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
          <h4 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Subject Assignment
          </h4>

          <div>
            <SubjectSelection
              selectedSubjects={formData.assigned_subjects || []}
              onSubjectsChange={onSubjectsChange}
              userRole="teacher"
              valueType="name"
            />
            {errors.assigned_subjects && (
              <p className="text-red-500 text-sm mt-1">{errors.assigned_subjects}</p>
            )}
          </div>
        </div>
      </div>
    </FormSection>
  )
}
