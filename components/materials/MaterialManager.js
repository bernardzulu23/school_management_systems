'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  Upload,
  Download,
  FileText,
  Trash2,
  Search,
  BookOpen,
  Plus,
  X,
  File,
  Filter,
  Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MaterialManager() {
  const { user } = useAuth()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    subject_id: '',
    file: null,
    type: 'document',
  })

  const [assignableSubjects, setAssignableSubjects] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/materials', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const rows = Array.isArray(json?.data) ? json.data : []
        setAssignableSubjects(
          Array.isArray(json?.assignableSubjects) ? json.assignableSubjects : []
        )
        setMaterials(
          rows.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.gradeLevel ? `Grade: ${m.gradeLevel}` : '',
            subject_id: m.subject || '',
            subject_name: m.subject || 'General',
            file_name: m.title,
            file_type: m.fileType,
            uploaded_at: m.createdAt,
            chunksIndexed: m.chunksIndexed,
            fileUrl: m.fileUrl,
            type: 'document',
          }))
        )
      })
      .catch(() => setMaterials([]))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const subjectOptions = [
    ...new Set([...assignableSubjects, ...materials.map((m) => m.subject_name).filter(Boolean)]),
  ].sort()

  const filteredMaterials = materials.filter((material) => {
    const matchesSubject = !selectedSubject || material.subject_name === selectedSubject
    const matchesSearch =
      !searchQuery ||
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (material.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSubject && matchesSearch
  })

  const handleFileUpload = async (e) => {
    e.preventDefault()
    toast('Use AI Reference Materials to upload and index files for RAG.', { icon: 'ℹ️' })
    window.location.href = '/dashboard/teacher/ai-materials'
  }

  const handleDownload = async (material) => {
    if (material.fileUrl) {
      window.open(material.fileUrl, '_blank', 'noopener,noreferrer')
      return
    }
    toast.error('File URL not available')
  }

  const handleDelete = async () => {
    toast('Delete materials from AI Reference Materials.', { icon: 'ℹ️' })
  }

  const getFileIcon = () => <FileText className="h-5 w-5 text-royalPurple-accentTx" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-royalPurple-text1">Learning Materials</h2>
          <p className="text-royalPurple-text2">
            {user?.role === 'teacher'
              ? 'Upload and manage materials for your subjects'
              : 'Download materials for your subjects'}
          </p>
        </div>

        {user?.role === 'teacher' && (
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-royalPurple-accent hover:bg-royalPurple-accent"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Material
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 h-4 w-4" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-royalPurple-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 h-4 w-4" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="pl-10 pr-8 py-2 border border-royalPurple-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-royalPurple-card min-w-[200px]"
          >
            <option value="">All Subjects</option>
            {subjectOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => (
          <Card key={material.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getFileIcon(material.file_type)}
                  <div>
                    <CardTitle className="text-lg">{material.title}</CardTitle>
                    <p className="text-sm text-royalPurple-text2">{material.subject_name}</p>
                  </div>
                </div>

                {user?.role === 'teacher' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                    className="text-royalPurple-dangerTx hover:text-royalPurple-dangerTx"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-royalPurple-text2 text-sm mb-4">{material.description}</p>

              <div className="space-y-2 text-xs text-royalPurple-text3">
                <div className="flex items-center justify-between">
                  <span>Size: {material.file_size}</span>
                  <span>Downloads: {material.downloads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>By: {material.uploaded_by}</span>
                  <span>{material.uploaded_at}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => handleDownload(material)}
                  className="flex-1 bg-royalPurple-success hover:bg-royalPurple-success"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>

                <Button variant="outline" size="sm" className="px-3">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-royalPurple-text3 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">No materials found</h3>
          <p className="text-royalPurple-text2">
            {user?.role === 'teacher'
              ? 'Upload your first material to get started'
              : 'No materials available for your subjects yet'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-royalPurple-deep bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-royalPurple-card border border-royalPurple-border rounded-2xl max-w-md w-full overflow-hidden">
            <div className="bg-royalPurple-card2 border-b border-royalPurple-border px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-semibold text-royalPurple-text1">Upload Material</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadModal(false)}
                className="text-royalPurple-text2 hover:text-royalPurple-text1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleFileUpload} className="bg-royalPurple-card">
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Title <span className="text-royalPurple-dangerTx">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadData.title}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, title: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Subject <span className="text-royalPurple-dangerTx">*</span>
                  </label>
                  <select
                    value={uploadData.subject_id}
                    onChange={(e) =>
                      setUploadData((prev) => ({ ...prev, subject_id: e.target.value }))
                    }
                    className="select"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjectOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    Description
                  </label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) =>
                      setUploadData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="textarea"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                    File <span className="text-royalPurple-dangerTx">*</span>
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      setUploadData((prev) => ({ ...prev, file: e.target.files[0] }))
                    }
                    className="input"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.zip"
                    required
                  />
                  <p className="text-xs text-royalPurple-text3 mt-1">
                    Supported formats: PDF, DOC, PPT, Images, Videos, ZIP (Max 10MB)
                  </p>
                </div>
              </div>

              <div className="bg-royalPurple-card2 border-t border-royalPurple-border px-6 py-4 rounded-b-2xl flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-royalPurple-accent text-royalPurple-deep font-semibold"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
