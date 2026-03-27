'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import {
  User,
  Shield,
  GraduationCap,
  Briefcase,
  Building,
  Users,
  Heart,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react'

// Shared Utilities & Constants
import { USER_ROLES } from '@/lib/constants'
import { handleInputChange, handleMultiSelectChange } from '@/lib/utils/formHelpers'

// Sub-components
import StepIndicator from './enhanced-registration/StepIndicator'
import BasicInfoStep from './enhanced-registration/BasicInfoStep'
import AccountSetupStep from './enhanced-registration/AccountSetupStep'
import AcademicInfoStep from './enhanced-registration/AcademicInfoStep'
import ProfessionalInfoStep from './enhanced-registration/ProfessionalInfoStep'
import AdministrativeInfoStep from './enhanced-registration/AdministrativeInfoStep'
import ParentGuardianStep from './enhanced-registration/ParentGuardianStep'
import MedicalInfoStep from './enhanced-registration/MedicalInfoStep'

export default function EnhancedUserRegistrationForm({ role = 'student', onSubmit, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Basic user info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contact_number: '',
    address: '',
    date_of_birth: '',
    gender: '',
    profile_picture_url: '',

    // Next of kin
    next_of_kin_name: '',
    next_of_kin_relationship: '',
    next_of_kin_contact: '',

    // Role-specific fields
    employee_id: '',
    ts_number: '',
    student_id: '',
    exam_number: '',
    year_group: '',
    section: '',
    custom_class: '',
    department: '',
    qualifications: '',
    experience_years: '',

    // Assignment fields
    assigned_subjects: [],
    assigned_classes: [],
    selected_subjects: [],

    // Student-specific - Parent/Guardian Information
    parent_father_name: '',
    parent_father_contact: '',
    parent_father_email: '',
    parent_father_occupation: '',
    parent_father_workplace: '',
    parent_father_id_number: '',
    parent_mother_name: '',
    parent_mother_contact: '',
    parent_mother_email: '',
    parent_mother_occupation: '',
    parent_mother_workplace: '',
    parent_mother_id_number: '',
    guardian_name: '',
    guardian_contact: '',
    guardian_email: '',
    guardian_relationship: '',
    guardian_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    emergency_contact_address: '',

    // Medical Information
    blood_type: '',
    medical_aid_scheme: '',
    medical_aid_number: '',
    family_doctor_name: '',
    family_doctor_contact: '',
    nearest_hospital: '',
    has_allergies: '',
    food_allergies: '',
    medication_allergies: '',
    environmental_allergies: '',
    allergy_severity: '',
    takes_medication: '',
    current_medications: '',
    medication_administration: '',
    medication_storage: '',
    has_medical_conditions: '',
    chronic_conditions: '',
    physical_disabilities: '',
    learning_disabilities: '',
    mental_health_conditions: '',
    condition_management: '',
    emergency_medical_info: '',
    medical_consent: '',
    medical_restrictions: '',

    // Academic Information
    previous_school: '',
    grade_average: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState(new Set())

  // Form Handlers
  const onInputChange = (e) => {
    handleInputChange(setFormData)(e)
    const { name } = e.target
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const onSubjectsChange = (subjects) => {
    setFormData((prev) => ({ ...prev, selected_subjects: subjects }))
    if (errors.selected_subjects) {
      setErrors((prev) => ({ ...prev, selected_subjects: '' }))
    }
  }

  const onAssignedSubjectsChange = (subjects) => {
    setFormData((prev) => ({ ...prev, assigned_subjects: subjects }))
    if (errors.assigned_subjects) {
      setErrors((prev) => ({ ...prev, assigned_subjects: '' }))
    }
  }

  const onAssignedClassesChange = (classes) => {
    setFormData((prev) => ({ ...prev, assigned_classes: classes }))
    if (errors.assigned_classes) {
      setErrors((prev) => ({ ...prev, assigned_classes: '' }))
    }
  }

  // Define steps based on role
  const getSteps = () => {
    const baseSteps = [
      {
        id: 1,
        title: 'Basic Information',
        icon: User,
        description: 'Personal details and contact information',
      },
      {
        id: 2,
        title: 'Account Setup',
        icon: Shield,
        description: 'Login credentials and security',
      },
    ]

    if (role === 'student') {
      return [
        ...baseSteps,
        {
          id: 3,
          title: 'Academic Info',
          icon: GraduationCap,
          description: 'School and academic details',
        },
        {
          id: 4,
          title: 'Parent/Guardian',
          icon: Users,
          description: 'Family contact information',
        },
        {
          id: 5,
          title: 'Medical Info',
          icon: Heart,
          description: 'Health and medical details',
        },
      ]
    } else if (role === 'teacher' || role === 'hod') {
      return [
        ...baseSteps,
        {
          id: 3,
          title: 'Professional',
          icon: Briefcase,
          description: 'Employment and qualifications',
        },
      ]
    } else {
      return [
        ...baseSteps,
        {
          id: 3,
          title: 'Administrative',
          icon: Building,
          description: 'Administrative details',
        },
      ]
    }
  }

  const steps = getSteps()
  const totalSteps = steps.length
  const progress = (currentStep / totalSteps) * 100

  const validateCurrentStep = () => {
    const newErrors = {}

    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = 'Full name is required'
      if (role !== 'student' && !formData.contact_number.trim())
        newErrors.contact_number = 'Contact number is required'

      if (role !== 'teacher' && role !== 'hod') {
        if (!formData.date_of_birth) {
          newErrors.date_of_birth = 'Date of birth is required'
        } else {
          const dob = new Date(formData.date_of_birth)
          const today = new Date()
          let age = today.getFullYear() - dob.getFullYear()
          const m = today.getMonth() - dob.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--
          }

          if (dob > today) {
            newErrors.date_of_birth = 'Date cannot be in the future'
          } else if (age < 12) {
            newErrors.date_of_birth = 'Must be at least 12 years old'
          }
        }
      }

      if (!formData.gender) newErrors.gender = 'Gender is required'
    } else if (currentStep === 2) {
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
      if (!formData.password) newErrors.password = 'Password is required'
      if (formData.password.length < 6)
        newErrors.password = 'Password must be at least 6 characters'
      if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = 'Passwords do not match'
    } else if (currentStep === 3) {
      if (role === 'teacher' || role === 'hod') {
        if (!formData.ts_number.trim()) newErrors.ts_number = 'TS Number is required'
        if (!formData.department) newErrors.department = 'Department is required'
        if (!formData.qualifications.trim())
          newErrors.qualifications = 'Qualifications are required'
        if (!formData.assigned_subjects || formData.assigned_subjects.length === 0) {
          newErrors.assigned_subjects = 'At least one subject must be assigned'
        }
      } else if (role === 'student') {
        if (!formData.year_group) newErrors.year_group = 'Year group is required'
        if (!formData.section) newErrors.section = 'Section is required'
        if (!formData.exam_number?.trim()) newErrors.exam_number = 'Exam number is required'
        if (!formData.selected_subjects || formData.selected_subjects.length < 8) {
          newErrors.selected_subjects = 'At least 8 subjects must be selected'
        }
      } else if (role === 'headteacher') {
        if (!formData.employee_id.trim()) newErrors.employee_id = 'Employee ID is required'
        if (!formData.qualifications.trim())
          newErrors.qualifications = 'Qualifications are required'
      }
    } else if (currentStep === 4 && role === 'student') {
      if (!formData.parent_father_name.trim())
        newErrors.parent_father_name = "Father's name is required"
      if (!formData.parent_father_contact.trim())
        newErrors.parent_father_contact = "Father's contact is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]))
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const goToStep = (step) => {
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateCurrentStep()) return

    setLoading(true)
    try {
      const submitData = { ...formData, role }
      await onSubmit(submitData)
      toast.success('Registration completed successfully!')
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Failed to complete registration')
    } finally {
      setLoading(false)
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            formData={formData}
            errors={errors}
            onInputChange={onInputChange}
            role={role}
          />
        )
      case 2:
        return (
          <AccountSetupStep formData={formData} errors={errors} onInputChange={onInputChange} />
        )
      case 3:
        if (role === 'student') {
          return (
            <AcademicInfoStep
              formData={formData}
              errors={errors}
              onInputChange={onInputChange}
              onSubjectsChange={onSubjectsChange}
            />
          )
        } else if (role === 'teacher' || role === 'hod') {
          return (
            <ProfessionalInfoStep
              formData={formData}
              errors={errors}
              onInputChange={onInputChange}
              onSubjectsChange={onAssignedSubjectsChange}
              onClassesChange={onAssignedClassesChange}
            />
          )
        } else {
          return (
            <AdministrativeInfoStep
              formData={formData}
              errors={errors}
              onInputChange={onInputChange}
            />
          )
        }
      case 4:
        return (
          <ParentGuardianStep formData={formData} errors={errors} onInputChange={onInputChange} />
        )
      case 5:
        return <MedicalInfoStep formData={formData} errors={errors} onInputChange={onInputChange} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Registration</h2>
        <p className="opacity-90 capitalize">{role} Account Setup</p>
      </div>

      <div className="p-8">
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {renderCurrentStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-8 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? onCancel : prevStep}
              disabled={loading}
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </Button>

            <div className="flex gap-4">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Processing...' : 'Complete Registration'}
                  {!loading && <CheckCircle className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
