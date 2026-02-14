/**
 * Database Indexes Documentation
 * 
 * This file documents the indexes implemented in the Prisma schema to optimize
 * query performance for the School Management System.
 */

export const indexes = {
  School: [
    'subdomain (unique/lookup)',
    'active (filtering schools)'
  ],
  User: [
    '[schoolId, email] (unique per school login)',
    'schoolId (multi-tenancy partitioning)',
    'role (permission-based filtering)'
  ],
  Student: [
    'schoolId (multi-tenancy)',
    'class (filtering by class/grade)',
    'name (search/sorting)',
    'grade_average (performance tracking)',
    '[schoolId, exam_number] (unique identifier per school)'
  ],
  Teacher: [
    'schoolId (multi-tenancy)',
    'department (departmental filtering/stats)'
  ],
  Class: [
    'schoolId (multi-tenancy)',
    'year_group (grade-level filtering)',
    '[schoolId, name] (unique class names per school)'
  ],
  Subject: [
    'schoolId (multi-tenancy)',
    'name (subject search)',
    '[schoolId, code] (unique subject codes per school)'
  ],
  Result: [
    'schoolId (multi-tenancy)',
    'studentId (student report cards)',
    'subjectId (subject-specific analysis)',
    'score (performance range filtering)',
    '[term, year] (seasonal reporting)'
  ],
  StudentWork: [
    'schoolId (multi-tenancy)',
    'studentId (portfolio view)',
    'type (category filtering: art, science, etc.)',
    'createdAt (recent works sorting)'
  ],
  Goal: [
    'schoolId (multi-tenancy)',
    'studentId (individual goal tracking)',
    'status (pending/completed filtering)'
  ],
  Activity: [
    'schoolId (multi-tenancy)',
    'type (event type filtering)',
    'date (calendar views/upcoming events)'
  ],
  Assessment: [
    'schoolId (multi-tenancy)',
    'subject (subject-specific exams)',
    'class (class-specific schedules)',
    'date (upcoming assessment alerts)'
  ],
  Attendance: [
    'schoolId (multi-tenancy)',
    'studentId (individual attendance tracking)',
    'date (daily records)',
    '[studentId, date] (unique record per student per day)'
  ],
  Assignment: [
    'schoolId (multi-tenancy)',
    'dueDate (upcoming deadlines)'
  ],
  FieldTrip: [
    'schoolId (multi-tenancy)',
    'date (upcoming trips)'
  ]
};
