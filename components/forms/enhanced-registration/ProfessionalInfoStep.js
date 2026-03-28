import React from 'react'
import { Briefcase, FileText, GraduationCap, BookOpen, Plus, Trash2 } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import { DEPARTMENTS as FALLBACK_DEPARTMENTS, GRADE_LEVELS, SECTIONS } from '@/lib/constants'
import { SCHOOL_SUBJECTS } from '@/data/subjects'

export default function ProfessionalInfoStep({
  formData,
  errors,
  onInputChange,
  onDepartmentsChange,
  onTeachingAssignmentsChange,
  role,
  classes = [],
  subjects = [],
  departments = [],
}) {
  const departmentIds = Array.isArray(formData.department_ids) ? formData.department_ids : []
  const teachingAssignments = Array.isArray(formData.teaching_assignments)
    ? formData.teaching_assignments
    : []
  const subjectLabel = (name) => {
    const found = SCHOOL_SUBJECTS.find((s) => s.name === name)
    return found ? `${found.name} (${found.category})` : name
  }

  const allowedYearGroups = new Set([
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
    'Form 5',
    'Form 6',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
  ])

  const yearOrder = GRADE_LEVELS.filter((g) => allowedYearGroups.has(String(g).trim()))

  const departmentOptions =
    departments.length > 0 ? departments : FALLBACK_DEPARTMENTS.map((name) => ({ id: name, name }))

  const departmentNameById = (id) => {
    const found = departmentOptions.find((d) => d.id === id)
    return found ? found.name : String(id)
  }

  const computeClassName = (yearGroup, section) => {
    const yg = String(yearGroup || '').trim()
    const sec = String(section || '').trim()
    if (!yg || !sec) return ''
    return `${yg}${sec}`
  }

  const findClassId = (yearGroup, section) => {
    const yg = String(yearGroup || '').trim()
    const sec = String(section || '').trim()
    if (!yg || !sec) return ''
    const found = classes.find(
      (c) =>
        String(c.year_group || '')
          .trim()
          .toLowerCase() === yg.toLowerCase() &&
        String(c.section || '')
          .trim()
          .toLowerCase() === sec.toLowerCase()
    )
    return found?.id || ''
  }

  const addTeachingAssignmentRow = () => {
    const next = [
      ...teachingAssignments,
      { year_group: '', section: '', classId: '', subjectId: '' },
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

          {role === 'hod' && (
            <FormGroup
              label="Department"
              name="department"
              type="select"
              value={formData.department}
              onChange={onInputChange}
              required
              error={errors.department}
              icon={Briefcase}
              aria-describedby="department-error"
            >
              <option value="">Select Department</option>
              {departmentOptions.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </FormGroup>
          )}

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-900">
              {departmentOptions.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 text-sm text-gray-900">
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
                  <span className="text-gray-900">{dept.name}</span>
                </label>
              ))}
            </div>
            {departmentIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {departmentIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white border border-indigo-200 text-indigo-900"
                  >
                    {departmentNameById(id)}
                  </span>
                ))}
              </div>
            )}
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
                    <label className="block text-sm text-gray-700 mb-1">Year Group</label>
                    <select
                      value={row.year_group || ''}
                      onChange={(e) => {
                        const nextYearGroup = e.target.value
                        const nextSection = row.section || ''
                        const nextId = findClassId(nextYearGroup, nextSection)
                        updateTeachingAssignmentRow(idx, {
                          year_group: nextYearGroup,
                          classId: nextId,
                          className: computeClassName(nextYearGroup, nextSection),
                        })
                      }}
                      className="w-full border rounded-md p-2 text-sm"
                    >
                      <option value="">Select Year Group</option>
                      {yearOrder.map((g) => (
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
                      onChange={(e) => {
                        const nextSection = e.target.value
                        const nextYearGroup = row.year_group || ''
                        const nextId = findClassId(nextYearGroup, nextSection)
                        updateTeachingAssignmentRow(idx, {
                          section: nextSection,
                          classId: nextId,
                          className: computeClassName(nextYearGroup, nextSection),
                        })
                      }}
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
                      value={row.subjectId || ''}
                      onChange={(e) =>
                        updateTeachingAssignmentRow(idx, { subjectId: String(e.target.value) })
                      }
                      className="w-full border rounded-md p-2 text-sm"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
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

        <div className="text-sm text-gray-600">
          Subjects are assigned through Teaching Assignments (Grade + Section + Subject).
        </div>
      </div>
    </FormSection>
  )
}
