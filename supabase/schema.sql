-- Zambian School Management System Database Schema
-- For Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'hod', 'admin');
CREATE TYPE assessment_type AS ENUM ('quiz', 'test', 'exam', 'assignment', 'project');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE announcement_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    contact_number VARCHAR(20),
    address TEXT,
    profile_picture_url TEXT,
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- School Classes
CREATE TABLE school_classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    grade_level INTEGER NOT NULL,
    class_teacher_id UUID REFERENCES profiles(id),
    capacity INTEGER DEFAULT 40,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    grade_levels INTEGER[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students
CREATE TABLE students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES school_classes(id),
    student_id VARCHAR(50) UNIQUE,
    guardian_name VARCHAR(255),
    guardian_contact VARCHAR(20),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers
CREATE TABLE teachers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE,
    qualification VARCHAR(255),
    specialization VARCHAR(255),
    hire_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HODs (Heads of Department)
CREATE TABLE hods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    appointment_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessments
CREATE TABLE assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type assessment_type NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    class_id UUID REFERENCES school_classes(id),
    teacher_id UUID REFERENCES profiles(id),
    total_marks INTEGER NOT NULL DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE,
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Results
CREATE TABLE results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id),
    marks_obtained DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (SELECT total_marks FROM assessments WHERE id = assessment_id) > 0 
            THEN (marks_obtained / (SELECT total_marks FROM assessments WHERE id = assessment_id)) * 100
            ELSE 0
        END
    ) STORED,
    grade VARCHAR(2),
    remarks TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance
CREATE TABLE attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id),
    class_id UUID REFERENCES school_classes(id),
    subject_id UUID REFERENCES subjects(id),
    date DATE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'present',
    remarks TEXT,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id, subject_id, date)
);

-- Timetable
CREATE TABLE timetable (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES school_classes(id),
    subject_id UUID REFERENCES subjects(id),
    teacher_id UUID REFERENCES profiles(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'all',
    priority announcement_priority DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_assessments_class_id ON assessments(class_id);
CREATE INDEX idx_assessments_subject_id ON assessments(subject_id);
CREATE INDEX idx_results_student_id ON results(student_id);
CREATE INDEX idx_results_assessment_id ON results(assessment_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_timetable_class_id ON timetable(class_id);
CREATE INDEX idx_announcements_target_audience ON announcements(target_audience);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hods ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on requirements)
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
