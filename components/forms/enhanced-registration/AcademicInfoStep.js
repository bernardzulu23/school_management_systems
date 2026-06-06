import React from 'react'
import { GraduationCap, FileText, Building, BookOpen } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import { getGradeLevelsForSchoolLevel, getStudentSubjectLimits, SECTIONS } from '@/lib/constants'
import { useSubjects } from '@/lib/hooks/useSubjects'
import SubjectSelection from '@/components/registration/SubjectSelection'
import { PRIMARY_SUBJECT_CATEGORIES } from '@/data/subjects-primary'
import { SECONDARY_SUBJECT_CATEGORIES } from '@/data/subjects-secondary'

export default function AcademicInfoStep({
  formData,
  errors,
  onInputChange,
  onSubjectsChange,
  classes = [],
  schoolLevel = 'combined',
}) {
  const {
    subjects,
    loading: subjectsLoading,
    meta,
  } = useSubjects({
    gradeLevel: formData.year_group,
  })
  const gradeOptions = getGradeLevelsForSchoolLevel(schoolLevel)
  const limits = getStudentSubjectLimits({
    schoolLevel: meta?.schoolLevel || schoolLevel,
    yearGroup: formData.year_group,
  })
  const categories =
    meta?.educationLevel === 'primary' ? PRIMARY_SUBJECT_CATEGORIES : SECONDARY_SUBJECT_CATEGORIES

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
            {gradeOptions.map((level) => (
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

        <div className="bg-royalPurple-success p-6 rounded-xl border border-royalPurple-border">
          <h4 className="text-lg font-semibold text-royalPurple-successTx mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Subject Selection
          </h4>

          <div className="mb-4 p-4 bg-royalPurple-card rounded-lg border border-royalPurple-border">
            <p className="text-sm text-royalPurple-successTx mb-2">
              <strong>Instructions:</strong> Select the subjects you will be studying this academic
              year.
              {meta?.educationLevel === 'primary'
                ? ' Primary CBC subjects are shown for your grade.'
                : null}
            </p>
          </div>

          <div>
            {subjectsLoading ? (
              <p className="text-sm text-royalPurple-text3">Loading subjects…</p>
            ) : (
              <SubjectSelection
                selectedSubjects={formData.selected_subjects || []}
                onSubjectsChange={onSubjectsChange}
                userRole="student"
                minSelections={limits.min}
                maxSelections={limits.max}
                valueType="name"
                catalogSubjects={subjects}
                categories={categories}
              />
            )}
            {errors.selected_subjects && (
              <p className="text-royalPurple-dangerTx text-sm mt-1">{errors.selected_subjects}</p>
            )}
          </div>

          {(formData.selected_subjects || []).length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-royalPurple-border">
              <p className="text-sm font-medium text-royalPurple-text1 mb-2">Selected subjects:</p>
              <ul className="list-disc list-inside text-sm text-royalPurple-text2">
                {(formData.selected_subjects || []).map((subject) => (
                  <li key={subject}>{subject}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {classNamePreview ? (
          <p className="text-sm text-royalPurple-text3">
            Class preview: <strong>{classNamePreview}</strong>
          </p>
        ) : null}
      </div>
    </FormSection>
  )
}
