import React, { memo } from 'react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import {
  Users,
  UserPlus,
  UserCheck,
  GraduationCap,
  BookOpen,
  CheckCircle,
  Award,
} from 'lucide-react'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'

export const HeadteacherStats = memo(function HeadteacherStats() {
  const { schoolStats } = useHeadteacher()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      <StatsCard
        title="Students"
        value={schoolStats.totalStudents}
        icon={Users}
        color="blue"
        description="Total enrolled"
        trend={{ isPositive: true, value: 12 }}
      />
      <StatsCard
        title="Teachers"
        value={schoolStats.totalTeachers}
        icon={UserPlus}
        color="green"
        description="Active staff"
        trend={{ isPositive: true, value: 2 }}
      />
      <StatsCard
        title="HODs"
        value={schoolStats.totalHODs}
        icon={UserCheck}
        color="purple"
        description="Department heads"
        trend={{ isPositive: false, value: 1 }}
      />
      <StatsCard
        title="Classes"
        value={schoolStats.totalClasses}
        icon={GraduationCap}
        color="yellow"
        description="Active classes"
        trend={{ isPositive: true, value: 3 }}
      />
      <StatsCard
        title="Subjects"
        value={schoolStats.totalSubjects}
        icon={BookOpen}
        color="orange"
        description="Available subjects"
        trend={{ isPositive: true, value: 2 }}
      />
      <StatsCard
        title="Attendance"
        value={`${schoolStats.attendanceRate}%`}
        icon={CheckCircle}
        color="teal"
        description="School attendance"
        trend={{ isPositive: true, value: 2.5 }}
      />
      <StatsCard
        title="Pass Rate"
        value={`${schoolStats.passRate}%`}
        icon={Award}
        color="indigo"
        description="Overall pass rate"
        trend={{ isPositive: true, value: 4.2 }}
      />
    </div>
  )
})
