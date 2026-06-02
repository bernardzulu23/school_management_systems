# Database index checklist

Auto-generated from `prisma/schema.prisma`. Run `node scripts/generate-db-index-checklist.mjs` to refresh.

| Model                    | schoolId indexed | Other missing indexes         |
| ------------------------ | ---------------- | ----------------------------- |
| Activity                 | yes              | —                             |
| ActivityParticipant      | yes              | userId                        |
| AIRequest                | yes              | —                             |
| AIUsageLog               | yes              | —                             |
| AllocationNotification   | yes              | —                             |
| Assessment               | yes              | —                             |
| Assignment               | yes              | teacherId                     |
| AssignmentSubmission     | yes              | studentId                     |
| Attendance               | yes              | —                             |
| AttendanceMark           | yes              | studentId                     |
| AttendanceSession        | yes              | subjectId                     |
| AuditLog                 | yes              | —                             |
| Badge                    | yes              | —                             |
| BookLoan                 | yes              | —                             |
| Class                    | yes              | teacherId                     |
| Classroom                | yes              | —                             |
| Constraint               | yes              | —                             |
| CreativeFeature          | yes              | —                             |
| Department               | yes              | —                             |
| DepartmentAllocation     | yes              | —                             |
| EczAssessment            | yes              | —                             |
| EczAssessmentScore       | yes              | —                             |
| EczSubmission            | yes              | subjectId                     |
| Feedback                 | yes              | —                             |
| FieldTrip                | yes              | —                             |
| Game                     | yes              | —                             |
| GamificationProfile      | yes              | studentId                     |
| Goal                     | yes              | —                             |
| HeadOfDepartment         | yes              | userId                        |
| LessonPlan               | yes              | —                             |
| MasterTimetableEntry     | yes              | —                             |
| MaterialChunk            | yes              | —                             |
| MockExamAttempt          | yes              | —                             |
| Note                     | yes              | —                             |
| PupilSubjectEnrollment   | yes              | subjectId                     |
| QuestionBank             | yes              | —                             |
| RefreshToken             | yes              | —                             |
| Result                   | yes              | —                             |
| ResultsStatus            | yes              | —                             |
| SchedulingRecipe         | yes              | classId, subjectId, teacherId |
| SchoolMaterial           | yes              | —                             |
| SchoolPlanPayment        | yes              | —                             |
| SchoolSmsSettings        | **MISSING**      | —                             |
| SharedMaterial           | yes              | —                             |
| SmsBroadcast             | yes              | —                             |
| SmsLog                   | yes              | —                             |
| SmsQueueItem             | yes              | —                             |
| SpecialAccommodation     | yes              | —                             |
| StrategicGoal            | yes              | —                             |
| StrategicReview          | yes              | —                             |
| Student                  | yes              | userId                        |
| StudentBadge             | yes              | studentId                     |
| StudentFlashcardDeck     | yes              | subjectId                     |
| StudentGame              | **MISSING**      | studentId                     |
| StudentMaterial          | yes              | studentId                     |
| StudentWork              | yes              | —                             |
| StudyMaterial            | yes              | —                             |
| Subject                  | yes              | classId, teacherId            |
| Substitution             | yes              | —                             |
| Teacher                  | yes              | userId                        |
| TeacherAllocation        | yes              | classId, subjectId, teacherId |
| TeacherColor             | yes              | teacherId                     |
| TeacherPeriodAssignment  | yes              | —                             |
| TeacherTermProgress      | yes              | —                             |
| TeachingAssignment       | yes              | classId, subjectId            |
| TermReport               | yes              | classId, studentId            |
| TimeSlot                 | yes              | —                             |
| TimetableAllocationEntry | yes              | classId, subjectId, teacherId |
| TimetableConfig          | **MISSING**      | —                             |
| TimetableEntry           | yes              | —                             |
| TimetableNotification    | yes              | —                             |
| TimetableVersion         | yes              | —                             |
| User                     | yes              | —                             |
