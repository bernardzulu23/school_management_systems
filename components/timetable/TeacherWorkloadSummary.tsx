'use client'

export type WorkloadSubject = {
  subjectId?: string
  subjectName: string
  classes: string[]
  periods: number
}

export type WorkloadRow = {
  teacherId: string
  teacherName: string
  totalPeriods: number
  subjects: WorkloadSubject[]
}

export function TeacherWorkloadSummary({
  summaries,
  title = 'Your teaching load',
}: {
  summaries: WorkloadRow[]
  title?: string
}) {
  if (!summaries?.length) {
    return (
      <div className="onboard-card p-4 text-sm text-royalPurple-text2">
        No published timetable yet. Your HOD must submit allocations and admin must publish the
        master timetable.
      </div>
    )
  }

  return (
    <div className="onboard-card p-5 space-y-4">
      <div className="text-royalPurple-text1 font-bold text-lg">{title}</div>
      {summaries.map((row) => (
        <div
          key={row.teacherId}
          className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <span className="font-semibold text-royalPurple-text1">{row.teacherName}</span>
            <span className="text-sm text-royalPurple-text3">{row.totalPeriods} periods/week</span>
          </div>
          <ul className="space-y-2">
            {row.subjects.map((s) => (
              <li key={`${row.teacherId}-${s.subjectId || s.subjectName}`} className="text-sm">
                <span className="font-medium text-royalPurple-text1">{s.subjectName}</span>
                <span className="text-royalPurple-text3">
                  {' '}
                  — {s.classes.join(', ') || 'No classes'} ({s.periods} periods)
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
