'use client'

import {
  TIMETABLE_TERMS,
  getAcademicYearOptions,
  getDefaultAcademicYear,
  getDefaultTerm,
} from '@/lib/timetable/timetableTermOptions'

/**
 * Term + academic year selectors for read-only timetable pages.
 * Must match values used when the headteacher generates/publishes the master timetable.
 */
export function TimetableTermFilters({
  term,
  academicYear,
  onTermChange,
  onAcademicYearChange,
  loading = false,
  className = '',
}) {
  const yearOptions = getAcademicYearOptions()
  const years =
    academicYear && !yearOptions.includes(academicYear)
      ? [...yearOptions, academicYear].sort()
      : yearOptions

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 ${className}`}
    >
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Term</label>
        <select
          className="zsms-select min-w-[120px]"
          value={term || getDefaultTerm()}
          onChange={(e) => onTermChange(e.target.value)}
          disabled={loading}
        >
          {TIMETABLE_TERMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Academic year</label>
        <select
          className="zsms-select min-w-[100px]"
          value={academicYear || getDefaultAcademicYear()}
          onChange={(e) => onAcademicYearChange(e.target.value)}
          disabled={loading}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <span className="text-xs text-ink/50 pb-2">Loading timetable…</span>
      ) : (
        <p className="text-xs text-ink/50 pb-2 max-w-md">
          Published schedule for {term} {academicYear}. If empty, ask your headteacher to publish
          that term.
        </p>
      )}
    </div>
  )
}
