import React from 'react'
import { GraduationCap, FileText, Building, BookOpen } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import { GRADE_LEVELS, SECTIONS } from '@/lib/constants'
import { useSubjects } from '@/lib/hooks/useSubjects'
import SubjectSelection from '@/components/registration/SubjectSelection'

export default function AcademicInfoStep({
  formData,
  errors,
  onInputChange,
  onSubjectsChange,
  classes = [],
}) {
  const { subjects } = useSubjects()
  const classNamePreview =
    formData.year_group && formData.section
      ? `${String(formData.year_group).trim()}${String(formData.section).trim()}`
      : ''

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

  const setField = (name, value) => {
    onInputChange?.({ target: { name, value } })
  }

  const handleYearGroupChange = (e) => {
    const nextYearGroup = e.target.value
    setField('year_group', nextYearGroup)
    const nextId = findClassId(nextYearGroup, formData.section)
    setField('classId', nextId)
  }

  const handleSectionChange = (e) => {
    const nextSection = e.target.value
    setField('section', nextSection)
    const nextId = findClassId(formData.year_group, nextSection)
    setField('classId', nextId)
  }

  return (
    <FormSection title="Academic Information" icon={GraduationCap}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormGroup
            label="Exam Number"
            name="exam_number"
            value={formData.exam_number}
            onChange={onInputChange}
            placeholder="Enter exam number"
            icon={FileText}
            required
            error={errors.exam_number}
            aria-describedby="exam_number-error"
          />

          <FormGroup
            label="Year Group"
            name="year_group"
            type="select"
            value={formData.year_group || ''}
            onChange={handleYearGroupChange}
            required
            error={errors.year_group}
            icon={GraduationCap}
            aria-describedby="year_group-error"
          >
            <option value="">Select Year Group</option>
            {GRADE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </FormGroup>

          <FormGroup
            label="Section"
            name="section"
            type="select"
            value={formData.section || ''}
            onChange={handleSectionChange}
            required
            error={errors.section}
            icon={GraduationCap}
            aria-describedby="section-error"
          >
            <option value="">Select Section</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </FormGroup>

          <FormGroup
            label="Previous School"
            name="previous_school"
            value={formData.previous_school}
            onChange={onInputChange}
            placeholder="Enter previous school name"
            icon={Building}
            error={errors.previous_school}
            aria-describedby="previous_school-error"
          />
        </div>

        {/* Subject Selection */}
        <div className="bg-green-50 p-6 rounded-xl border border-green-200">
          <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Subject Selection
          </h4>

          <div className="mb-4 p-4 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-green-700 mb-2">
              <strong>Instructions:</strong> Select the subjects you will be studying this academic
              year.
            </p>
          </div>

          <div>
            <SubjectSelection
              selectedSubjects={formData.selected_subjects || []}
              onSubjectsChange={onSubjectsChange}
              userRole="student"
              maxSelections={8}
              valueType="name"
            />
            {errors.selected_subjects && (
              <p className="text-red-500 text-sm mt-1">{errors.selected_subjects}</p>
            )}
          </div>

          {/* Subject Summary */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
            <h5 className="font-medium text-green-800 mb-2">Subject Summary:</h5>
            <div className="text-sm">
              <div className="mb-2">
                <span className="text-green-700 font-medium">Class: </span>
                <span className="text-gray-700">{classNamePreview || 'Not selected'}</span>
              </div>
              <span className="text-green-700 font-medium">Selected Subjects: </span>
              <span className="text-gray-700">
                {formData.selected_subjects?.length || 0} subjects
                {formData.selected_subjects?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.selected_subjects.map((subjectName) => {
                      const subject = subjects.find((s) => s.name === subjectName)
                      return (
                        <span
                          key={subjectName}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {subject
                            ? `${subject.name}${subject.category ? ` (${subject.category})` : ''}`
                            : subjectName}
                        </span>
                      )
                    })}
                  </div>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </FormSection>
  )
}
