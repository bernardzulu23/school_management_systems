import React from 'react'
import { GraduationCap, FileText, Building, BookOpen } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
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
  const allowedYearGroups = new Set([
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
    'Form 5',
    'Form 6',
    'Grade 10',
    'Grade 11',
    'Grade 12',
  ])

  const classGroups = classes
    .filter((c) => allowedYearGroups.has(String(c.year_group || '').trim()))
    .reduce((acc, c) => {
      const yg = String(c.year_group || '').trim()
      if (!acc[yg]) acc[yg] = []
      acc[yg].push(c)
      return acc
    }, {})

  const yearOrder = [
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
    'Form 5',
    'Form 6',
    'Grade 10',
    'Grade 11',
    'Grade 12',
  ]

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
            label="Class"
            name="classId"
            type="select"
            value={formData.classId || ''}
            onChange={onInputChange}
            required
            error={errors.classId}
            icon={GraduationCap}
            aria-describedby="classId-error"
          >
            <option value="">Select Class</option>
            {yearOrder
              .filter((yg) => Array.isArray(classGroups[yg]) && classGroups[yg].length > 0)
              .map((yg) => (
                <optgroup key={yg} label={yg}>
                  {classGroups[yg]
                    .slice()
                    .sort((a, b) => String(a.section || '').localeCompare(String(b.section || '')))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
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
