import React, { useEffect, useState } from 'react'
import { Briefcase, FileText, GraduationCap, BookOpen, Users } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import { DEPARTMENTS } from '@/lib/constants'
import SubjectSelection from '@/components/registration/SubjectSelection'
import { api } from '@/lib/api'

export default function ProfessionalInfoStep({
  formData,
  errors,
  onInputChange,
  onSubjectsChange,
  onClassesChange,
}) {
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true)
      try {
        const res = await api.get('/classes')
        if (res.data) {
          setClasses(res.data)
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error)
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [])

  const handleClassToggle = (classId) => {
    const current = formData.assigned_classes || []
    const updated = current.includes(classId)
      ? current.filter((id) => id !== classId)
      : [...current, classId]

    if (onClassesChange) {
      onClassesChange(updated)
    }
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
            required
            error={errors.department}
            icon={Briefcase}
            aria-describedby="department-error"
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
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

        {/* Class Assignment */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
          <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Class Assignment
          </h4>

          {loadingClasses ? (
            <p className="text-sm text-gray-500">Loading classes...</p>
          ) : classes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.assigned_classes?.includes(cls.id)
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.assigned_classes?.includes(cls.id) || false}
                    onChange={() => handleClassToggle(cls.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{cls.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No classes found. Please create classes first.
            </p>
          )}
        </div>

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
