import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database helper functions
export const db = {
  // Profiles
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Students
  async getStudents(classId = null) {
    let query = supabase
      .from('students')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          contact_number,
          profile_picture_url
        ),
        school_classes:class_id (
          id,
          name,
          grade_level
        )
      `)
    
    if (classId) {
      query = query.eq('class_id', classId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Teachers
  async getTeachers() {
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          contact_number,
          profile_picture_url
        )
      `)

    if (error) throw error
    return data
  },

  // HODs (Heads of Department)
  async getHods() {
    const { data, error } = await supabase
      .from('hods')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          contact_number,
          profile_picture_url
        ),
        created_by_profile:created_by (
          id,
          name
        )
      `)

    if (error) throw error
    return data
  },

  async createHod(hodData) {
    const { data, error } = await supabase
      .from('hods')
      .insert(hodData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateHod(hodId, updates) {
    const { data, error } = await supabase
      .from('hods')
      .update(updates)
      .eq('id', hodId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteHod(hodId) {
    const { error } = await supabase
      .from('hods')
      .delete()
      .eq('id', hodId)

    if (error) throw error
    return true
  },

  // Classes
  async getClasses() {
    const { data, error } = await supabase
      .from('school_classes')
      .select(`
        *,
        class_teacher:class_teacher_id (
          id,
          name
        )
      `)
      .eq('status', 'active')
    
    if (error) throw error
    return data
  },

  // Subjects
  async getSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('status', 'active')
    
    if (error) throw error
    return data
  },

  // Assessments
  async getAssessments(classId = null, teacherId = null) {
    let query = supabase
      .from('assessments')
      .select(`
        *,
        subject:subject_id (
          id,
          name,
          code
        ),
        class:class_id (
          id,
          name,
          grade_level
        ),
        teacher:teacher_id (
          id,
          name
        )
      `)
    
    if (classId) query = query.eq('class_id', classId)
    if (teacherId) query = query.eq('teacher_id', teacherId)
    
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Results
  async getResults(studentId = null, assessmentId = null) {
    let query = supabase
      .from('results')
      .select(`
        *,
        assessment:assessment_id (
          id,
          title,
          type,
          total_marks
        ),
        student:student_id (
          id,
          name
        )
      `)
    
    if (studentId) query = query.eq('student_id', studentId)
    if (assessmentId) query = query.eq('assessment_id', assessmentId)
    
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Attendance
  async getAttendance(studentId = null, classId = null, date = null) {
    let query = supabase
      .from('attendance')
      .select(`
        *,
        student:student_id (
          id,
          name
        ),
        class:class_id (
          id,
          name
        ),
        subject:subject_id (
          id,
          name
        )
      `)
    
    if (studentId) query = query.eq('student_id', studentId)
    if (classId) query = query.eq('class_id', classId)
    if (date) query = query.eq('date', date)
    
    const { data, error } = await query.order('date', { ascending: false })
    if (error) throw error
    return data
  },

  // Announcements
  async getAnnouncements(targetAudience = null) {
    let query = supabase
      .from('announcements')
      .select(`
        *,
        created_by_profile:created_by (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
    
    if (targetAudience) {
      query = query.or(`target_audience.eq.all,target_audience.eq.${targetAudience}`)
    }
    
    const { data, error } = await query.order('priority', { ascending: false }).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Timetable
  async getTimetable(classId = null, teacherId = null) {
    let query = supabase
      .from('timetable')
      .select(`
        *,
        class:class_id (
          id,
          name
        ),
        subject:subject_id (
          id,
          name,
          code
        ),
        teacher:teacher_id (
          id,
          name
        )
      `)
      .eq('status', 'active')
    
    if (classId) query = query.eq('class_id', classId)
    if (teacherId) query = query.eq('teacher_id', teacherId)
    
    const { data, error } = await query.order('day_of_week').order('start_time')
    if (error) throw error
    return data
  },

  // Dashboard stats
  async getDashboardStats() {
    const [
      { count: totalStudents },
      { count: totalTeachers },
      { count: totalHods },
      { count: totalClasses },
      { count: totalSubjects },
      { count: totalAssessments }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'hod'),
      supabase.from('school_classes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('assessments').select('*', { count: 'exact', head: true })
    ])

    return {
      totalStudents,
      totalTeachers,
      totalHods,
      totalClasses,
      totalSubjects,
      totalAssessments
    }
  }
}

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to attendance changes
  subscribeToAttendance(callback, classId = null) {
    let channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance',
          filter: classId ? `class_id=eq.${classId}` : undefined
        }, 
        callback
      )
      .subscribe()
    
    return () => supabase.removeChannel(channel)
  },

  // Subscribe to announcements
  subscribeToAnnouncements(callback) {
    let channel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcements'
        }, 
        callback
      )
      .subscribe()
    
    return () => supabase.removeChannel(channel)
  },

  // Subscribe to results
  subscribeToResults(callback, studentId = null) {
    let channel = supabase
      .channel('results-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'results',
          filter: studentId ? `student_id=eq.${studentId}` : undefined
        }, 
        callback
      )
      .subscribe()
    
    return () => supabase.removeChannel(channel)
  }
}
