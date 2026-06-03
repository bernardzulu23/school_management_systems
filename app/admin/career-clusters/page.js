'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Layers, Plus, Pencil, Trash2, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import SkeletonLoader from '@/components/SkeletonLoader'
import { CareerGuidanceAdminHelp } from '@/components/careers/CareerGuidanceAdminHelp'

const emptyForm = { name: '', description: '', sortOrder: '0' }

export default function CareerClustersAdminPage() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadClusters = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/career-clusters?all=1', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load clusters')
      setClusters(json.data || [])
    } catch (err) {
      toast.error(err.message || 'Could not load clusters')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClusters()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (cluster) => {
    setEditingId(cluster.id)
    setForm({
      name: cluster.name || '',
      description: cluster.description || '',
      sortOrder: String(cluster.sortOrder ?? 0),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = form.name.trim()
    const description = form.description.trim()
    if (name.length < 2) {
      toast.error('Cluster name is required')
      return
    }
    if (description.length < 10) {
      toast.error('Please add a short description (at least 10 characters)')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name,
        description,
        sortOrder: Number(form.sortOrder) || 0,
      }
      const url = editingId ? `/api/career-clusters/${editingId}` : '/api/career-clusters'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success(editingId ? 'Cluster updated' : 'Cluster added')
      setShowModal(false)
      setForm(emptyForm)
      setEditingId(null)
      await loadClusters()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (cluster) => {
    try {
      const res = await fetch(`/api/career-clusters/${cluster.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !cluster.active }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Update failed')
      await loadClusters()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const handleDelete = async (cluster) => {
    if (
      !window.confirm(
        `Delete cluster "${cluster.name}"? All careers in this cluster will also be removed.`
      )
    ) {
      return
    }
    try {
      const res = await fetch(`/api/career-clusters/${cluster.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Delete failed')
      toast.success('Cluster deleted')
      await loadClusters()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  return (
    <div className="min-h-screen bg-royalPurple-page p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <Layers className="h-7 w-7 text-royalPurple-accentTx" />
              Career clusters
            </h1>
            <p className="text-royalPurple-text2 mt-1 max-w-xl">
              Group careers into clusters (e.g. Engineering, Health, Business). Add a clear
              description so students understand what each cluster is about.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/careers">
              <Button variant="outline">
                <Briefcase className="h-4 w-4 mr-2" />
                Manage careers
              </Button>
            </Link>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add cluster
            </Button>
          </div>
        </div>

        <CareerGuidanceAdminHelp page="clusters" />

        <Card>
          <CardHeader>
            <CardTitle>Your clusters</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonLoader variant="rectangular" height="120px" className="rounded-lg" />
            ) : clusters.length === 0 ? (
              <div className="text-center py-10 text-royalPurple-text2">
                <p>No clusters yet. Click &quot;Add cluster&quot; to create your first one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="border border-royalPurple-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-royalPurple-text1">{cluster.name}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            cluster.active
                              ? 'bg-royalPurple-success text-royalPurple-successTx'
                              : 'bg-royalPurple-card2 text-royalPurple-text3'
                          }`}
                        >
                          {cluster.active ? 'Visible to students' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-sm text-royalPurple-text2 mt-2 whitespace-pre-wrap">
                        {cluster.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(cluster)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(cluster)}>
                        {cluster.active ? 'Hide' : 'Show'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(cluster)}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-lg font-bold text-royalPurple-text1 mb-4">
              {editingId ? 'Edit cluster' : 'Add cluster'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                  Cluster name
                </label>
                <input
                  className="form-input w-full"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Science & Technology"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                  Description
                </label>
                <textarea
                  className="form-input w-full min-h-[120px]"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Explain what kinds of careers belong in this cluster and who it suits."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                  Display order (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input w-24"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
                <p className="text-xs text-royalPurple-text3 mt-1">Lower numbers appear first.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add cluster'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
