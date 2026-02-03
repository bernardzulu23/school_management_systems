import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const data = await request.json()
    const { 
      name, 
      email, 
      password, 
      role, 
      
      // Common basic info
      contact_number,
      address,
      date_of_birth,
      gender,
      profile_picture_url,

      // Teacher specific
      ts_number,
      employee_id, // Also for HOD
      department, // Teacher
      department_name, // HOD
      qualifications, // Teacher
      qualification, // HOD
      experience_years,
      assigned_subjects, 
      assigned_classes,

      // Student specific
      student_id,
      exam_number,
      year_group, 
      section, 
      previous_school,
      grade_average,
      selected_subjects,
      
      // Parent/Guardian Info
      parent_father_name,
      parent_father_contact,
      parent_father_email,
      parent_mother_name,
      parent_mother_contact,
      parent_mother_email,
      guardian_name,
      guardian_contact,
      guardian_email,
      guardian_relationship,
      guardian_address,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      emergency_contact_address,
      
      // Medical Info
      blood_type,
      medical_aid_scheme,
      medical_aid_number,
      family_doctor_name,
      family_doctor_contact,
      medical_conditions,
      allergies,

      // HOD specific
      specialization,
      hire_date,
      appointment_date,
      salary,
      bio,
      years_as_hod,
      subjects_managed,
      teachers_supervised,
      management_areas,
      performance_rating
    } = data

    // Basic validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Helper to process array or comma-separated string
    const processArrayField = (value) => {
      if (Array.isArray(value)) return value
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.split(',').map(s => s.trim())
      }
      return []
    }

    // Helper to process date
    const processDate = (value) => {
      if (!value) return null
      return new Date(value)
    }

    // Start transaction to create user and profile
    const result = await prisma.$transaction(async (prisma) => {
      // Create User with basic info
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          contact_number,
          address,
          date_of_birth: processDate(date_of_birth),
          gender,
          profile_picture_url
        }
      })

      // Create Profile based on role
      if (role === 'teacher') {
        await prisma.teacher.create({
          data: {
            userId: user.id,
            ts_number,
            employee_id,
            department,
            qualifications,
            experience_years: experience_years ? parseInt(experience_years) : null,
            subjects: processArrayField(assigned_subjects),
            assigned_classes: processArrayField(assigned_classes)
          }
        })
      } else if (role === 'student') {
        // Construct class from year_group and section
        const studentClass = (year_group && section) ? `${year_group}${section}` : (data.custom_class || 'Unknown')
        
        await prisma.student.create({
          data: {
            userId: user.id,
            name: name, // Student model has name field too
            class: studentClass,
            exam_number,
            previous_school,
            grade_average: grade_average ? parseFloat(grade_average) : null,
            selected_subjects: processArrayField(selected_subjects),
            
            // Parent/Guardian
            parent_father_name,
            parent_father_contact,
            parent_father_email,
            parent_mother_name,
            parent_mother_contact,
            parent_mother_email,
            guardian_name,
            guardian_contact,
            guardian_email,
            guardian_relationship,
            guardian_address,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            emergency_contact_address,
            
            // Medical
            blood_type,
            medical_aid_scheme,
            medical_aid_number,
            family_doctor_name,
            family_doctor_contact,
            medical_conditions,
            allergies
          }
        })
      } else if (role === 'hod') {
        await prisma.headOfDepartment.create({
          data: {
            userId: user.id,
            employee_id,
            department_name,
            qualification,
            specialization,
            hire_date: processDate(hire_date),
            appointment_date: processDate(appointment_date),
            salary: salary ? parseFloat(salary) : null,
            bio,
            years_experience: experience_years ? parseInt(experience_years) : null,
            years_as_hod: years_as_hod ? parseInt(years_as_hod) : null,
            subjects_managed: processArrayField(subjects_managed),
            teachers_supervised: teachers_supervised ? parseInt(teachers_supervised) : null,
            management_areas: processArrayField(management_areas),
            performance_rating: performance_rating ? parseFloat(performance_rating) : null
          }
        })
      }
      
      return user
    })

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
