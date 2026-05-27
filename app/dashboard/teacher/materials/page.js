'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  BookOpen,
  Upload,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  FileText,
  Video,
  Image,
  File,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'

export default function StudyMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [materials, setMaterials] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    title: '',
    subject: '',
    type: 'pdf',
    fileUrl: '',
    size: '',
    tags: '',
    description: '',
  })

  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-g-700" />
      case 'video':
        return <Video className="h-5 w-5 text-g-700" />
      case 'powerpoint':
        return <FileText className="h-5 w-5 text-g-700" />
      case 'zip':
        return <File className="h-5 w-5 text-g-700" />
      case 'image':
        return <Image className="h-5 w-5 text-g-700" />
      default:
        return <File className="h-5 w-5 text-g-700" />
    }
  }

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      case 'video':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'powerpoint':
        return 'bg-accent/20 text-g-800'
      case 'zip':
        return 'bg-royalPurple-pill text-royalPurple-pillTx'
      case 'image':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const loadMaterials = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/teacher/materials', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load materials')
      const data = Array.isArray(json?.data) ? json.data : []
      setMaterials(data)
    } catch (e) {
      setError(e.message || 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [])

  const subjects = useMemo(() => {
    const set = new Set(materials.map((m) => String(m.subject || '').trim()).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [materials])

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesSearch =
        String(material.title || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        String(material.description || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (Array.isArray(material.tags) ? material.tags : []).some((tag) =>
          String(tag).toLowerCase().includes(searchTerm.toLowerCase())
        )
      const matchesSubject = filterSubject === 'all' || material.subject === filterSubject
      return matchesSearch && matchesSubject
    })
  }, [materials, searchTerm, filterSubject])

  const materialStats = {
    totalMaterials: materials.length,
    totalDownloads: materials.reduce((sum, material) => sum + Number(material.downloads || 0), 0),
  }

  const resetForm = () => {
    setForm({
      title: '',
      subject: '',
      type: 'pdf',
      fileUrl: '',
      size: '',
      tags: '',
      description: '',
    })
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (material) => {
    setEditing(material)
    setForm({
      title: String(material?.title || ''),
      subject: String(material?.subject || ''),
      type: String(material?.type || 'pdf'),
      fileUrl: String(material?.fileUrl || ''),
      size: String(material?.size || ''),
      tags: Array.isArray(material?.tags) ? material.tags.join(', ') : '',
      description: String(material?.description || ''),
    })
    setShowForm(true)
  }

  const saveMaterial = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        subject: form.subject,
        type: form.type,
        fileUrl: form.fileUrl,
        size: form.size || null,
        tags: form.tags,
        description: form.description || null,
      }

      const res = await fetch(
        editing
          ? `/api/teacher/materials/${encodeURIComponent(editing.id)}`
          : '/api/teacher/materials',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        }
      )

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to save material')

      toast.success(editing ? 'Material updated successfully' : 'Material created successfully')
      setShowForm(false)
      resetForm()
      await loadMaterials()
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const deleteMaterial = async (material) => {
    const ok = window.confirm(`Delete "${material?.title || 'this material'}"?`)
    if (!ok) return

    setSaving(true)
    try {
      const res = await fetch(`/api/teacher/materials/${encodeURIComponent(material.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to delete material')
      toast.success('Material deleted successfully')
      await loadMaterials()
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Study Materials">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <BookOpen className="h-6 w-6 mr-2" />
                Study Materials Management
              </h1>
              <p className="text-royalPurple-text2">
                Upload, organize, and share educational resources with students
              </p>
              <Link
                href="/dashboard/teacher/ai-materials"
                className="text-sm text-accent hover:underline mt-1 inline-block"
              >
                Upload notes for AI (lesson plans, quizzes) →
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={openCreate} disabled={saving}>
              <Upload className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Materials</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {materialStats.totalMaterials}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <File className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Downloads</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {materialStats.totalDownloads}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-royalPurple-text2 text-sm">
                {filteredMaterials.length} material{filteredMaterials.length === 1 ? '' : 's'}
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="pl-10 pr-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-royalPurple-accentTx" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-10 w-10 text-royalPurple-dangerTx mx-auto mb-3" />
                <p className="text-royalPurple-text2">{error}</p>
                <Button className="mt-4" onClick={loadMaterials}>
                  Retry
                </Button>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <p className="text-royalPurple-text2 text-center py-10">No study materials found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        {getFileIcon(material.type)}
                        <div className="ml-3">
                          <h3 className="text-lg font-semibold text-royalPurple-text1 line-clamp-2">
                            {material.title}
                          </h3>
                          <p className="text-sm text-royalPurple-text2">{material.subject}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getTypeColor(material.type)}`}
                      >
                        {String(material.type || '').toUpperCase()}
                      </span>
                    </div>

                    <p className="text-royalPurple-text2 text-sm mb-3 line-clamp-2">
                      {material.description || 'No description'}
                    </p>

                    <div className="space-y-2 text-xs text-royalPurple-text3 mb-3">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{material.size || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uploaded:</span>
                        <span>{new Date(material.uploadDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downloads:</span>
                        <span>{material.downloads || 0}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-royalPurple-text3 mb-1">Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(material.tags) ? material.tags : []).length === 0 ? (
                          <span className="text-xs text-royalPurple-text3 italic">No tags</span>
                        ) : (
                          material.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-royalPurple-card2 text-royalPurple-text2 rounded"
                            >
                              #{tag}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-royalPurple-accentTx underline"
                      >
                        Open
                      </a>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(material)}
                          disabled={saving}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMaterial(material)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editing ? 'Edit Material' : 'Add Material'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveMaterial} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent"
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    required
                  >
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="powerpoint">PowerPoint</option>
                    <option value="zip">ZIP</option>
                    <option value="image">Image</option>
                    <option value="file">File</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileUrl">File URL</Label>
                  <Input
                    id="fileUrl"
                    value={form.fileUrl}
                    onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size (optional)</Label>
                  <Input
                    id="size"
                    value={form.size}
                    onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
                    placeholder="e.g. 2.5 MB"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={form.tags}
                    onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                    placeholder="e.g. algebra, equations"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <textarea
                    id="description"
                    className="w-full px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
