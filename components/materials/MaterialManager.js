'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { SCHOOL_SUBJECTS, getSubjectById } from '@/data/subjects'
import {
  Upload, Download, FileText, Trash2, Eye, Search, Filter,
  BookOpen, Calendar, User, Tag, AlertCircle, CheckCircle,
  Plus, Edit, X, File, FileImage, FileVideo, Archive
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MaterialManager() {
  const { user } = useAuth()
  const [materials, setMaterials] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    subject_id: '',
    file: null,
    type: 'document'
  })

  // Get user's subjects based on role
  const getUserSubjects = () => {
    if (!user) return []
    
    if (user.role === 'teacher') {
      return user.assigned_subjects || []
    } else if (user.role === 'student') {
      return user.selected_subjects || []
    } else if (user.role === 'hod') {
      return user.assigned_subjects || []
    }
    return []
  }

  const userSubjects = getUserSubjects()
  const userSubjectObjects = SCHOOL_SUBJECTS.filter(subject => 
    userSubjects.includes(subject.id) || userSubjects.includes(subject.name)
  )

  // Mock materials data - replace with API call
  useEffect(() => {
    const mockMaterials = [
      {
        id: 1,
        title: 'Introduction to Algebra',
        description: 'Basic algebraic concepts and equations',
        subject_id: 2, // Mathematics
        subject_name: 'Mathematics',
        file_name: 'algebra_intro.pdf',
        file_size: '2.5 MB',
        file_type: 'pdf',
        uploaded_by: 'Ms. Sarah Johnson',
        uploaded_at: '2024-01-15',
        downloads: 45,
        type: 'document'
      },
      {
        id: 2,
        title: 'Chemical Reactions Lab Guide',
        description: 'Step-by-step guide for chemistry experiments',
        subject_id: 6, // Chemistry
        subject_name: 'Chemistry',
        file_name: 'chem_lab_guide.pdf',
        file_size: '4.1 MB',
        file_type: 'pdf',
        uploaded_by: 'Dr. Michael Brown',
        uploaded_at: '2024-01-12',
        downloads: 32,
        type: 'document'
      }
    ]
    setMaterials(mockMaterials)
  }, [])

  const filteredMaterials = materials.filter(material => {
    const matchesSubject = !selectedSubject || material.subject_id.toString() === selectedSubject
    const matchesSearch = !searchQuery || 
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by user's subjects
    const hasAccess = userSubjects.includes(material.subject_id) || 
                     userSubjects.includes(material.subject_name) ||
                     user?.role === 'headteacher'
    
    return matchesSubject && matchesSearch && hasAccess
  })

  const handleFileUpload = async (e) => {
    e.preventDefault()
    
    if (!uploadData.file || !uploadData.title || !uploadData.subject_id) {
      toast.error('Please fill in all required fields and select a file')
      return
    }

    try {
      // Mock upload - replace with actual API call
      const newMaterial = {
        id: Date.now(),
        title: uploadData.title,
        description: uploadData.description,
        subject_id: parseInt(uploadData.subject_id),
        subject_name: getSubjectById(parseInt(uploadData.subject_id))?.name || '',
        file_name: uploadData.file.name,
        file_size: `${(uploadData.file.size / 1024 / 1024).toFixed(1)} MB`,
        file_type: uploadData.file.name.split('.').pop().toLowerCase(),
        uploaded_by: user?.name || 'Unknown',
        uploaded_at: new Date().toISOString().split('T')[0],
        downloads: 0,
        type: uploadData.type
      }

      setMaterials(prev => [newMaterial, ...prev])
      setShowUploadModal(false)
      setUploadData({
        title: '',
        description: '',
        subject_id: '',
        file: null,
        type: 'document'
      })
      toast.success('Material uploaded successfully!')
    } catch (error) {
      toast.error('Failed to upload material')
    }
  }

  const handleDownload = async (material) => {
    try {
      // Mock download - replace with actual file download
      toast.success(`Downloading ${material.file_name}...`)
      
      // Update download count
      setMaterials(prev => prev.map(m => 
        m.id === material.id 
          ? { ...m, downloads: m.downloads + 1 }
          : m
      ))
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const handleDelete = async (materialId) => {
    if (!confirm('Are you sure you want to delete this material?')) return
    
    try {
      setMaterials(prev => prev.filter(m => m.id !== materialId))
      toast.success('Material deleted successfully')
    } catch (error) {
      toast.error('Failed to delete material')
    }
  }

  const getFileIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="h-5 w-5 text-green-500" />
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FileVideo className="h-5 w-5 text-purple-500" />
      case 'zip':
      case 'rar':
        return <Archive className="h-5 w-5 text-orange-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Learning Materials</h2>
          <p className="text-gray-600">
            {user?.role === 'teacher' ? 'Upload and manage materials for your subjects' : 'Download materials for your subjects'}
          </p>
        </div>
        
        {user?.role === 'teacher' && (
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Material
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
          >
            <option value="">All Subjects</option>
            {userSubjectObjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map(material => (
          <Card key={material.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getFileIcon(material.file_type)}
                  <div>
                    <CardTitle className="text-lg">{material.title}</CardTitle>
                    <p className="text-sm text-gray-600">{material.subject_name}</p>
                  </div>
                </div>
                
                {user?.role === 'teacher' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">{material.description}</p>
              
              <div className="space-y-2 text-xs text-gray-500">
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
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-600">
            {user?.role === 'teacher' 
              ? 'Upload your first material to get started' 
              : 'No materials available for your subjects yet'
            }
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Material</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadData.subject_id}
                  onChange={(e) => setUploadData(prev => ({ ...prev, subject_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Subject</option>
                  {userSubjectObjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadData(prev => ({ ...prev, file: e.target.files[0] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.zip"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, PPT, Images, Videos, ZIP (Max 10MB)
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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
