'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Calendar,
  Building,
  Save,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { DEPARTMENTS, USER_ROLES, SYSTEM_STATUS, GENDERS, RELATIONSHIPS } from '@/lib/constants'
import { handleInputChange, handleMultiSelectChange, formatFullName } from '@/lib/utils/formHelpers'
import { useSubjects } from '@/lib/hooks/useSubjects'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import FormField from '@/components/forms/FormField'
import LoadingSpinner from '@/components/LoadingSpinner'
import SkeletonLoader from '@/components/SkeletonLoader'

export default function TeacherRegistrationForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    address: '',

    // Professional Information
    employeeId: '',
    department: '',
    subjects: [],
    qualifications: '',
    experienceYears: '',
    tsNumber: '',

    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  })

  const { subjectsByCategory, loading: subjectsLoading } = useSubjects()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validateRequired = (value) => (value ? true : 'This field is required')
  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) return 'Email is required'
    if (!emailRegex.test(value)) return 'Please enter a valid email address'
    return true
  }
  const validatePhone = (value) => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/
    if (!value) return true // Optional field
    if (!phoneRegex.test(value)) return 'Invalid phone number'
    return true
  }

  const onInputChange = handleInputChange(setFormData)
  const onSubjectChange = handleMultiSelectChange(setFormData)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      // Validate all fields
      const newErrors = {}
      if (!formData.firstName) newErrors.firstName = 'First name is required'
      if (!formData.lastName) newErrors.lastName = 'Last name is required'
      if (!formData.email) newErrors.email = 'Email is required'
      if (!formData.department) newErrors.department = 'Department is required'
      if (!formData.employeeId) newErrors.employeeId = 'Employee ID is required'
      if (!formData.tsNumber) newErrors.tsNumber = 'TS Number is required'

      if (formData.subjects.length === 0) {
        newErrors.subjects = 'Please select at least one subject'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        toast.error('Please correct the errors in the form')
        return
      }

      // Prepare submission data
      const submissionData = {
        ...formData,
        name: formatFullName(formData.firstName, formData.lastName),
        role: USER_ROLES.TEACHER,
        status: SYSTEM_STATUS.ACTIVE,
      }

      await onSubmit(submissionData)
      toast.success('Teacher registered successfully!')

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        address: '',
        employeeId: '',
        department: '',
        subjects: [],
        qualifications: '',
        experienceYears: '',
        tsNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
      })
    } catch (error) {
      console.error('Error registering teacher:', error)
      toast.error(error.message || 'Error registering teacher. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-4xl mx-auto">
      <Card className="p-6">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <User className="w-6 h-6" aria-hidden="true" />
              Teacher Registration
            </h2>
            <p className="text-royalPurple-text2 mt-1">
              Register a new teacher with subject assignments
            </p>
          </div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} aria-label="Cancel and go back">
              <X className="w-4 h-4 mr-2" aria-hidden="true" />
              Cancel
            </Button>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <FormSection title="Personal Information" icon={User}>
            <FormGroup
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={onInputChange}
              required
              error={errors.firstName}
              validate={validateRequired}
              icon={User}
              aria-describedby="firstName-error"
            />
            <FormGroup
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={onInputChange}
              required
              error={errors.lastName}
              validate={validateRequired}
              icon={User}
              aria-describedby="lastName-error"
            />
            <FormGroup
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={onInputChange}
              required
              error={errors.email}
              validate={validateEmail}
              icon={Mail}
              aria-describedby="email-error"
            />
            <FormGroup
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={onInputChange}
              placeholder="+260-XX-XXXXXXX"
              error={errors.phone}
              validate={validatePhone}
              icon={Phone}
              aria-describedby="phone-error"
            />
            <FormGroup
              label="Gender"
              name="gender"
              type="select"
              value={formData.gender}
              onChange={onInputChange}
              required
              error={errors.gender}
              validate={validateRequired}
              icon={User}
              aria-describedby="gender-error"
            >
              <option value="">Select Gender</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </FormGroup>
            <FormGroup
              label="Address"
              name="address"
              type="textarea"
              value={formData.address}
              onChange={onInputChange}
              className="md:col-span-2"
              error={errors.address}
              icon={MapPin}
              aria-describedby="address-error"
            />
          </FormSection>

          {/* Professional Information */}
          <FormSection title="Professional Information" icon={GraduationCap}>
            <FormGroup
              label="Employee ID"
              name="employeeId"
              value={formData.employeeId}
              onChange={onInputChange}
              placeholder="T001"
              required
              error={errors.employeeId}
              validate={validateRequired}
              icon={Building}
              aria-describedby="employeeId-error"
            />
            <FormGroup
              label="Department"
              name="department"
              type="select"
              value={formData.department}
              onChange={onInputChange}
              required
              error={errors.department}
              validate={validateRequired}
              icon={Building}
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
              name="experienceYears"
              type="number"
              value={formData.experienceYears}
              onChange={onInputChange}
              min="0"
              max="50"
              error={errors.experienceYears}
              icon={Calendar}
              aria-describedby="experienceYears-error"
            />
            <FormGroup
              label="TS Number"
              name="tsNumber"
              value={formData.tsNumber}
              onChange={onInputChange}
              placeholder="TS001234"
              required
              error={errors.tsNumber}
              validate={validateRequired}
              icon={User}
              aria-describedby="tsNumber-error"
            />
            <FormGroup
              label="Qualifications"
              name="qualifications"
              type="textarea"
              value={formData.qualifications}
              onChange={onInputChange}
              className="md:col-span-2"
              placeholder="e.g., BSc Mathematics, PGDE"
              error={errors.qualifications}
              icon={GraduationCap}
              aria-describedby="qualifications-error"
            />
          </FormSection>

          {/* Subject Assignments */}
          <section className="space-y-4" aria-labelledby="subject-assignments-title">
            <h3
              id="subject-assignments-title"
              className="text-lg font-semibold text-royalPurple-text1 flex items-center gap-2 border-b pb-2"
            >
              <BookOpen className="w-5 h-5" aria-hidden="true" />
              Subject Assignments *
            </h3>
            {subjectsLoading ? (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                role="status"
                aria-label="Loading subjects"
              >
                {[1, 2, 3].map((n) => (
                  <div key={n} className="border border-royalPurple-border rounded-lg p-4">
                    <SkeletonLoader className="h-6 w-3/4 mb-4" />
                    <div className="space-y-2">
                      <SkeletonLoader className="h-4 w-full" />
                      <SkeletonLoader className="h-4 w-full" />
                      <SkeletonLoader className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4" role="group" aria-labelledby="subject-assignments-title">
                {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
                  <div key={category} className="border border-royalPurple-border rounded-lg p-4">
                    <h4 className="font-medium text-royalPurple-text1 mb-3 capitalize">
                      {category === 'arts'
                        ? 'Arts & Humanities'
                        : category === 'elective'
                          ? 'Elective Subjects'
                          : category === 'commercial'
                            ? 'Commercial Studies'
                            : category === 'practical'
                              ? 'Practical Subjects'
                              : category === 'language'
                                ? 'Languages'
                                : category === 'science'
                                  ? 'Sciences'
                                  : category === 'core'
                                    ? 'Core Subjects'
                                    : category}
                    </h4>
                    <div
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
                      role="list"
                    >
                      {categorySubjects.map((subject) => (
                        <label
                          key={subject.id}
                          className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-royalPurple-page p-1 rounded transition-colors group"
                          role="listitem"
                        >
                          <input
                            type="checkbox"
                            checked={formData.subjects.includes(subject.id)}
                            onChange={(e) => onSubjectChange(subject.id, e.target.checked)}
                            className="rounded border-royalPurple-border text-royalPurple-accentTx focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all duration-200"
                            aria-label={`Select ${subject.name}`}
                          />
                          <span className="text-royalPurple-text2 group-hover:text-royalPurple-accentTx transition-colors">
                            {subject.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.subjects && (
              <p
                className="text-royalPurple-dangerTx text-sm mt-1"
                id="subjects-error"
                role="alert"
              >
                {errors.subjects}
              </p>
            )}
          </section>

          {/* Emergency Contact */}
          <FormSection title="Emergency Contact" icon={Phone}>
            <FormGroup
              label="Contact Name"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={onInputChange}
              required
              error={errors.emergencyContactName}
              validate={validateRequired}
              icon={User}
              aria-describedby="emergencyContactName-error"
            />
            <FormGroup
              label="Contact Phone"
              name="emergencyContactPhone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={onInputChange}
              error={errors.emergencyContactPhone}
              validate={validatePhone}
              icon={Phone}
              aria-describedby="emergencyContactPhone-error"
            />
            <FormGroup
              label="Relationship"
              name="emergencyContactRelation"
              type="select"
              value={formData.emergencyContactRelation}
              onChange={onInputChange}
              error={errors.emergencyContactRelation}
              icon={Phone}
              aria-describedby="emergencyContactRelation-error"
            >
              <option value="">Select Relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </FormGroup>
          </FormSection>

          {/* Submit Button */}
          <footer className="flex justify-end space-x-4 pt-6 border-t border-royalPurple-border">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                aria-label="Cancel registration"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
              aria-busy={loading}
              aria-label={loading ? 'Registering teacher...' : 'Register Teacher'}
            >
              {loading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <Save className="w-4 h-4" aria-hidden="true" />
              )}
              {loading ? 'Registering...' : 'Register Teacher'}
            </Button>
          </footer>
        </form>
      </Card>
    </main>
  )
}
