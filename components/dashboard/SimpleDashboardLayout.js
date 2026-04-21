'use client'

import React, { useMemo, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import { Button } from '@/components/ui/Button'
import { LogOut, MessageSquare, User as UserIcon, X } from 'lucide-react'
import Link from 'next/link'
import ProfilePictureDisplay from '@/components/ui/ProfilePictureDisplay'
import { TimetableNotificationBell } from '@/components/timetable/MasterTimetableGenerator'
import toast from 'react-hot-toast'

export function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth()
  const { school } = useSchool()
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    category: 'general',
    rating: '',
    isPublic: false,
    message: '',
  })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const roleLabel = user?.role
    ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()} Dashboard`
    : 'Dashboard'

  const feedbackCategories = useMemo(
    () => [
      { value: 'general', label: 'General' },
      { value: 'usability', label: 'Usability' },
      { value: 'feature', label: 'Feature request' },
      { value: 'bug', label: 'Bug report' },
      { value: 'other', label: 'Other' },
    ],
    []
  )

  const plan = String(school?.plan || '')
    .trim()
    .toLowerCase()
  const trialEndsAt = school?.trialEndsAt ? new Date(school.trialEndsAt) : null
  const planExpiresAt = school?.planExpiresAt ? new Date(school.planExpiresAt) : null
  const now = new Date()
  const expiresAt = plan === 'trial' ? trialEndsAt : planExpiresAt
  const msLeft = expiresAt ? expiresAt.getTime() - now.getTime() : null
  const daysLeft = typeof msLeft === 'number' ? Math.ceil(msLeft / (24 * 60 * 60 * 1000)) : null
  const isExpired = typeof msLeft === 'number' ? msLeft < 0 : false
  const shouldWarn =
    plan === 'trial' && typeof daysLeft === 'number' && daysLeft >= 0 && daysLeft <= 7

  const submitFeedback = async () => {
    const message = String(feedbackForm.message || '').trim()
    if (message.length < 3) {
      toast.error('Feedback message must be at least 3 characters')
      return
    }

    const ratingNumber = feedbackForm.rating ? Number(feedbackForm.rating) : null
    if (
      feedbackForm.rating &&
      (Number.isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5)
    ) {
      toast.error('Rating must be between 1 and 5')
      return
    }

    setSubmittingFeedback(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: feedbackForm.category,
          rating: ratingNumber,
          isPublic: feedbackForm.isPublic,
          message,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to submit feedback')
      toast.success('Feedback submitted')
      setFeedbackForm({ category: 'general', rating: '', isPublic: false, message: '' })
      setShowFeedback(false)
    } catch (e) {
      toast.error(e?.message || 'Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  return (
    <div className="min-h-screen bg-royalPurple-page transition-colors duration-200">
      <header className="bg-royalPurple-deep border-b border-royalPurple-border transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-royalPurple-text1">
                Zambian School Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-royalPurple-text2 font-medium">{roleLabel}</span>
              {title && String(title).trim() !== String(roleLabel).trim() && (
                <span className="text-sm text-royalPurple-text3">| {title}</span>
              )}
              {['headteacher', 'admin', 'administrator', 'superadmin'].includes(
                String(user?.role || '')
                  .trim()
                  .toLowerCase()
              ) && <TimetableNotificationBell />}
              <button
                type="button"
                onClick={() => setShowFeedback(true)}
                className="inline-flex items-center gap-2 h-10 px-3 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors font-medium"
                aria-label="Open feedback"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback</span>
              </button>
              {(user?.teacherProfile || String(user?.role || '').toLowerCase() === 'teacher') && (
                <Link
                  href="/dashboard/teacher"
                  className="inline-flex items-center h-10 px-3 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors font-medium"
                >
                  Teacher Dashboard
                </Link>
              )}
              {(user?.hodProfile || String(user?.role || '').toLowerCase() === 'hod') && (
                <Link
                  href="/dashboard/hod"
                  className="inline-flex items-center h-10 px-3 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors font-medium"
                >
                  HOD Dashboard
                </Link>
              )}
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center gap-2 h-10 px-3 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors"
                aria-label="Open profile"
              >
                {user?.profile_picture_url || user?.name ? (
                  <ProfilePictureDisplay
                    src={user?.profile_picture_url}
                    alt={user?.name || 'Profile picture'}
                    name={user?.name || ''}
                    role={String(user?.role || 'student').toLowerCase()}
                    size="sm"
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
                <span className="hidden sm:inline font-medium">Profile</span>
              </Link>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-royalPurple-dangerTx hover:bg-royalPurple-card2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-4">
          {shouldWarn && expiresAt ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-amber-500 font-semibold">
                  Free trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'} (
                  {expiresAt.toLocaleDateString()})
                </div>
                <a href="/dashboard/billing" className="text-sm font-bold text-amber-500 underline">
                  Upgrade now
                </a>
              </div>
            </div>
          ) : null}

          {isExpired && expiresAt ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6">
              <div className="text-red-400 font-bold">Your access has expired</div>
              <div className="text-sm text-royalPurple-text2 mt-1">
                Your {plan === 'trial' ? 'free trial' : 'subscription'} expired on{' '}
                {expiresAt.toLocaleDateString()}. Upgrade to restore access.
              </div>
              <div className="mt-4">
                <a href="/dashboard/billing" className="text-sm font-bold text-red-300 underline">
                  Go to Billing
                </a>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (!submittingFeedback ? setShowFeedback(false) : null)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-royalPurple-border bg-royalPurple-deep shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-royalPurple-border">
              <div>
                <h2 className="text-lg font-semibold text-royalPurple-text1">Send feedback</h2>
                <p className="text-sm text-royalPurple-text3">Help us improve the system.</p>
              </div>
              <button
                type="button"
                onClick={() => (!submittingFeedback ? setShowFeedback(false) : null)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors"
                aria-label="Close feedback"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-royalPurple-text2 mb-1">Category</label>
                  <select
                    className="w-full input"
                    value={feedbackForm.category}
                    disabled={submittingFeedback}
                    onChange={(e) => setFeedbackForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {feedbackCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-royalPurple-text2 mb-1">
                    Rating (optional)
                  </label>
                  <select
                    className="w-full input"
                    value={feedbackForm.rating}
                    disabled={submittingFeedback}
                    onChange={(e) => setFeedbackForm((p) => ({ ...p, rating: e.target.value }))}
                  >
                    <option value="">No rating</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">Message</label>
                <textarea
                  className="w-full input min-h-[120px]"
                  value={feedbackForm.message}
                  disabled={submittingFeedback}
                  onChange={(e) => setFeedbackForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Write your feedback…"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-royalPurple-text2">
                <input
                  type="checkbox"
                  checked={feedbackForm.isPublic}
                  disabled={submittingFeedback}
                  onChange={(e) => setFeedbackForm((p) => ({ ...p, isPublic: e.target.checked }))}
                />
                Allow this feedback to appear on the public landing page
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-royalPurple-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFeedback(false)}
                disabled={submittingFeedback}
              >
                Cancel
              </Button>
              <Button type="button" onClick={submitFeedback} disabled={submittingFeedback}>
                {submittingFeedback ? 'Sending…' : 'Send feedback'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Simple footer */}
      <footer className="bg-royalPurple-deep border-t border-royalPurple-border mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 text-center text-sm text-royalPurple-text2">
            2025 Zambian School Management System - Empowering Rural Education
          </div>
        </div>
      </footer>
    </div>
  )
}
