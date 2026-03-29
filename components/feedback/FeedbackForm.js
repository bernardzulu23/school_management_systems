'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { MessageSquare, Send, Star } from 'lucide-react'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'usability', label: 'Usability' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
]

export default function FeedbackForm() {
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [rating, setRating] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || message.trim().length < 3) {
      toast.error('Please enter at least 3 characters')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          category,
          rating: rating || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }
      toast.success('Thank you! Your feedback has been submitted.')
      setMessage('')
      setCategory('general')
      setRating(null)
    } catch (err) {
      toast.error(err.message || 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Share Your Feedback
        </CardTitle>
        <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">
          Help us improve the system. Your feedback is valuable.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="feedback-category"
              className="block text-sm font-medium text-royalPurple-text2 dark:text-royalPurple-text3 mb-1"
            >
              Category
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-royalPurple-text1 focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="feedback-rating"
              className="block text-sm font-medium text-royalPurple-text2 dark:text-royalPurple-text3 mb-1"
            >
              Rating (optional)
            </label>
            <div className="flex gap-1" role="group" aria-label="Rate your experience">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className="p-2 rounded-lg hover:bg-royalPurple-card2 dark:hover:bg-royalPurple-muted transition-colors"
                  aria-label={`Rate ${n} out of 5`}
                >
                  <Star
                    className={`h-6 w-6 ${rating && n <= rating ? 'fill-amber-400 text-royalPurple-accentTx' : 'text-royalPurple-text3 dark:text-royalPurple-text3'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="block text-sm font-medium text-royalPurple-text2 dark:text-royalPurple-text3 mb-1"
            >
              Your feedback <span className="text-royalPurple-dangerTx">*</span>
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think about the system..."
              rows={4}
              minLength={3}
              required
              className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-royalPurple-text1 placeholder:text-royalPurple-muted focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2"
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
