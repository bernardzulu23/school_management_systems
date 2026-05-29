'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { Share2, Clock, CheckCircle2, XCircle, Download, Star } from 'lucide-react'

const STATUS_BADGE = {
  pending: { label: 'Pending review', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700', Icon: XCircle },
}

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.pending
  const { Icon } = cfg
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${cfg.cls}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  )
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [showAuthorName, setShowAuthorName] = useState(false)
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [subRes, planRes] = await Promise.all([
        api.getMyMarketplaceSubmissions(),
        api.get('/lesson-plans', { scope: 'mine' }),
      ])
      setSubmissions(subRes?.data?.data?.items || [])
      setPlans(planRes?.data?.data?.plans || [])
    } catch {
      setSubmissions([])
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sharedPlanIds = new Set(
    submissions.filter((s) => s.status !== 'rejected').map((s) => s.sourceLessonPlanId)
  )
  const shareablePlans = plans.filter((p) => !sharedPlanIds.has(p.id))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPlan) {
      toast.error('Select a lesson plan to share')
      return
    }
    setSubmitting(true)
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12)
      await api.submitMarketplaceMaterial({
        lessonPlanId: selectedPlan,
        showAuthorName,
        tags: tagList,
      })
      toast.success('Submitted for HOD review')
      setSelectedPlan('')
      setTags('')
      setShowAuthorName(false)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not submit material')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Share2 className="h-6 w-6 text-emerald-600" />
              My Marketplace Submissions
            </h1>
            <p className="text-sm text-gray-500">
              Share your approved lesson plans with teachers across Zambia.
            </p>
          </div>
          <Link href="/marketplace" className="text-sm text-emerald-600 hover:underline">
            Browse marketplace →
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Share a lesson plan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select one of your lesson plans…</option>
                {shareablePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.subject} • {p.grade} • {p.topic}
                  </option>
                ))}
              </select>

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma-separated, optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showAuthorName}
                  onChange={(e) => setShowAuthorName(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Show my name as the author
              </label>

              <Button type="submit" disabled={submitting || shareablePlans.length === 0}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </Button>
              {shareablePlans.length === 0 && !loading && (
                <p className="text-sm text-gray-500">
                  You have no lesson plans left to share. Create one first.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-gray-500">Loading…</p>
            ) : submissions.length === 0 ? (
              <p className="py-6 text-center text-gray-500">
                You haven&apos;t shared any materials yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {submissions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{s.title}</p>
                      <p className="text-sm text-gray-500">
                        {s.subject} • {s.form}
                      </p>
                      {s.status === 'rejected' && s.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600">Reason: {s.rejectionReason}</p>
                      )}
                      {s.status === 'approved' && (
                        <p className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Download className="h-3.5 w-3.5" />
                            {s.downloadCount}
                          </span>
                          {s.rating != null && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <Star className="h-3.5 w-3.5 fill-amber-400" />
                              {s.rating.toFixed(1)} ({s.ratingCount})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
