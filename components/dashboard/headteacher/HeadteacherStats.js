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
    <section className="w-full py-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-x-10 gap-y-6">
        <StatsCard
          title="Students"
          value={schoolStats.totalStudents}
          icon={Users}
          color="blue"
          description="Total enrolled"
          variant="flat"
        />
        <StatsCard
          title="Teachers"
          value={schoolStats.totalTeachers}
          icon={UserPlus}
          color="green"
          description="Active staff"
          variant="flat"
        />
        <StatsCard
          title="HODs"
          value={schoolStats.totalHODs}
          icon={UserCheck}
          color="purple"
          description="Department heads"
          variant="flat"
        />
        <StatsCard
          title="Classes"
          value={schoolStats.totalClasses}
          icon={GraduationCap}
          color="yellow"
          description="Active classes"
          variant="flat"
        />
        <StatsCard
          title="Subjects"
          value={schoolStats.totalSubjects}
          icon={BookOpen}
          color="orange"
          description="Available subjects"
          variant="flat"
        />
        <StatsCard
          title="Attendance"
          value={`${Number(schoolStats.attendanceRate) || 0}%`}
          icon={CheckCircle}
          color="teal"
          description="School attendance"
          variant="flat"
        />
        <StatsCard
          title="Pass Rate"
          value={`${Number(schoolStats.passRate) || 0}%`}
          icon={Award}
          color="indigo"
          description="Overall pass rate"
          variant="flat"
        />
      </div>
    </section>
  )
})
