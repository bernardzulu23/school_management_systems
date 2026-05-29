'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { ArrowLeft, Star, Download, MapPin } from 'lucide-react'

const TYPE_LABELS = {
  lesson_plan: 'Lesson Plan',
  sba_task: 'SBA Task',
  rubric: 'Rubric',
  exam_question: 'Exam Question',
}

function renderContent(content) {
  if (!content) return 'No preview available.'
  if (typeof content === 'string') return content
  if (typeof content === 'object') {
    return content.content || JSON.stringify(content, null, 2)
  }
  return String(content)
}

export default function MarketplaceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [material, setMaterial] = useState(null)
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getMarketplaceItem(id)
      const data = res?.data?.data || {}
      setMaterial(data.material || null)
      setRatings(Array.isArray(data.ratings) ? data.ratings : [])
    } catch {
      setMaterial(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  const onDownload = async () => {
    setDownloading(true)
    try {
      const res = await api.downloadMarketplaceMaterial(id)
      if (res?.data?.success) {
        toast.success('Added to your lesson plans library')
        router.push('/dashboard/teacher/lesson-plans')
      }
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) toast.error('Please sign in as a teacher to download')
      else toast.error('Could not download this material')
    } finally {
      setDownloading(false)
    }
  }

  const onRate = async (e) => {
    e.preventDefault()
    setSubmittingRating(true)
    try {
      await api.rateMarketplaceMaterial(id, { score, comment })
      toast.success('Thanks for your rating')
      setComment('')
      load()
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) toast.error('Please sign in to rate')
      else toast.error('Could not submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  if (loading) {
    return <p className="p-12 text-center text-gray-500">Loading…</p>
  }

  if (!material) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-600">This material is not available.</p>
        <Link href="/marketplace" className="mt-4 inline-block text-emerald-600 hover:underline">
          ← Back to marketplace
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {TYPE_LABELS[material.type] || material.type}
            </span>
            {material.rating != null && (
              <span className="flex items-center gap-1 text-sm text-amber-500">
                <Star className="h-4 w-4 fill-amber-400" />
                {material.rating.toFixed(1)} ({material.ratingCount})
              </span>
            )}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Download className="h-4 w-4" />
              {material.downloadCount}
            </span>
            {material.province && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                {material.province}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">{material.title}</h1>
          <p className="mt-1 text-gray-600">
            {material.subject} • {material.form} • {material.topic}
          </p>
          {material.author && (
            <p className="mt-1 text-sm text-gray-400">Shared by {material.author}</p>
          )}

          {Array.isArray(material.tags) && material.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {material.tags.map((t) => (
                <span key={t} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={onDownload}
            disabled={downloading}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Adding…' : 'Download to my library'}
          </button>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Preview</h2>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm text-gray-700">
              {renderContent(material.content)}
            </pre>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Ratings &amp; comments</h2>

          <form onSubmit={onRate} className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setScore(n)}
                  aria-label={`Rate ${n} stars`}
                >
                  <Star
                    className={`h-6 w-6 ${n <= score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment…"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submittingRating}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submittingRating ? 'Submitting…' : 'Submit rating'}
            </button>
          </form>

          <ul className="mt-5 space-y-4">
            {ratings.length === 0 ? (
              <li className="text-sm text-gray-500">No ratings yet — be the first.</li>
            ) : (
              ratings.map((r) => (
                <li key={r.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center text-amber-500">
                      {Array.from({ length: r.score }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{r.author}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
