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

export const HeadteacherStats = memo(function HeadteacherStats({
  schoolStats: schoolStatsProp,
} = {}) {
  const ctx = useHeadteacher()
  const schoolStats = schoolStatsProp || ctx.schoolStats

  const percentText = (value) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'string' && value.trim() === '—') return '—'
    const num = Number(value)
    if (!Number.isFinite(num)) return '—'
    return `${num}%`
  }

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
          value={percentText(schoolStats.attendanceRate)}
          icon={CheckCircle}
          color="teal"
          description="School attendance"
          variant="flat"
        />
        <StatsCard
          title="Pass Rate"
          value={percentText(schoolStats.passRate)}
          icon={Award}
          color="indigo"
          description={
            schoolStats.selectedTerm
              ? `${schoolStats.selectedTerm}${schoolStats.selectedYear ? ` ${schoolStats.selectedYear}` : ''} only`
              : 'Selected term only'
          }
          variant="flat"
        />
      </div>
    </section>
  )
})
