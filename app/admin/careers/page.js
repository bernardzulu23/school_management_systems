'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Briefcase, Plus, Pencil, Trash2, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import SkeletonLoader from '@/components/SkeletonLoader'
import { CareerGuidanceAdminHelp } from '@/components/careers/CareerGuidanceAdminHelp'

const emptyCareer = {
  clusterId: '',
  title: '',
  summary: '',
  overview: '',
  subjectsToFocus: '',
  recommendedCourses: '',
  collegesInstitutions: '',
  salaryExpectations: '',
  qualifications: '',
  careerProgression: '',
  additionalNotes: '',
  sortOrder: '0',
}

const FIELD_HELP = {
  subjectsToFocus:
    'List subjects and grades to focus on (e.g. Grade 10: Mathematics, Physical Science; Grade 11–12: Computer Studies).',
  recommendedCourses:
    'Certificates, diplomas, or degrees needed (e.g. CCNA, Diploma in IT, BSc Computer Science).',
  collegesInstitutions: 'Universities, colleges, or training centres in Zambia or abroad.',
  salaryExpectations:
    'Typical pay ranges in Zambia (entry level, mid-career) — use realistic figures.',
}

export default function CareersAdminPage() {
  const [clusters, setClusters] = useState([])
  const [careers, setCareers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyCareer)
  const [filterCluster, setFilterCluster] = useState('all')

  const loadData = async () => {
    try {
      setLoading(true)
      const [clusterRes, careerRes] = await Promise.all([
        fetch('/api/career-clusters?all=1', { credentials: 'include' }),
        fetch('/api/careers?all=1', { credentials: 'include' }),
      ])
      const clusterJson = await clusterRes.json().catch(() => ({}))
      const careerJson = await careerRes.json().catch(() => ({}))
      if (!clusterRes.ok) throw new Error(clusterJson.error || 'Failed to load clusters')
      if (!careerRes.ok) throw new Error(careerJson.error || 'Failed to load careers')
      setClusters(clusterJson.data || [])
      setCareers(careerJson.data || [])
    } catch (err) {
      toast.error(err.message || 'Could not load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyCareer,
      clusterId: filterCluster !== 'all' ? filterCluster : clusters[0]?.id || '',
    })
    setShowModal(true)
  }

  const openEdit = (career) => {
    setEditingId(career.id)
    setForm({
      clusterId: career.clusterId || career.cluster?.id || '',
      title: career.title || '',
      summary: career.summary || '',
      overview: career.overview || '',
      subjectsToFocus: career.subjectsToFocus || '',
      recommendedCourses: career.recommendedCourses || '',
      collegesInstitutions: career.collegesInstitutions || '',
      salaryExpectations: career.salaryExpectations || '',
      qualifications: career.qualifications || '',
      careerProgression: career.careerProgression || '',
      additionalNotes: career.additionalNotes || '',
      sortOrder: String(career.sortOrder ?? 0),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clusterId) {
      toast.error('Please select a cluster')
      return
    }
    if (form.title.trim().length < 2) {
      toast.error('Career title is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        clusterId: form.clusterId,
        title: form.title.trim(),
        summary: form.summary.trim(),
        overview: form.overview.trim(),
        subjectsToFocus: form.subjectsToFocus.trim(),
        recommendedCourses: form.recommendedCourses.trim(),
        collegesInstitutions: form.collegesInstitutions.trim(),
        salaryExpectations: form.salaryExpectations.trim(),
        qualifications: form.qualifications.trim(),
        careerProgression: form.careerProgression.trim(),
        additionalNotes: form.additionalNotes.trim(),
        sortOrder: Number(form.sortOrder) || 0,
      }
      const url = editingId ? `/api/careers/${editingId}` : '/api/careers'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success(editingId ? 'Career updated' : 'Career published')
      setShowModal(false)
      setEditingId(null)
      setForm(emptyCareer)
      await loadData()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (career) => {
    try {
      const res = await fetch(`/api/careers/${career.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !career.active }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Update failed')
      await loadData()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const handleDelete = async (career) => {
    if (!window.confirm(`Delete career "${career.title}"?`)) return
    try {
      const res = await fetch(`/api/careers/${career.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Delete failed')
      toast.success('Career deleted')
      await loadData()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  const filtered =
    filterCluster === 'all'
      ? careers
      : careers.filter((c) => c.clusterId === filterCluster || c.cluster?.id === filterCluster)

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="min-h-screen bg-royalPurple-page p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-royalPurple-accentTx" />
              Careers
            </h1>
            <p className="text-royalPurple-text2 mt-1 max-w-2xl">
              Add full career profiles for students: subjects to study, courses, colleges, salary
              expectations, and more. Students see only careers you mark as visible.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/admin/career-clusters">
              <Button variant="outline">
                <Layers className="h-4 w-4 mr-2" />
                Clusters
              </Button>
            </Link>
            <Button onClick={openCreate} disabled={clusters.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add career
            </Button>
          </div>
        </div>

        <CareerGuidanceAdminHelp page="careers" />

        {clusters.length === 0 && !loading && (
          <Card>
            <CardContent className="p-6 text-royalPurple-text2">
              Create at least one{' '}
              <Link href="/admin/career-clusters" className="text-royalPurple-accentTx underline">
                career cluster
              </Link>{' '}
              before adding careers.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Published careers</CardTitle>
            <select
              className="zsms-select px-3 py-2"
              value={filterCluster}
              onChange={(e) => setFilterCluster(e.target.value)}
            >
              <option value="all">All clusters</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonLoader variant="rectangular" height="160px" className="rounded-lg" />
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-royalPurple-text2">
                No careers yet. Add your first career.
              </p>
            ) : (
              <div className="space-y-3">
                {filtered.map((career) => (
                  <div
                    key={career.id}
                    className="border border-royalPurple-border rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-royalPurple-text1">{career.title}</h3>
                        <span className="text-xs badge-brand">{career.cluster?.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            career.active
                              ? 'bg-royalPurple-success text-royalPurple-successTx'
                              : 'bg-royalPurple-card2 text-royalPurple-text3'
                          }`}
                        >
                          {career.active ? 'Live' : 'Draft (hidden)'}
                        </span>
                      </div>
                      {career.summary && (
                        <p className="text-sm text-royalPurple-text2 mt-1">{career.summary}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(career)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(career)}>
                        {career.active ? 'Hide' : 'Publish'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(career)}>
                        <Trash2 className="h-4 w-4 text-royalPurple-dangerTx" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/50">
          <div className="min-h-full flex items-start justify-center py-8">
            <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl w-full max-w-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-royalPurple-text1 mb-1">
                {editingId ? 'Edit career' : 'Add career'}
              </h2>
              <p className="text-sm text-royalPurple-text3 mb-4">
                Fill in each section in plain language. Students will read this when exploring
                careers.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                      Cluster
                    </label>
                    <select
                      className="zsms-select w-full"
                      value={form.clusterId}
                      onChange={(e) => setField('clusterId', e.target.value)}
                      required
                    >
                      <option value="">Select cluster</option>
                      {clusters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                      Career title
                    </label>
                    <input
                      className="form-input w-full"
                      value={form.title}
                      onChange={(e) => setField('title', e.target.value)}
                      placeholder="e.g. Network Engineer"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Short summary (one sentence)
                  </label>
                  <input
                    className="form-input w-full"
                    value={form.summary}
                    onChange={(e) => setField('summary', e.target.value)}
                    placeholder="Brief tagline shown in lists"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    What does this job involve?
                  </label>
                  <textarea
                    className="form-input w-full min-h-[80px]"
                    value={form.overview}
                    onChange={(e) => setField('overview', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Subjects to focus on (by grade)
                  </label>
                  <p className="text-xs text-royalPurple-text3 mb-1">
                    {FIELD_HELP.subjectsToFocus}
                  </p>
                  <textarea
                    className="form-input w-full min-h-[80px]"
                    value={form.subjectsToFocus}
                    onChange={(e) => setField('subjectsToFocus', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Courses & qualifications
                  </label>
                  <p className="text-xs text-royalPurple-text3 mb-1">
                    {FIELD_HELP.recommendedCourses}
                  </p>
                  <textarea
                    className="form-input w-full min-h-[80px]"
                    value={form.recommendedCourses}
                    onChange={(e) => setField('recommendedCourses', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Colleges & training institutions
                  </label>
                  <p className="text-xs text-royalPurple-text3 mb-1">
                    {FIELD_HELP.collegesInstitutions}
                  </p>
                  <textarea
                    className="form-input w-full min-h-[80px]"
                    value={form.collegesInstitutions}
                    onChange={(e) => setField('collegesInstitutions', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Salary expectations
                  </label>
                  <p className="text-xs text-royalPurple-text3 mb-1">
                    {FIELD_HELP.salaryExpectations}
                  </p>
                  <textarea
                    className="form-input w-full min-h-[60px]"
                    value={form.salaryExpectations}
                    onChange={(e) => setField('salaryExpectations', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Entry requirements & qualifications
                  </label>
                  <textarea
                    className="form-input w-full min-h-[60px]"
                    value={form.qualifications}
                    onChange={(e) => setField('qualifications', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Career progression
                  </label>
                  <textarea
                    className="form-input w-full min-h-[60px]"
                    value={form.careerProgression}
                    onChange={(e) => setField('careerProgression', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Additional notes
                  </label>
                  <textarea
                    className="form-input w-full min-h-[50px]"
                    value={form.additionalNotes}
                    onChange={(e) => setField('additionalNotes', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Display order
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input w-24"
                    value={form.sortOrder}
                    onChange={(e) => setField('sortOrder', e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-royalPurple-card pb-1">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish career'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
