'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { BookOpen, Search, Star, Download, MapPin } from 'lucide-react'

const TYPE_LABELS = {
  lesson_plan: 'Lesson Plan',
  sba_task: 'SBA Task',
  rubric: 'Rubric',
  exam_question: 'Exam Question',
}

const TYPES = ['', 'lesson_plan', 'sba_task', 'rubric', 'exam_question']
const RESOURCE_LEVELS = ['', 'low', 'moderate', 'well-resourced']

function MaterialCard({ item }) {
  return (
    <Link
      href={`/marketplace/${item.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {TYPE_LABELS[item.type] || item.type}
        </span>
        {item.rating != null && (
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="h-4 w-4 fill-amber-400" />
            {item.rating.toFixed(1)}
            <span className="text-gray-400">({item.ratingCount})</span>
          </span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-gray-900">{item.title}</h3>
      <p className="mt-1 text-sm text-gray-600">
        {item.subject} • {item.form}
      </p>
      <p className="mt-1 line-clamp-1 text-sm text-gray-500">{item.topic}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Download className="h-3.5 w-3.5" />
          {item.downloadCount} downloads
        </span>
        {item.province && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {item.province}
          </span>
        )}
      </div>
      {item.author && <p className="mt-2 text-xs text-gray-400">Shared by {item.author}</p>}
    </Link>
  )
}

export default function MarketplacePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [type, setType] = useState('')
  const [resourceLevel, setResourceLevel] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (subject) params.subject = subject
      if (type) params.type = type
      if (resourceLevel) params.resourceLevel = resourceLevel
      const res = await api.getMarketplace(params)
      const data = res?.data?.data || {}
      setItems(Array.isArray(data.items) ? data.items : [])
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, search, subject, type, resourceLevel])

  useEffect(() => {
    load()
  }, [load])

  const onSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teaching Materials Marketplace</h1>
              <p className="text-sm text-gray-500">
                ECZ-aligned lesson plans, SBA tasks and rubrics shared by teachers across Zambia.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <form onSubmit={onSearchSubmit} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, topic, subject…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t || 'all'} value={t}>
                {t ? TYPE_LABELS[t] : 'All types'}
              </option>
            ))}
          </select>
          <select
            value={resourceLevel}
            onChange={(e) => setResourceLevel(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            {RESOURCE_LEVELS.map((r) => (
              <option key={r || 'all'} value={r}>
                {r ? r.replace('-', ' ') : 'Any resource level'}
              </option>
            ))}
          </select>
        </form>

        {loading ? (
          <p className="py-12 text-center text-gray-500">Loading materials…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-gray-600">No materials match your search yet.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">{pagination.total} materials found</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <MaterialCard key={item.id} item={item} />
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
