'use client'

import { AlertCircle, ChevronRight, Download, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

export type TeacherPerformanceRow = {
  id: string
  teacherId: string
  teacherName?: string | null
  teacherEmail?: string | null
  completionRate: number
  averageMasteryScore: number
  topicsNeedingReteach: number
  totalSchemesAssigned: number
  totalWeeksPlanned?: number
  totalWeeksCompleted?: number
  topicsNeedingReteachDetails: Array<{
    id: string
    topicName: string
    averageMasteryScore: number
    studentCount?: number
  }>
}

type TeacherPerformanceCardProps = {
  teacher: TeacherPerformanceRow
  isExpanded: boolean
  onToggleExpand: () => void
  onDownloadReport: () => void
  onSendFeedback: () => void
}

function getCompletionStatus(rate: number) {
  if (rate >= 80) return { text: 'On Track', color: 'text-green-700' }
  if (rate >= 60) return { text: 'At Risk', color: 'text-yellow-700' }
  return { text: 'Behind', color: 'text-red-700' }
}

function getMasteryStatus(score: number) {
  if (score >= 75) return { text: 'Excellent', color: 'text-green-700' }
  if (score >= 60) return { text: 'Satisfactory', color: 'text-yellow-700' }
  return { text: 'Needs Support', color: 'text-red-700' }
}

export function getRecommendation(completion: number, mastery: number): string {
  if (completion < 50) {
    return `${completion.toFixed(0)}% scheme coverage is behind pace. Accelerate teaching to catch up on ${(100 - completion).toFixed(0)}% remaining content.`
  }
  if (mastery < 60) {
    return `Student mastery is ${mastery.toFixed(0)}%, below target. Focus on reinforcing weak topics with additional practice and review.`
  }
  if (completion >= 80 && mastery >= 75) {
    return 'Excellent progress! On track for completion with strong student understanding. Continue current approach.'
  }
  if (completion >= 80 && mastery >= 60) {
    return 'Good completion rate. Focus on improving student mastery through targeted interventions on low-performing topics.'
  }
  return `Mixed results: ${completion.toFixed(0)}% coverage, ${mastery.toFixed(0)}% mastery. Balance pacing with consolidation.`
}

export function TeacherPerformanceCard({
  teacher,
  isExpanded,
  onToggleExpand,
  onDownloadReport,
  onSendFeedback,
}: TeacherPerformanceCardProps) {
  const completionStatus = getCompletionStatus(teacher.completionRate)
  const masteryStatus = getMasteryStatus(teacher.averageMasteryScore)
  const displayName = teacher.teacherName || teacher.teacherEmail || teacher.teacherId

  return (
    <Card className={isExpanded ? 'border-sky-200 bg-sky-50/40' : ''}>
      <CardContent className="pt-6">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 text-left"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
        >
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {teacher.totalSchemesAssigned} scheme
              {teacher.totalSchemesAssigned === 1 ? '' : 's'} assigned this term
              {teacher.totalWeeksPlanned != null
                ? ` · ${teacher.totalWeeksCompleted ?? 0}/${teacher.totalWeeksPlanned} weeks`
                : ''}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{teacher.completionRate.toFixed(0)}%</div>
              <p className={`text-xs font-medium ${completionStatus.color}`}>
                {completionStatus.text}
              </p>
              <p className="text-xs text-muted-foreground">Completion</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold">{teacher.averageMasteryScore.toFixed(0)}%</div>
              <p className={`text-xs font-medium ${masteryStatus.color}`}>{masteryStatus.text}</p>
              <p className="text-xs text-muted-foreground">Mastery</p>
            </div>

            {teacher.topicsNeedingReteach > 0 && (
              <div className="hidden text-center sm:block">
                <div className="text-2xl font-bold text-orange-600">
                  {teacher.topicsNeedingReteach}
                </div>
                <p className="text-xs font-medium text-orange-700">Topics</p>
                <p className="text-xs text-muted-foreground">Reteach</p>
              </div>
            )}

            <ChevronRight
              className={`h-5 w-5 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="mt-6 space-y-4 border-t pt-6">
            <div>
              <div className="mb-2 flex justify-between">
                <span className="text-sm font-medium">Scheme Completion</span>
                <span className="text-sm text-muted-foreground">
                  {teacher.completionRate.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-sky-500"
                  style={{ width: `${Math.min(100, Math.max(0, teacher.completionRate))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between">
                <span className="text-sm font-medium">Student Mastery Average</span>
                <span className="text-sm text-muted-foreground">
                  {teacher.averageMasteryScore.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, teacher.averageMasteryScore))}%`,
                  }}
                />
              </div>
            </div>

            {teacher.topicsNeedingReteachDetails?.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="mb-2 flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <h4 className="font-medium text-red-900">Topics Needing Reteaching</h4>
                </div>
                <ul className="ml-6 space-y-1">
                  {teacher.topicsNeedingReteachDetails.map((topic) => (
                    <li key={topic.id} className="text-sm text-red-800">
                      <strong>{topic.topicName}</strong>: {topic.averageMasteryScore.toFixed(0)}%
                      mastery
                      {topic.studentCount != null ? ` · ${topic.studentCount} students` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
              <h4 className="mb-2 font-medium text-sky-900">Recommendation</h4>
              <p className="text-sm text-sky-800">
                {getRecommendation(teacher.completionRate, teacher.averageMasteryScore)}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onDownloadReport}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onSendFeedback}
                className="flex-1"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Feedback
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function generatePerformanceCSV(teacher: TeacherPerformanceRow): string {
  const lines: string[][] = [
    ['Teacher Performance Report'],
    ['Teacher', teacher.teacherName || teacher.teacherId],
    ['Teacher ID', teacher.teacherId],
    ['Date', new Date().toLocaleDateString()],
    [''],
    ['Metric', 'Value'],
    ['Completion Rate', `${teacher.completionRate.toFixed(0)}%`],
    ['Average Mastery', `${teacher.averageMasteryScore.toFixed(0)}%`],
    ['Schemes Assigned', String(teacher.totalSchemesAssigned)],
    ['Topics Needing Reteach', String(teacher.topicsNeedingReteach)],
    [''],
    ['Topics Needing Reteaching'],
  ]

  if (teacher.topicsNeedingReteachDetails?.length) {
    lines.push(['Topic', 'Mastery Score', 'Student Count'])
    for (const topic of teacher.topicsNeedingReteachDetails) {
      lines.push([
        topic.topicName,
        `${topic.averageMasteryScore.toFixed(0)}%`,
        String(topic.studentCount ?? ''),
      ])
    }
  }

  return lines
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}
