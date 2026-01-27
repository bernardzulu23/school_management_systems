-- Seed Data for Zambian School Management System

-- 1. Insert Subjects
INSERT INTO subjects (name, code, description, grade_levels) VALUES
('Mathematics', 'MATH', 'General Mathematics', '{8,9,10,11,12}'),
('English Language', 'ENG', 'English Language and Literature', '{8,9,10,11,12}'),
('Integrated Science', 'SCI', 'Integrated Science', '{8,9}'),
('Biology', 'BIO', 'Biology', '{10,11,12}'),
('Chemistry', 'CHEM', 'Chemistry', '{10,11,12}'),
('Physics', 'PHY', 'Physics', '{10,11,12}'),
('Social Studies', 'SOC', 'Social Studies', '{8,9}'),
('Civic Education', 'CIV', 'Civic Education', '{10,11,12}'),
('History', 'HIS', 'History', '{10,11,12}'),
('Geography', 'GEO', 'Geography', '{10,11,12}'),
('Computer Studies', 'COMP', 'Computer Studies', '{8,9,10,11,12}'),
('Agricultural Science', 'AGRI', 'Agricultural Science', '{8,9,10,11,12}'),
('Home Economics', 'HE', 'Home Economics', '{8,9,10,11,12}');

-- 2. Insert Classes
INSERT INTO school_classes (name, grade_level, capacity) VALUES
('Grade 8A', 8, 45),
('Grade 8B', 8, 45),
('Grade 9A', 9, 45),
('Grade 9B', 9, 45),
('Grade 10A', 10, 40),
('Grade 10B', 10, 40),
('Grade 11A', 11, 40),
('Grade 11B', 11, 40),
('Grade 12A', 12, 35),
('Grade 12B', 12, 35);

-- 3. Insert Welcome Announcement
INSERT INTO announcements (title, content, target_audience, priority, is_active) VALUES
('Welcome to Term 1 2026', 'Welcome back to school! Term 1 classes begin on Monday. Please ensure all school fees are paid.', 'all', 'high', true),
('Staff Meeting', 'All teachers to meet in the staff room at 08:00hrs on Monday.', 'teacher', 'medium', true);

-- 4. Instructions for Creating Initial Users
/*
To create your first admin/headteacher:
1. Go to Authentication > Users in your Supabase Dashboard.
2. Click "Add User" and create a new user (e.g., headteacher@school.com).
3. Go to the SQL Editor and run:

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'headteacher@school.com';

This will grant the user full administrative privileges.
*/
