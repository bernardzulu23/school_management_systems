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
  Users,
  Save,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { GRADE_LEVELS, SECTIONS } from '@/lib/constants'
import { handleInputChange, handleMultiSelectChange, formatFullName } from '@/lib/utils/formHelpers'
import { useSubjects } from '@/lib/hooks/useSubjects'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import FormField from '@/components/forms/FormField'
import LoadingSpinner from '@/components/LoadingSpinner'
import SkeletonLoader from '@/components/SkeletonLoader'

export default function StudentRegistrationForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    
    // Academic Information
    studentId: '',
    gradeLevel: '',
    section: '',
    class: '',
    subjects: [],
    previousSchool: '',
    
    // Parent/Guardian Information
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    parentOccupation: '',
    parentAddress: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: ''
  })

  const { subjectsByCategory, loading: subjectsLoading } = useSubjects()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validateRequired = (value) => value ? true : 'This field is required';
  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return true;
  };
  const validatePhone = (value) => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!value) return true; // Optional field
    if (!phoneRegex.test(value)) return 'Invalid phone number';
    return true;
  };

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
      if (!formData.gradeLevel) newErrors.gradeLevel = 'Grade level is required'
      if (!formData.section) newErrors.section = 'Section is required'
      if (!formData.parentName) newErrors.parentName = 'Parent name is required'
      if (!formData.parentPhone) newErrors.parentPhone = 'Parent phone is required'

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
        class: `${formData.gradeLevel} ${formData.section}`,
        name: formatFullName(formData.firstName, formData.lastName),
        role: 'student',
        status: 'active'
      }

      await onSubmit(submissionData)
      toast.success('Student registered successfully!')
      
      // Reset form
      setFormData({
        firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
        gender: '', address: '', studentId: '', gradeLevel: '', class: '',
        subjects: [], previousSchool: '', parentName: '', parentEmail: '',
        parentPhone: '', parentOccupation: '', parentAddress: '',
        emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: ''
      })

    } catch (error) {
      console.error('Error registering student:', error)
      toast.error(error.message || 'Error registering student. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-4xl mx-auto">
      <Card className="p-6">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6" aria-hidden="true" />
              Student Registration
            </h2>
            <p className="text-gray-600 mt-1">Register a new student with subject selections</p>
          </div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} aria-label="Cancel registration">
              <X className="w-4 h-4 mr-2" aria-hidden="true" />
              Cancel
            </Button>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <FormSection title="Personal Information" icon={User}>
            <FormGroup 
              label="First Name" name="firstName" required 
              value={formData.firstName} onChange={onInputChange} 
              error={errors.firstName}
              validate={validateRequired}
              icon={User}
              aria-describedby="firstName-error"
            />
            <FormGroup 
              label="Last Name" name="lastName" required 
              value={formData.lastName} onChange={onInputChange} 
              error={errors.lastName}
              validate={validateRequired}
              icon={User}
              aria-describedby="lastName-error"
            />
            <FormGroup 
              label="Email Address" name="email" type="email" required 
              value={formData.email} onChange={onInputChange} 
              error={errors.email}
              validate={validateEmail}
              icon={Mail}
              aria-describedby="email-error"
            />
            <FormGroup 
              label="Phone Number" name="phone" type="tel" placeholder="+260-XX-XXXXXXX"
              value={formData.phone} onChange={onInputChange} 
              error={errors.phone}
              validate={validatePhone}
              icon={Phone}
              aria-describedby="phone-error"
            />
            <FormGroup 
              label="Date of Birth" name="dateOfBirth" type="date" required 
              value={formData.dateOfBirth} onChange={onInputChange} 
              error={errors.dateOfBirth}
              validate={validateRequired}
              icon={Calendar}
              aria-describedby="dateOfBirth-error"
            />
            <FormGroup
              label="Gender"
              name="gender"
              type="select"
              required
              value={formData.gender}
              onChange={onInputChange}
              error={errors.gender}
              validate={validateRequired}
              icon={User}
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
              rows={2}
              className="md:col-span-2"
              icon={MapPin}
              error={errors.address}
              aria-describedby="address-error"
            />
          </FormSection>

          {/* Academic Information */}
          <FormSection title="Academic Information" icon={BookOpen}>
            <FormGroup 
              label="Student ID" name="studentId" placeholder="S001"
              value={formData.studentId} onChange={onInputChange} 
              error={errors.studentId}
              icon={User}
              aria-describedby="studentId-error"
            />
            <FormGroup
              label="Grade Level"
              name="gradeLevel"
              type="select"
              required
              value={formData.gradeLevel}
              onChange={onInputChange}
              error={errors.gradeLevel}
              validate={validateRequired}
              icon={GraduationCap}
              aria-describedby="gradeLevel-error"
            >
              <option value="">Select Grade Level</option>
              {GRADE_LEVELS.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </FormGroup>

            <FormGroup
              label="Section"
              name="section"
              type="select"
              required
              value={formData.section}
              onChange={onInputChange}
              error={errors.section}
              validate={validateRequired}
              icon={Users}
              aria-describedby="section-error"
            >
              <option value="">Select Section</option>
              {SECTIONS.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </FormGroup>

            <FormGroup 
              label="Previous School" name="previousSchool"
              value={formData.previousSchool} onChange={onInputChange} 
              error={errors.previousSchool}
              icon={BookOpen}
              aria-describedby="previousSchool-error"
            />
          </FormSection>

          {/* Subject Selections */}
          <section className="space-y-4" aria-labelledby="subject-selections-title">
            <h3 id="subject-selections-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
              Subject Selections *
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select subjects based on your grade level and career interests. Core subjects (Mathematics and English) are mandatory.
            </p>
            {subjectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading subjects">
                {[1, 2, 3].map(n => (
                  <div key={n} className="border border-gray-200 rounded-lg p-4">
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
              <div className="space-y-4" role="group" aria-labelledby="subject-selections-title">
                {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
                  <div key={category} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 capitalize flex items-center gap-2">
                      {category === 'core' && <span className="text-red-500 text-xs" aria-hidden="true">(Required)</span>}
                      {category} Subjects
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2" role="list">
                      {categorySubjects.map((subject) => (
                        <label key={subject.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors group" role="listitem">
                          <input
                            type="checkbox"
                            checked={formData.subjects.includes(subject.id)}
                            onChange={(e) => onSubjectChange(subject.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all duration-200"
                            aria-label={`Select ${subject.name}`}
                          />
                          <span className="text-gray-700 group-hover:text-blue-600 transition-colors">{subject.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.subjects && (
              <p className="text-red-500 text-sm mt-1" id="subjects-error" role="alert">
                {errors.subjects}
              </p>
            )}
          </section>

          {/* Parent/Guardian Information */}
          <FormSection title="Parent/Guardian Information" icon={Users}>
            <FormGroup 
              label="Parent/Guardian Name" name="parentName" required 
              value={formData.parentName} onChange={onInputChange} 
              error={errors.parentName}
              validate={validateRequired}
              icon={User}
              aria-describedby="parentName-error"
            />
            <FormGroup 
              label="Parent Email" name="parentEmail" type="email"
              value={formData.parentEmail} onChange={onInputChange} 
              error={errors.parentEmail}
              validate={validateEmail}
              icon={Mail}
              aria-describedby="parentEmail-error"
            />
            <FormGroup 
              label="Parent Phone" name="parentPhone" type="tel" required 
              value={formData.parentPhone} onChange={onInputChange} 
              error={errors.parentPhone}
              validate={validatePhone}
              icon={Phone}
              aria-describedby="parentPhone-error"
            />
            <FormGroup 
              label="Parent Occupation" name="parentOccupation"
              value={formData.parentOccupation} onChange={onInputChange} 
              error={errors.parentOccupation}
              icon={Users}
              aria-describedby="parentOccupation-error"
            />
            <FormGroup
              label="Parent Address"
              name="parentAddress"
              type="textarea"
              value={formData.parentAddress}
              onChange={onInputChange}
              rows={2}
              className="md:col-span-2"
              icon={MapPin}
              error={errors.parentAddress}
              aria-describedby="parentAddress-error"
            />
          </FormSection>

          {/* Emergency Contact */}
          <FormSection title="Emergency Contact" icon={Phone}>
            <FormGroup 
              label="Contact Name" name="emergencyContactName"
              value={formData.emergencyContactName} onChange={onInputChange} 
              error={errors.emergencyContactName}
              icon={User}
              aria-describedby="emergencyContactName-error"
            />
            <FormGroup 
              label="Contact Phone" name="emergencyContactPhone" type="tel"
              value={formData.emergencyContactPhone} onChange={onInputChange} 
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
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="sibling">Sibling</option>
              <option value="relative">Relative</option>
              <option value="family_friend">Family Friend</option>
              <option value="other">Other</option>
            </FormGroup>
          </FormSection>

          {/* Submit Button */}
          <footer className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} aria-label="Cancel registration">
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={loading} 
              className="flex items-center gap-2"
              aria-busy={loading}
              aria-label={loading ? 'Registering student...' : 'Register Student'}
            >
              {loading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <Save className="w-4 h-4" aria-hidden="true" />
              )}
              {loading ? 'Registering...' : 'Register Student'}
            </Button>
          </footer>
        </form>
      </Card>
    </main>
  )
}
