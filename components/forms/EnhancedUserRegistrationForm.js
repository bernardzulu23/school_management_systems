'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import SubjectSelection from '@/components/registration/SubjectSelection'
// import ProfilePictureUpload from '@/components/ui/ProfilePictureUpload'
// import { uploadProfilePicture } from '@/lib/cloudinary-client'
import toast from 'react-hot-toast'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  Building,
  Star,
  Users,
  BookOpen,
  Target,
  DollarSign,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Shield,
  Heart,
  FileText,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Camera
} from 'lucide-react'

export default function EnhancedUserRegistrationForm({ role = 'student', onSubmit, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [profilePictureFile, setProfilePictureFile] = useState(null)
  const [profilePictureUploading, setProfilePictureUploading] = useState(false)
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
    grade_average: ''
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Define steps based on role
  const getSteps = () => {
    const baseSteps = [
      { 
        id: 1, 
        title: 'Basic Information', 
        icon: User, 
        description: 'Personal details and contact information',
        color: 'from-blue-500 to-blue-600'
      },
      { 
        id: 2, 
        title: 'Account Setup', 
        icon: Shield, 
        description: 'Login credentials and security',
        color: 'from-purple-500 to-purple-600'
      }
    ]

    if (role === 'student') {
      return [
        ...baseSteps,
        { 
          id: 3, 
          title: 'Academic Info', 
          icon: GraduationCap, 
          description: 'School and academic details',
          color: 'from-green-500 to-green-600'
        },
        { 
          id: 4, 
          title: 'Parent/Guardian', 
          icon: Users, 
          description: 'Family contact information',
          color: 'from-orange-500 to-orange-600'
        },
        { 
          id: 5, 
          title: 'Medical Info', 
          icon: Heart, 
          description: 'Health and medical details',
          color: 'from-red-500 to-red-600'
        }
      ]
    } else if (role === 'teacher' || role === 'hod') {
      return [
        ...baseSteps,
        { 
          id: 3, 
          title: 'Professional', 
          icon: Briefcase, 
          description: 'Employment and qualifications',
          color: 'from-indigo-500 to-indigo-600'
        }
      ]
    } else {
      return [
        ...baseSteps,
        { 
          id: 3, 
          title: 'Administrative', 
          icon: Building, 
          description: 'Administrative details',
          color: 'from-gray-500 to-gray-600'
        }
      ]
    }
  }

  const steps = getSteps()
  const totalSteps = steps.length
  const progress = (currentStep / totalSteps) * 100

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleProfilePictureSelect = (file) => {
    setProfilePictureFile(file)
  }

  const handleProfilePictureRemove = () => {
    setProfilePictureFile(null)
    setFormData(prev => ({
      ...prev,
      profile_picture_url: ''
    }))
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const goToStep = (step) => {
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step)
    }
  }

  const validateCurrentStep = () => {
    const newErrors = {}

    if (currentStep === 1) {
      // Basic Information validation
      if (!formData.name.trim()) newErrors.name = 'Full name is required'
      if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required'
      if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
      if (!formData.gender) newErrors.gender = 'Gender is required'
    } else if (currentStep === 2) {
      // Account Setup validation
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
      if (!formData.password) newErrors.password = 'Password is required'
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    } else if (currentStep === 3) {
      // Professional/Academic validation - make assignments optional for now
      if (role === 'teacher' || role === 'hod') {
        if (!formData.ts_number.trim()) newErrors.ts_number = 'TS Number is required'
        if (!formData.department) newErrors.department = 'Department is required'
        if (!formData.qualifications.trim()) newErrors.qualifications = 'Qualifications are required'
        // Make assignments optional for testing
        // if (!formData.assigned_subjects || formData.assigned_subjects.length === 0) {
        //   newErrors.assigned_subjects = 'At least one subject must be assigned'
        // }
        // if (!formData.assigned_classes || formData.assigned_classes.length === 0) {
        //   newErrors.assigned_classes = 'At least one class must be assigned'
        // }
      }

      if (role === 'student') {
        if (!formData.year_group) newErrors.year_group = 'Year group is required'
        // Make subject selection optional for testing
        // if (!formData.selected_subjects || formData.selected_subjects.length === 0) {
        //   newErrors.selected_subjects = 'At least one subject must be selected'
        // }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateForm = () => {
    const newErrors = {}

    // Basic validation
    if (!formData.name.trim()) newErrors.name = 'Full name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required'
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
    if (!formData.gender) newErrors.gender = 'Gender is required'

    // Role-specific validation - simplified for testing
    if (role === 'teacher' || role === 'hod') {
      if (!formData.ts_number.trim()) newErrors.ts_number = 'TS Number is required'
      if (!formData.department) newErrors.department = 'Department is required'
      if (!formData.qualifications.trim()) newErrors.qualifications = 'Qualifications are required'
      // Make assignments optional for now
      // if (!formData.assigned_subjects || formData.assigned_subjects.length === 0) {
      //   newErrors.assigned_subjects = 'At least one subject must be assigned'
      // }
      // if (!formData.assigned_classes || formData.assigned_classes.length === 0) {
      //   newErrors.assigned_classes = 'At least one class must be assigned'
      // }
    }

    if (role === 'headteacher') {
      if (!formData.employee_id.trim()) newErrors.employee_id = 'Employee ID is required'
      if (!formData.qualifications.trim()) newErrors.qualifications = 'Qualifications are required'
    }

    if (role === 'student') {
      if (!formData.year_group) newErrors.year_group = 'Year group is required'
      // Make subject selection optional for now
      // if (!formData.selected_subjects || formData.selected_subjects.length === 0) {
      //   newErrors.selected_subjects = 'At least one subject must be selected'
      // }
      // Only require parent info for students
      if (!formData.parent_father_name.trim()) newErrors.parent_father_name = 'Father\'s name is required'
      if (!formData.parent_father_contact.trim()) newErrors.parent_father_contact = 'Father\'s contact is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      // Upload profile picture first if provided - Temporarily disabled
      let profilePictureUrl = ''
      /*
      if (profilePictureFile) {
        setProfilePictureUploading(true)
        toast.loading('Uploading profile picture...')

        // Generate a temporary user ID for upload (you might want to get this from your backend)
        const tempUserId = `temp_${Date.now()}`
        const uploadResult = await uploadProfilePicture(profilePictureFile, tempUserId, role)

        if (uploadResult.success) {
          profilePictureUrl = uploadResult.url
          toast.dismiss()
          toast.success('Profile picture uploaded successfully!')
        } else {
          toast.dismiss()
          toast.error(`Profile picture upload failed: ${uploadResult.error}`)
          // Continue with registration even if profile picture upload fails
        }
        setProfilePictureUploading(false)
      }
      */

      // Create a clean data object with only the fields the backend expects
      const submitData = {
        // Basic required fields
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: role,
        contact_number: formData.contact_number,
        address: formData.address,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        profile_picture_url: profilePictureUrl,

        // Next of kin data
        next_of_kin_name: formData.next_of_kin_name,
        next_of_kin_relationship: formData.next_of_kin_relationship,
        next_of_kin_contact: formData.next_of_kin_contact
      }

      // Add role-specific data
      if (role === 'teacher' || role === 'hod') {
        submitData.ts_number = formData.ts_number
        submitData.employee_id = formData.employee_id
        submitData.department = formData.department
        submitData.qualifications = formData.qualifications
        submitData.experience_years = formData.experience_years

        // Convert arrays to comma-separated strings for backend compatibility
        if (formData.assigned_subjects && formData.assigned_subjects.length > 0) {
          submitData.assigned_subjects = formData.assigned_subjects.join(',')
        }
        if (formData.assigned_classes && formData.assigned_classes.length > 0) {
          submitData.assigned_classes = formData.assigned_classes.join(',')
        }
      }

      if (role === 'student') {
        submitData.student_id = formData.student_id
        submitData.exam_number = formData.exam_number
        submitData.year_group = formData.year_group
        submitData.custom_class = formData.custom_class
        submitData.previous_school = formData.previous_school
        submitData.grade_average = formData.grade_average

        // Convert selected subjects array to comma-separated string
        if (formData.selected_subjects && formData.selected_subjects.length > 0) {
          submitData.selected_subjects = formData.selected_subjects.join(',')
        }

        // Parent/Guardian information
        submitData.parent_father_name = formData.parent_father_name
        submitData.parent_father_contact = formData.parent_father_contact
        submitData.parent_father_email = formData.parent_father_email
        submitData.parent_father_occupation = formData.parent_father_occupation
        submitData.parent_father_workplace = formData.parent_father_workplace
        submitData.parent_father_id_number = formData.parent_father_id_number
        submitData.parent_mother_name = formData.parent_mother_name
        submitData.parent_mother_contact = formData.parent_mother_contact
        submitData.parent_mother_email = formData.parent_mother_email
        submitData.parent_mother_occupation = formData.parent_mother_occupation
        submitData.parent_mother_workplace = formData.parent_mother_workplace
        submitData.parent_mother_id_number = formData.parent_mother_id_number
        submitData.guardian_name = formData.guardian_name
        submitData.guardian_contact = formData.guardian_contact
        submitData.guardian_email = formData.guardian_email
        submitData.guardian_relationship = formData.guardian_relationship
        submitData.guardian_address = formData.guardian_address
        submitData.emergency_contact_name = formData.emergency_contact_name
        submitData.emergency_contact_phone = formData.emergency_contact_phone
        submitData.emergency_contact_relationship = formData.emergency_contact_relationship
        submitData.emergency_contact_address = formData.emergency_contact_address

        // Medical information
        submitData.blood_type = formData.blood_type
        submitData.medical_aid_scheme = formData.medical_aid_scheme
        submitData.medical_aid_number = formData.medical_aid_number
        submitData.family_doctor_name = formData.family_doctor_name
        submitData.family_doctor_contact = formData.family_doctor_contact
        submitData.nearest_hospital = formData.nearest_hospital
        submitData.has_allergies = formData.has_allergies
        submitData.food_allergies = formData.food_allergies
        submitData.medication_allergies = formData.medication_allergies
        submitData.environmental_allergies = formData.environmental_allergies
        submitData.allergy_severity = formData.allergy_severity
        submitData.takes_medication = formData.takes_medication
        submitData.current_medications = formData.current_medications
        submitData.medication_administration = formData.medication_administration
        submitData.medication_storage = formData.medication_storage
        submitData.has_medical_conditions = formData.has_medical_conditions
        submitData.chronic_conditions = formData.chronic_conditions
        submitData.physical_disabilities = formData.physical_disabilities
        submitData.learning_disabilities = formData.learning_disabilities
        submitData.mental_health_conditions = formData.mental_health_conditions
        submitData.condition_management = formData.condition_management
        submitData.emergency_medical_info = formData.emergency_medical_info
        submitData.medical_consent = formData.medical_consent
        submitData.medical_restrictions = formData.medical_restrictions
      }

      if (role === 'headteacher') {
        submitData.employee_id = formData.employee_id
        submitData.qualifications = formData.qualifications
      }

      console.log('Submitting data:', submitData) // Debug log
      await onSubmit(submitData)
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleTitle = () => {
    switch (role) {
      case 'headteacher': return 'Headteacher Registration'
      case 'hod': return 'Head of Department Registration'
      case 'teacher': return 'Teacher Registration'
      case 'student': return 'Student Registration'
      default: return 'User Registration'
    }
  }

  const renderStepIndicator = () => (
    <div className="form-step-indicator">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id
        const isCompleted = completedSteps.has(step.id)
        const isAccessible = step.id <= currentStep || completedSteps.has(step.id - 1)
        const StepIcon = step.icon

        return (
          <div
            key={step.id}
            className={`step-item ${isActive ? 'active' : isCompleted ? 'completed' : 'inactive'} ${
              isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
            onClick={() => isAccessible && goToStep(step.id)}
          >
            <div className={`step-number ${isActive ? 'active' : isCompleted ? 'completed' : 'inactive'}`}>
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
            </div>
            <div className="hidden md:block">
              <div className="font-medium text-sm">{step.title}</div>
              <div className="text-xs opacity-75">{step.description}</div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderProgressBar = () => (
    <div className="px-6 mb-6">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
    </div>
  )

  const renderInputField = ({
    name,
    label,
    type = 'text',
    placeholder,
    required = false,
    icon: Icon,
    options = null,
    rows = null
  }) => {
    const hasError = errors[name]
    const inputClasses = `input-enhanced ${Icon ? 'input-with-icon' : ''} ${
      hasError ? 'input-error-enhanced' : ''
    }`

    return (
      <div className="input-group slide-up">
        <label className="form-label font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          {Icon && <Icon className="input-icon h-5 w-5" />}

          {type === 'select' ? (
            <select
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className={inputClasses}
              required={required}
            >
              <option value="">{placeholder}</option>
              {options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className={inputClasses}
              placeholder={placeholder}
              rows={rows || 3}
              required={required}
            />
          ) : type === 'password' ? (
            <>
              <input
                type={name === 'password' ? (showPassword ? 'text' : 'password') :
                      name === 'confirmPassword' ? (showConfirmPassword ? 'text' : 'password') : type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className={inputClasses}
                placeholder={placeholder}
                required={required}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  if (name === 'password') setShowPassword(!showPassword)
                  if (name === 'confirmPassword') setShowConfirmPassword(!showConfirmPassword)
                }}
              >
                {(name === 'password' ? showPassword : showConfirmPassword) ?
                  <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className={inputClasses}
              placeholder={placeholder}
              required={required}
            />
          )}
        </div>
        {hasError && (
          <div className="error-message">
            <span className="text-red-500">⚠</span>
            <span>{errors[name]}</span>
          </div>
        )}
      </div>
    )
  }

  const renderStep1 = () => (
    <div className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon bg-gradient-to-r from-blue-500 to-blue-600">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h3 className="form-section-title">Basic Information</h3>
          <p className="form-section-subtitle">Tell us about yourself</p>
        </div>
      </div>

      {/* Profile Picture Upload - Temporarily disabled */}
      {/*
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <Camera className="h-5 w-5 text-gray-600 mr-2" />
          <h4 className="text-lg font-medium text-gray-900">Profile Picture</h4>
          <span className="ml-2 text-sm text-gray-500">(Optional)</span>
        </div>
        <ProfilePictureUpload
          onImageSelect={handleProfilePictureSelect}
          onImageRemove={handleProfilePictureRemove}
          role={role}
          size="large"
          disabled={profilePictureUploading}
        />
        {profilePictureUploading && (
          <div className="mt-2 text-sm text-blue-600 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Uploading profile picture...
          </div>
        )}
      </div>
      */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInputField({
          name: 'name',
          label: 'Full Name',
          placeholder: 'Enter your full name',
          required: true,
          icon: User
        })}

        {renderInputField({
          name: 'contact_number',
          label: 'Contact Number',
          type: 'tel',
          placeholder: 'Enter your phone number',
          required: true,
          icon: Phone
        })}

        {renderInputField({
          name: 'date_of_birth',
          label: 'Date of Birth',
          type: 'date',
          required: true,
          icon: Calendar
        })}

        {renderInputField({
          name: 'gender',
          label: 'Gender',
          type: 'select',
          placeholder: 'Select your gender',
          required: true,
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' }
          ]
        })}

        <div className="md:col-span-2">
          {renderInputField({
            name: 'address',
            label: 'Address',
            type: 'textarea',
            placeholder: 'Enter your full address',
            icon: MapPin,
            rows: 3
          })}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon bg-gradient-to-r from-purple-500 to-purple-600">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h3 className="form-section-title">Account Setup</h3>
          <p className="form-section-subtitle">Create your login credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInputField({
          name: 'email',
          label: 'Email Address',
          type: 'email',
          placeholder: 'Enter your email address',
          required: true,
          icon: Mail
        })}

        <div></div>

        {renderInputField({
          name: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'Create a strong password',
          required: true,
          icon: Shield
        })}

        {renderInputField({
          name: 'confirmPassword',
          label: 'Confirm Password',
          type: 'password',
          placeholder: 'Confirm your password',
          required: true,
          icon: Shield
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Password Requirements:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• At least 6 characters long</li>
          <li>• Include both letters and numbers</li>
          <li>• Use a unique password you haven't used elsewhere</li>
        </ul>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        if (role === 'student') {
          return renderStudentAcademicStep()
        } else if (role === 'teacher' || role === 'hod') {
          return renderProfessionalStep()
        } else {
          return renderAdministrativeStep()
        }
      case 4:
        return renderStudentParentStep()
      case 5:
        return renderStudentMedicalStep()
      default:
        return renderStep1()
    }
  }

  const renderNavigationButtons = () => (
    <div className="flex justify-between items-center pt-6 border-t border-gray-200">
      <div>
        {currentStep > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="btn-secondary-enhanced"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary-enhanced"
          disabled={loading}
        >
          Cancel
        </button>

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={nextStep}
            className="btn-primary-enhanced"
            disabled={loading}
          >
            <span>Next Step</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            className="btn-success-enhanced"
            disabled={loading}
          >
            {loading && <div className="loading-spinner" />}
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            {!loading && <CheckCircle className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )

  // Placeholder methods for additional steps
  const renderStudentAcademicStep = () => {
    const yearGroups = [
      { value: 'Form 1', label: 'Form 1' },
      { value: 'Form 2', label: 'Form 2' },
      { value: 'Form 3', label: 'Form 3' },
      { value: 'Form 4', label: 'Form 4' },
      { value: 'Lower 6', label: 'Lower 6 (A-Level)' },
      { value: 'Upper 6', label: 'Upper 6 (A-Level)' }
    ]

    const subjectsByLevel = {
      'Form 1': ['English Language', 'Mathematics', 'Science', 'Shona/Ndebele', 'History', 'Geography', 'Religious Education', 'Physical Education'],
      'Form 2': ['English Language', 'Mathematics', 'Science', 'Shona/Ndebele', 'History', 'Geography', 'Religious Education', 'Physical Education'],
      'Form 3': ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Shona/Ndebele', 'History', 'Geography', 'Accounting', 'Business Studies'],
      'Form 4': ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Shona/Ndebele', 'History', 'Geography', 'Accounting', 'Business Studies'],
      'Lower 6': ['English Literature', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Accounting', 'Business Studies', 'Economics'],
      'Upper 6': ['English Literature', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Accounting', 'Business Studies', 'Economics']
    }

    const availableSubjects = formData.year_group ? subjectsByLevel[formData.year_group] || [] : []

    return (
      <div className="form-section">
        <div className="form-section-header">
          <div className="form-section-icon bg-gradient-to-r from-green-500 to-green-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="form-section-title">Academic Information</h3>
            <p className="form-section-subtitle">School details and subject selection</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Academic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: 'student_id',
              label: 'Student ID',
              placeholder: 'Auto-generated if left empty',
              icon: FileText
            })}

            {renderInputField({
              name: 'exam_number',
              label: 'Exam Number',
              placeholder: 'Enter exam number',
              icon: FileText
            })}

            {renderInputField({
              name: 'year_group',
              label: 'Year Group',
              type: 'select',
              placeholder: 'Select year group',
              required: true,
              icon: GraduationCap,
              options: yearGroups
            })}

            {renderInputField({
              name: 'custom_class',
              label: 'Class',
              placeholder: 'e.g., Form 1A, Form 2B',
              icon: Users
            })}

            {renderInputField({
              name: 'previous_school',
              label: 'Previous School',
              placeholder: 'Enter previous school name',
              icon: Building
            })}

            {renderInputField({
              name: 'grade_average',
              label: 'Previous Grade Average (%)',
              type: 'number',
              placeholder: 'Enter previous grade average',
              icon: Target
            })}
          </div>

          {/* Subject Selection */}
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Subject Selection
            </h4>

            <div className="mb-4 p-4 bg-white rounded-lg border border-green-200">
              <p className="text-sm text-green-700 mb-2">
                <strong>Instructions:</strong> Select the subjects you will be studying this academic year.
              </p>
              <p className="text-xs text-gray-600">
                The available subjects depend on your selected year group. You can select multiple subjects.
              </p>
            </div>

            <div>
              <SubjectSelection
                selectedSubjects={formData.selected_subjects || []}
                onSubjectsChange={(subjects) => setFormData(prev => ({ ...prev, selected_subjects: subjects }))}
                userRole="student"
                maxSelections={8}
              />
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
                      {formData.selected_subjects.map(subject => (
                        <span key={subject} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {subject}
                        </span>
                      ))}
                    </div>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStudentParentStep = () => (
    <div className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon bg-gradient-to-r from-orange-500 to-orange-600">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="form-section-title">Parent/Guardian Information</h3>
          <p className="form-section-subtitle">Family contact details and emergency contacts</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Father's Information */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
          <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Father's Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: 'parent_father_name',
              label: "Father's Full Name",
              placeholder: "Enter father's full name",
              required: true,
              icon: User
            })}

            {renderInputField({
              name: 'parent_father_contact',
              label: "Father's Contact Number",
              type: 'tel',
              placeholder: "Enter father's phone number",
              required: true,
              icon: Phone
            })}

            {renderInputField({
              name: 'parent_father_email',
              label: "Father's Email Address",
              type: 'email',
              placeholder: "Enter father's email (optional)",
              icon: Mail
            })}

            {renderInputField({
              name: 'parent_father_occupation',
              label: "Father's Occupation",
              placeholder: "Enter father's occupation",
              icon: Briefcase
            })}

            {renderInputField({
              name: 'parent_father_workplace',
              label: "Father's Workplace",
              placeholder: "Enter father's workplace",
              icon: Building
            })}

            {renderInputField({
              name: 'parent_father_id_number',
              label: "Father's ID Number",
              placeholder: "Enter father's national ID number",
              icon: FileText
            })}
          </div>
        </div>

        {/* Mother's Information */}
        <div className="bg-pink-50 p-6 rounded-xl border border-pink-200">
          <h4 className="text-lg font-semibold text-pink-800 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Mother's Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: 'parent_mother_name',
              label: "Mother's Full Name",
              placeholder: "Enter mother's full name",
              required: true,
              icon: User
            })}

            {renderInputField({
              name: 'parent_mother_contact',
              label: "Mother's Contact Number",
              type: 'tel',
              placeholder: "Enter mother's phone number",
              required: true,
              icon: Phone
            })}

            {renderInputField({
              name: 'parent_mother_email',
              label: "Mother's Email Address",
              type: 'email',
              placeholder: "Enter mother's email (optional)",
              icon: Mail
            })}

            {renderInputField({
              name: 'parent_mother_occupation',
              label: "Mother's Occupation",
              placeholder: "Enter mother's occupation",
              icon: Briefcase
            })}

            {renderInputField({
              name: 'parent_mother_workplace',
              label: "Mother's Workplace",
              placeholder: "Enter mother's workplace",
              icon: Building
            })}

            {renderInputField({
              name: 'parent_mother_id_number',
              label: "Mother's ID Number",
              placeholder: "Enter mother's national ID number",
              icon: FileText
            })}
          </div>
        </div>

        {/* Guardian Information (if different from parents) */}
        <div className="bg-green-50 p-6 rounded-xl border border-green-200">
          <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Guardian Information (if different from parents)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: 'guardian_name',
              label: "Guardian's Full Name",
              placeholder: "Enter guardian's full name (if applicable)",
              icon: User
            })}

            {renderInputField({
              name: 'guardian_contact',
              label: "Guardian's Contact Number",
              type: 'tel',
              placeholder: "Enter guardian's phone number",
              icon: Phone
            })}

            {renderInputField({
              name: 'guardian_email',
              label: "Guardian's Email Address",
              type: 'email',
              placeholder: "Enter guardian's email",
              icon: Mail
            })}

            {renderInputField({
              name: 'guardian_relationship',
              label: "Relationship to Student",
              placeholder: "e.g., Aunt, Uncle, Grandparent",
              icon: Users
            })}

            <div className="md:col-span-2">
              {renderInputField({
                name: 'guardian_address',
                label: "Guardian's Address",
                type: 'textarea',
                placeholder: "Enter guardian's full address",
                icon: MapPin,
                rows: 2
              })}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-red-50 p-6 rounded-xl border border-red-200">
          <h4 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Emergency Contact (if different from above)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: 'emergency_contact_name',
              label: "Emergency Contact Name",
              placeholder: "Enter emergency contact name",
              icon: User
            })}

            {renderInputField({
              name: 'emergency_contact_phone',
              label: "Emergency Contact Phone",
              type: 'tel',
              placeholder: "Enter emergency contact phone",
              icon: Phone
            })}

            {renderInputField({
              name: 'emergency_contact_relationship',
              label: "Relationship to Student",
              placeholder: "e.g., Family Friend, Relative",
              icon: Users
            })}

            {renderInputField({
              name: 'emergency_contact_address',
              label: "Emergency Contact Address",
              placeholder: "Enter emergency contact address",
              icon: MapPin
            })}
          </div>
        </div>

        {/* Family Information Summary */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Family Information Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Primary Contacts:</span>
              <div className="mt-1 space-y-1">
                {formData.parent_father_name && (
                  <div className="text-gray-600">
                    Father: {formData.parent_father_name} ({formData.parent_father_contact})
                  </div>
                )}
                {formData.parent_mother_name && (
                  <div className="text-gray-600">
                    Mother: {formData.parent_mother_name} ({formData.parent_mother_contact})
                  </div>
                )}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Additional Contacts:</span>
              <div className="mt-1 space-y-1">
                {formData.guardian_name && (
                  <div className="text-gray-600">
                    Guardian: {formData.guardian_name} ({formData.guardian_contact})
                  </div>
                )}
                {formData.emergency_contact_name && (
                  <div className="text-gray-600">
                    Emergency: {formData.emergency_contact_name} ({formData.emergency_contact_phone})
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStudentMedicalStep = () => (
    <div className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon bg-gradient-to-r from-red-500 to-red-600">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h3 className="form-section-title">Medical Information</h3>
          <p className="form-section-subtitle">Health and medical details for student safety</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Medical Disclaimer */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <div className="text-blue-600 mr-3">
              ℹ️
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Medical Information Notice</h4>
              <p className="text-sm text-blue-700">
                This information is confidential and will only be used for the student's safety and well-being.
                Please provide accurate information to help us provide appropriate care when needed.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Medical Information */}
        <div className="bg-green-50 p-6 rounded-xl border border-green-200">
          <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <Heart className="h-5 w-5 mr-2" />
            Basic Medical Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: 'blood_type',
              label: 'Blood Type',
              type: 'select',
              placeholder: 'Select blood type',
              icon: Heart,
              options: [
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
                { value: 'Unknown', label: 'Unknown' }
              ]
            })}

            {renderInputField({
              name: 'medical_aid_scheme',
              label: 'Medical Aid Scheme',
              placeholder: 'Enter medical aid scheme name (if any)',
              icon: Shield
            })}

            {renderInputField({
              name: 'medical_aid_number',
              label: 'Medical Aid Number',
              placeholder: 'Enter medical aid membership number',
              icon: FileText
            })}

            {renderInputField({
              name: 'family_doctor_name',
              label: 'Family Doctor Name',
              placeholder: 'Enter family doctor name',
              icon: User
            })}

            {renderInputField({
              name: 'family_doctor_contact',
              label: 'Family Doctor Contact',
              type: 'tel',
              placeholder: 'Enter family doctor phone number',
              icon: Phone
            })}

            {renderInputField({
              name: 'nearest_hospital',
              label: 'Nearest Hospital',
              placeholder: 'Enter nearest hospital name',
              icon: Building
            })}
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
          <h4 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Allergies and Sensitivities
          </h4>

          <div className="space-y-4">
            <div>
              {renderInputField({
                name: 'has_allergies',
                label: 'Does the student have any known allergies?',
                type: 'select',
                placeholder: 'Select option',
                icon: AlertCircle,
                options: [
                  { value: 'no', label: 'No known allergies' },
                  { value: 'yes', label: 'Yes, has allergies' }
                ]
              })}
            </div>

            {formData.has_allergies === 'yes' && (
              <div className="space-y-4">
                {renderInputField({
                  name: 'food_allergies',
                  label: 'Food Allergies',
                  type: 'textarea',
                  placeholder: 'List any food allergies (e.g., nuts, dairy, eggs, shellfish)',
                  icon: Target,
                  rows: 2
                })}

                {renderInputField({
                  name: 'medication_allergies',
                  label: 'Medication Allergies',
                  type: 'textarea',
                  placeholder: 'List any medication allergies (e.g., penicillin, aspirin)',
                  icon: Target,
                  rows: 2
                })}

                {renderInputField({
                  name: 'environmental_allergies',
                  label: 'Environmental Allergies',
                  type: 'textarea',
                  placeholder: 'List any environmental allergies (e.g., pollen, dust, animals)',
                  icon: Target,
                  rows: 2
                })}

                {renderInputField({
                  name: 'allergy_severity',
                  label: 'Allergy Severity',
                  type: 'select',
                  placeholder: 'Select severity level',
                  icon: AlertCircle,
                  options: [
                    { value: 'mild', label: 'Mild (minor discomfort)' },
                    { value: 'moderate', label: 'Moderate (noticeable symptoms)' },
                    { value: 'severe', label: 'Severe (requires immediate attention)' },
                    { value: 'life-threatening', label: 'Life-threatening (anaphylaxis risk)' }
                  ]
                })}
              </div>
            )}
          </div>
        </div>

        {/* Current Medications */}
        <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
          <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Current Medications
          </h4>

          <div className="space-y-4">
            <div>
              {renderInputField({
                name: 'takes_medication',
                label: 'Does the student currently take any medications?',
                type: 'select',
                placeholder: 'Select option',
                icon: FileText,
                options: [
                  { value: 'no', label: 'No current medications' },
                  { value: 'yes', label: 'Yes, takes medications' }
                ]
              })}
            </div>

            {formData.takes_medication === 'yes' && (
              <div className="space-y-4">
                {renderInputField({
                  name: 'current_medications',
                  label: 'List Current Medications',
                  type: 'textarea',
                  placeholder: 'List all current medications with dosage and frequency (e.g., Insulin - 10 units twice daily)',
                  icon: FileText,
                  rows: 3
                })}

                {renderInputField({
                  name: 'medication_administration',
                  label: 'Medication Administration at School',
                  type: 'select',
                  placeholder: 'Select option',
                  icon: Clock,
                  options: [
                    { value: 'none', label: 'No medication needed at school' },
                    { value: 'self-administered', label: 'Student can self-administer' },
                    { value: 'staff-assistance', label: 'Requires staff assistance' },
                    { value: 'emergency-only', label: 'Emergency medication only' }
                  ]
                })}

                {renderInputField({
                  name: 'medication_storage',
                  label: 'Special Storage Requirements',
                  placeholder: 'Any special storage requirements (e.g., refrigeration, temperature)',
                  icon: Shield
                })}
              </div>
            )}
          </div>
        </div>

        {/* Medical Conditions */}
        <div className="bg-red-50 p-6 rounded-xl border border-red-200">
          <h4 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
            <Heart className="h-5 w-5 mr-2" />
            Medical Conditions and Disabilities
          </h4>

          <div className="space-y-4">
            <div>
              {renderInputField({
                name: 'has_medical_conditions',
                label: 'Does the student have any medical conditions or disabilities?',
                type: 'select',
                placeholder: 'Select option',
                icon: Heart,
                options: [
                  { value: 'no', label: 'No known medical conditions' },
                  { value: 'yes', label: 'Yes, has medical conditions' }
                ]
              })}
            </div>

            {formData.has_medical_conditions === 'yes' && (
              <div className="space-y-4">
                {renderInputField({
                  name: 'chronic_conditions',
                  label: 'Chronic Medical Conditions',
                  type: 'textarea',
                  placeholder: 'List any chronic conditions (e.g., asthma, diabetes, epilepsy, heart condition)',
                  icon: Heart,
                  rows: 3
                })}

                {renderInputField({
                  name: 'physical_disabilities',
                  label: 'Physical Disabilities',
                  type: 'textarea',
                  placeholder: 'List any physical disabilities or mobility issues',
                  icon: User,
                  rows: 2
                })}

                {renderInputField({
                  name: 'learning_disabilities',
                  label: 'Learning Disabilities',
                  type: 'textarea',
                  placeholder: 'List any learning disabilities or special educational needs',
                  icon: BookOpen,
                  rows: 2
                })}

                {renderInputField({
                  name: 'mental_health_conditions',
                  label: 'Mental Health Conditions',
                  type: 'textarea',
                  placeholder: 'List any mental health conditions (optional, confidential)',
                  icon: Heart,
                  rows: 2
                })}

                {renderInputField({
                  name: 'condition_management',
                  label: 'Condition Management at School',
                  type: 'textarea',
                  placeholder: 'Describe how these conditions should be managed at school',
                  icon: Shield,
                  rows: 3
                })}
              </div>
            )}
          </div>
        </div>

        {/* Emergency Medical Information */}
        <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
          <h4 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Emergency Medical Information
          </h4>

          <div className="space-y-4">
            {renderInputField({
              name: 'emergency_medical_info',
              label: 'Emergency Medical Instructions',
              type: 'textarea',
              placeholder: 'Any specific instructions for medical emergencies (e.g., EpiPen location, emergency contacts)',
              icon: AlertCircle,
              rows: 3
            })}

            {renderInputField({
              name: 'medical_consent',
              label: 'Medical Treatment Consent',
              type: 'select',
              placeholder: 'Select consent level',
              required: true,
              icon: Shield,
              options: [
                { value: 'full', label: 'Full consent for emergency medical treatment' },
                { value: 'limited', label: 'Limited consent - contact parents first' },
                { value: 'restricted', label: 'Restricted - specific instructions only' }
              ]
            })}

            {renderInputField({
              name: 'medical_restrictions',
              label: 'Medical Restrictions',
              type: 'textarea',
              placeholder: 'Any medical restrictions for school activities (e.g., no contact sports, swimming restrictions)',
              icon: Target,
              rows: 2
            })}
          </div>
        </div>

        {/* Medical Information Summary */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Medical Information Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Key Medical Info:</span>
              <div className="mt-1 space-y-1">
                {formData.blood_type && (
                  <div className="text-gray-600">Blood Type: {formData.blood_type}</div>
                )}
                {formData.has_allergies === 'yes' && (
                  <div className="text-red-600">⚠ Has Allergies</div>
                )}
                {formData.takes_medication === 'yes' && (
                  <div className="text-blue-600">📋 Takes Medication</div>
                )}
                {formData.has_medical_conditions === 'yes' && (
                  <div className="text-orange-600">🏥 Has Medical Conditions</div>
                )}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Emergency Contacts:</span>
              <div className="mt-1 space-y-1">
                {formData.family_doctor_name && (
                  <div className="text-gray-600">
                    Doctor: {formData.family_doctor_name}
                  </div>
                )}
                {formData.medical_aid_scheme && (
                  <div className="text-gray-600">
                    Medical Aid: {formData.medical_aid_scheme}
                  </div>
                )}
                {formData.nearest_hospital && (
                  <div className="text-gray-600">
                    Hospital: {formData.nearest_hospital}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderProfessionalStep = () => {
    const departments = [
      'Mathematics', 'Science', 'Languages', 'Social Studies', 'Arts', 'Physical Education',
      'Technology', 'Business Studies', 'Religious Studies', 'Practical Arts'
    ]

    const subjectsByDepartment = {
      'Mathematics': ['Mathematics', 'Additional Mathematics', 'Statistics'],
      'Science': ['Physics', 'Chemistry', 'Biology', 'General Science', 'Computer Science'],
      'Languages': ['English Language', 'English Literature', 'Shona', 'Ndebele', 'French'],
      'Social Studies': ['History', 'Geography', 'Sociology', 'Psychology'],
      'Arts': ['Art and Design', 'Music', 'Drama/Theatre Arts'],
      'Physical Education': ['Physical Education', 'Health Education', 'Sports Science'],
      'Technology': ['Information Technology', 'Design and Technology', 'Computer Studies'],
      'Business Studies': ['Accounting', 'Business Studies', 'Economics', 'Commerce'],
      'Religious Studies': ['Religious Education'],
      'Practical Arts': ['Food and Nutrition', 'Fashion and Fabrics', 'Woodwork', 'Metalwork']
    }

    const classes = [
      'Form 1A', 'Form 1B', 'Form 1C', 'Form 2A', 'Form 2B', 'Form 2C',
      'Form 3A', 'Form 3B', 'Form 3C', 'Form 4A', 'Form 4B', 'Form 4C',
      'Lower 6A', 'Lower 6B', 'Upper 6A', 'Upper 6B'
    ]

    const availableSubjects = formData.department ? subjectsByDepartment[formData.department] || [] : []

    return (
      <div className="form-section">
        <div className="form-section-header">
          <div className="form-section-icon bg-gradient-to-r from-indigo-500 to-indigo-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h3 className="form-section-title">Professional Information</h3>
            <p className="form-section-subtitle">Employment details, qualifications, and assignments</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Professional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: 'ts_number',
              label: 'Teacher Service Number',
              placeholder: 'Enter TS Number',
              required: true,
              icon: FileText
            })}

            {renderInputField({
              name: 'employee_id',
              label: 'Employee ID',
              placeholder: 'Enter Employee ID',
              icon: FileText
            })}

            {renderInputField({
              name: 'department',
              label: 'Department',
              type: 'select',
              placeholder: 'Select Department',
              required: true,
              icon: Building,
              options: departments.map(dept => ({ value: dept, label: dept }))
            })}

            {renderInputField({
              name: 'experience_years',
              label: 'Years of Experience',
              type: 'number',
              placeholder: 'Enter years of experience',
              icon: Calendar
            })}
          </div>

          {/* Qualifications */}
          <div>
            {renderInputField({
              name: 'qualifications',
              label: 'Qualifications',
              type: 'textarea',
              placeholder: 'Enter qualifications (e.g., B.Ed Mathematics, M.Sc Physics, PhD Education)',
              required: true,
              icon: GraduationCap,
              rows: 3
            })}
          </div>

          {/* Subject Assignments */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Subject Assignments
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <SubjectSelection
                  selectedSubjects={formData.assigned_subjects || []}
                  onSubjectsChange={(subjects) => setFormData(prev => ({ ...prev, assigned_subjects: subjects }))}
                  userRole="teacher"
                  maxSelections={6}
                />
              </div>

              <div>
                <label className="form-label font-medium text-blue-700">
                  Classes to Teach <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-blue-200 rounded-lg p-3 bg-white">
                  {classes.map(className => (
                    <label key={className} className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 p-2 rounded">
                      <input
                        type="checkbox"
                        value={className}
                        checked={formData.assigned_classes?.includes(className) || false}
                        onChange={(e) => {
                          const assignedClasses = formData.assigned_classes || []
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              assigned_classes: [...assignedClasses, className]
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              assigned_classes: assignedClasses.filter(c => c !== className)
                            }))
                          }
                        }}
                        className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{className}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Assignment Summary */}
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-800 mb-2">Assignment Summary:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Subjects: </span>
                  <span className="text-gray-700">
                    {formData.assigned_subjects?.length || 0} selected
                    {formData.assigned_subjects?.length > 0 && (
                      <span className="block text-xs text-gray-500 mt-1">
                        {formData.assigned_subjects.join(', ')}
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Classes: </span>
                  <span className="text-gray-700">
                    {formData.assigned_classes?.length || 0} selected
                    {formData.assigned_classes?.length > 0 && (
                      <span className="block text-xs text-gray-500 mt-1">
                        {formData.assigned_classes.join(', ')}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAdministrativeStep = () => (
    <div className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon bg-gradient-to-r from-gray-500 to-gray-600">
          <Building className="h-5 w-5" />
        </div>
        <div>
          <h3 className="form-section-title">Administrative Information</h3>
          <p className="form-section-subtitle">Administrative details</p>
        </div>
      </div>
      <div className="text-center py-8 text-gray-500">
        Administrative information form will be implemented here
      </div>
    </div>
  )

  return (
    <div className="form-container">
      <div className="form-card fade-in">
        {/* Header */}
        <div className="form-header">
          <div className="form-header-content">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {getRoleTitle()}
                </h1>
                <p className="text-blue-100 mt-2">
                  Create a comprehensive profile with all necessary information
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {renderCurrentStep()}
          {renderNavigationButtons()}
        </form>
      </div>
    </div>
  )
}
