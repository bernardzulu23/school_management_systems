'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SubjectSelection from '@/components/registration/SubjectSelection'
import toast from 'react-hot-toast'
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building,
  GraduationCap,
  Award,
  Users,
  BookOpen,
} from 'lucide-react'
import { DEPARTMENTS, USER_ROLES } from '@/lib/constants'
import { handleInputChange } from '@/lib/utils/formHelpers'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import FormField from '@/components/forms/FormField'
import LoadingSpinner from '@/components/LoadingSpinner'

export function HodRegistrationForm({ onSubmit, onCancel, isLoading = false, initialData = null }) {
  const [formData, setFormData] = useState({
    // Personal Information
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: '', // Password should be required for new HODs
    contact_number: initialData?.contact_number || '',
    address: initialData?.address || '',
    date_of_birth: initialData?.date_of_birth || '',
    gender: initialData?.gender || '',

    // Professional Information
    employee_id: initialData?.employee_id || '',
    department_name: initialData?.department_name || '',
    qualification: initialData?.qualification || '',
    specialization: initialData?.specialization || '',
    hire_date: initialData?.hire_date || '',
    appointment_date: initialData?.appointment_date || '',
    salary: initialData?.salary || '',
    bio: initialData?.bio || '',
    years_experience: initialData?.years_experience || '',
    years_as_hod: initialData?.years_as_hod || '',
    subjects_managed: initialData?.subjects_managed || [],
    teachers_supervised: initialData?.teachers_supervised || '',
    management_areas: initialData?.management_areas || [],
    performance_rating: initialData?.performance_rating || '',
  })

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
    if (!value) return 'Phone number is required'
    if (!phoneRegex.test(value)) return 'Invalid phone number'
    return true
  }

  const onInputChange = (e) => {
    handleInputChange(setFormData)(e)

    // Clear error when user starts typing
    const { name } = e.target
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleArrayInputChange = (name, value) => {
    const arrayValue = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item)
    setFormData((prev) => ({
      ...prev,
      [name]: arrayValue,
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    // Required fields validation
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!initialData && !formData.password.trim()) newErrors.password = 'Password is required'
    if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required'
    if (!formData.employee_id.trim()) newErrors.employee_id = 'Employee ID is required'
    if (!formData.department_name.trim()) newErrors.department_name = 'Department is required'
    if (!formData.qualification.trim()) newErrors.qualification = 'Qualification is required'
    if (!formData.subjects_managed || formData.subjects_managed.length === 0) {
      newErrors.subjects_managed = 'At least one subject must be selected'
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Phone validation
    const phoneRegex = /^[0-9+\-\s()]+$/
    if (formData.contact_number && !phoneRegex.test(formData.contact_number)) {
      newErrors.contact_number = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    try {
      await onSubmit({
        ...formData,
        role: USER_ROLES.HOD,
      })
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error('Registration failed. Please try again.')
    }
  }

  const managementAreas = [
    'Curriculum Development',
    'Teacher Training',
    'Student Assessment',
    'Budget Management',
    'Resource Planning',
    'Quality Assurance',
    'Staff Development',
    'Academic Planning',
  ]

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building className="h-6 w-6 mr-2" />
          {initialData ? 'Edit Head of Department' : 'Register New Head of Department'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <FormSection title="Personal Information" icon={User}>
            <FormGroup
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              required
              error={errors.name}
              placeholder="Enter full name"
              validate={validateRequired}
              icon={User}
              aria-describedby="name-error"
            />

            <FormGroup
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={onInputChange}
              required
              error={errors.email}
              placeholder="Enter email address"
              validate={validateEmail}
              icon={Mail}
              aria-describedby="email-error"
            />

            {!initialData && (
              <FormGroup
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={onInputChange}
                required
                error={errors.password}
                placeholder="Enter password"
                validate={validateRequired}
                icon={Shield}
                aria-describedby="password-error"
              />
            )}

            <FormGroup
              label="Contact Number"
              name="contact_number"
              type="tel"
              value={formData.contact_number}
              onChange={onInputChange}
              required
              error={errors.contact_number}
              placeholder="Enter contact number"
              validate={validatePhone}
              icon={Phone}
              aria-describedby="contact_number-error"
            />

            <FormGroup
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={onInputChange}
              validate={validateRequired}
              icon={Calendar}
              aria-describedby="date_of_birth-error"
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
              aria-describedby="gender-error"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </FormGroup>

            <FormGroup
              label="Address"
              name="address"
              type="textarea"
              value={formData.address}
              onChange={onInputChange}
              placeholder="Enter address"
              className="md:col-span-2"
              rows={3}
              icon={MapPin}
              error={errors.address}
              aria-describedby="address-error"
            />
          </FormSection>

          {/* Professional Information */}
          <FormSection title="Professional Information" icon={Building}>
            <FormGroup
              label="Employee ID"
              name="employee_id"
              value={formData.employee_id}
              onChange={onInputChange}
              required
              error={errors.employee_id}
              placeholder="Enter employee ID"
              validate={validateRequired}
              icon={Building}
              aria-describedby="employee_id-error"
            />

            <FormGroup
              label="Department"
              name="department_name"
              type="select"
              value={formData.department_name}
              onChange={onInputChange}
              required
              error={errors.department_name}
              validate={validateRequired}
              aria-describedby="department_name-error"
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </FormGroup>

            <FormGroup
              label="Qualification"
              name="qualification"
              value={formData.qualification}
              onChange={onInputChange}
              required
              error={errors.qualification}
              placeholder="e.g., PhD in Mathematics, MSc in Physics"
              validate={validateRequired}
              icon={GraduationCap}
              aria-describedby="qualification-error"
            />

            <FormGroup
              label="Specialization"
              name="specialization"
              value={formData.specialization}
              onChange={onInputChange}
              placeholder="Area of specialization"
              icon={Award}
              error={errors.specialization}
              aria-describedby="specialization-error"
            />

            <FormGroup
              label="Hire Date"
              name="hire_date"
              type="date"
              value={formData.hire_date}
              onChange={onInputChange}
              icon={Calendar}
              error={errors.hire_date}
              aria-describedby="hire_date-error"
            />

            <FormGroup
              label="HOD Appointment Date"
              name="appointment_date"
              type="date"
              value={formData.appointment_date}
              onChange={onInputChange}
              icon={Calendar}
              error={errors.appointment_date}
              aria-describedby="appointment_date-error"
            />

            <FormGroup
              label="Years of Experience"
              name="years_experience"
              type="number"
              value={formData.years_experience}
              onChange={onInputChange}
              min="0"
              placeholder="Total years of experience"
              icon={Award}
              error={errors.years_experience}
              aria-describedby="years_experience-error"
            />

            <FormGroup
              label="Years as HOD"
              name="years_as_hod"
              type="number"
              value={formData.years_as_hod}
              onChange={onInputChange}
              min="0"
              placeholder="Years in HOD position"
              icon={Award}
              error={errors.years_as_hod}
              aria-describedby="years_as_hod-error"
            />
          </FormSection>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-royalPurple-text1 flex items-center border-b pb-2">
              <Award className="h-5 w-5 mr-2" aria-hidden="true" />
              Additional Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  className="block text-sm font-medium text-royalPurple-text2 mb-2"
                  id="subjects-managed-label"
                >
                  Subjects Managed *
                </label>
                <div
                  className="border border-royalPurple-border rounded-lg p-4 bg-royalPurple-page"
                  aria-labelledby="subjects-managed-label"
                >
                  <SubjectSelection
                    selectedSubjects={formData.subjects_managed || []}
                    onSubjectsChange={(subjects) =>
                      setFormData((prev) => ({ ...prev, subjects_managed: subjects }))
                    }
                    userRole="hod"
                    maxSelections={10}
                  />
                </div>
                {errors.subjects_managed && (
                  <p className="text-royalPurple-dangerTx text-sm mt-1" id="subjects_managed-error">
                    {errors.subjects_managed}
                  </p>
                )}
              </div>

              <FormGroup
                label="Teachers Supervised"
                name="teachers_supervised"
                type="number"
                value={formData.teachers_supervised}
                onChange={onInputChange}
                min="0"
                placeholder="Number of teachers supervised"
                icon={Users}
                error={errors.teachers_supervised}
                aria-describedby="teachers_supervised-error"
              />
            </div>

            <FormGroup
              label="Management Areas"
              name="management_areas"
              value={formData.management_areas.join(', ')}
              onChange={(e) => handleArrayInputChange('management_areas', e.target.value)}
              placeholder="Enter management areas separated by commas"
              description="e.g., Curriculum Development, Teacher Training, Budget Management"
              icon={Award}
              error={errors.management_areas}
              aria-describedby="management_areas-error"
            />

            <FormGroup
              label="Bio/Description"
              name="bio"
              type="textarea"
              value={formData.bio}
              onChange={onInputChange}
              rows={4}
              placeholder="Brief description of background and achievements"
              icon={BookOpen}
              error={errors.bio}
              aria-describedby="bio-error"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px] bg-royalPurple-accent hover:bg-royalPurple-accent text-royalPurple-text1"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  {initialData ? 'Updating...' : 'Registering...'}
                </div>
              ) : initialData ? (
                'Update HOD'
              ) : (
                'Register HOD'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
