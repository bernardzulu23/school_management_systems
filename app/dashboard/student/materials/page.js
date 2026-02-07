'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  BookOpen, Download, Eye, Search, Filter, Star, Clock,
  ArrowLeft, FileText, Video, Image, File, Bookmark
} from 'lucide-react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function StudyMaterialsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const queryClient = useQueryClient()
  
  const { data: studyMaterials = [], isLoading } = useQuery({
    queryKey: ['student-materials'],
    queryFn: async () => {
      const res = await api.getStudentMaterials()
      return res.data.data
    }
  })

  const bookmarkMutation = useMutation({
    mutationFn: (id) => api.toggleMaterialBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['student-materials'])
      toast.success('Bookmark updated')
    },
    onError: () => {
      toast.error('Failed to update bookmark')
    }
  })

  const downloadMutation = useMutation({
    mutationFn: (id) => api.trackMaterialDownload(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['student-materials'])
    }
  })

  const handleDownload = (material) => {
    downloadMutation.mutate(material.id)
    // Create fake download link
    const link = document.createElement('a')
    link.href = material.fileUrl || '#'
    link.download = material.title
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Download started')
  }

  const handleBookmark = (id) => {
    bookmarkMutation.mutate(id)
  }

  // Extract unique subjects from materials
  const subjects = [...new Set(studyMaterials.map(m => m.subject))]

  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />
      case 'video': return <Video className="h-5 w-5 text-blue-500" />
      case 'powerpoint': return <FileText className="h-5 w-5 text-orange-500" />
      case 'zip': return <File className="h-5 w-5 text-purple-500" />
      case 'image': return <ImageIcon className="h-5 w-5 text-green-500" />
      default: return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf': return 'bg-red-100 text-red-800'
      case 'video': return 'bg-blue-100 text-blue-800'
      case 'powerpoint': return 'bg-orange-100 text-orange-800'
      case 'zip': return 'bg-purple-100 text-purple-800'
      case 'image': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSubjectColor = (subject) => {
    switch (subject) {
      case 'Mathematics': return 'bg-blue-100 text-blue-800'
      case 'Science': return 'bg-green-100 text-green-800'
      case 'English': return 'bg-purple-100 text-purple-800'
      case 'History': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredMaterials = studyMaterials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesSubject = filterSubject === 'all' || material.subject === filterSubject
    const matchesType = filterType === 'all' || material.type.toLowerCase() === filterType.toLowerCase()
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'bookmarked' && material.isBookmarked) ||
                      (activeTab === 'downloaded' && material.isDownloaded) ||
                      (activeTab === 'recent' && new Date(material.uploadDate) > new Date('2024-01-18'))
    return matchesSearch && matchesSubject && matchesType && matchesTab
  })

  const materialStats = {
    totalMaterials: studyMaterials.length,
    bookmarkedMaterials: studyMaterials.filter(material => material.isBookmarked).length,
    downloadedMaterials: studyMaterials.filter(material => material.isDownloaded).length,
    totalDownloads: studyMaterials.reduce((sum, material) => sum + material.downloads, 0)
  }

  const popularMaterials = [...studyMaterials]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 3)

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-200 text-yellow-400" />)
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />)
    }
    return stars
  }

  return (
    <DashboardLayout title="Study Materials">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/student">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BookOpen className="h-6 w-6 mr-2" />
                Study Materials & Resource Library
              </h1>
              <p className="text-gray-600">Access and download educational resources for all your subjects</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Advanced Search
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Materials</p>
                  <p className="text-2xl font-bold text-gray-900">{materialStats.totalMaterials}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Bookmark className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Bookmarked</p>
                  <p className="text-2xl font-bold text-gray-900">{materialStats.bookmarkedMaterials}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Download className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Downloaded</p>
                  <p className="text-2xl font-bold text-gray-900">{materialStats.downloadedMaterials}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold text-gray-900">{materialStats.totalDownloads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('all')}
                >
                  All Materials ({studyMaterials.length})
                </Button>
                <Button
                  variant={activeTab === 'bookmarked' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('bookmarked')}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Bookmarked ({materialStats.bookmarkedMaterials})
                </Button>
                <Button
                  variant={activeTab === 'downloaded' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('downloaded')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Downloaded ({materialStats.downloadedMaterials})
                </Button>
                <Button
                  variant={activeTab === 'recent' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('recent')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Recent
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="all">All Subjects</option>
                  {subjects.length > 0 ? (
                    subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))
                  ) : (
                    <>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                    </>
                  )}
                </select>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="PDF">PDF</option>
                  <option value="Video">Video</option>
                  <option value="PowerPoint">PowerPoint</option>
                  <option value="ZIP">ZIP</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((material) => (
                <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      {getFileIcon(material.type)}
                      <div className="ml-3 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{material.title}</h3>
                        <p className="text-sm text-gray-600">by {material.teacher}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBookmark(material.id)}
                      disabled={bookmarkMutation.isPending}
                    >
                      <Bookmark className={`h-4 w-4 ${material.isBookmarked ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getSubjectColor(material.subject)}`}>
                      {material.subject}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(material.type)}`}>
                      {material.type}
                    </span>
                    {material.isDownloaded && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Downloaded
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{material.description}</p>

                  <div className="flex items-center mb-3">
                    <div className="flex items-center mr-3">
                      {renderStars(material.rating)}
                      <span className="ml-1 text-sm text-gray-600">({material.rating})</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{material.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Downloads:</span>
                      <span>{material.downloads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Views:</span>
                      <span>{material.views}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded:</span>
                      <span>{new Date(material.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {material.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDownload(material)}
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Access and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse by Subject
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  Highly Rated Materials
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Recently Added
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  My Downloads
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bookmark className="h-4 w-4 mr-2" />
                  My Bookmarks
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Popular Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {popularMaterials.length > 0 ? (
                  popularMaterials.map(material => (
                    <div key={material.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">{material.title}</h4>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{material.downloads} downloads</span>
                        <span className="flex items-center"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1"/> {material.rating}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{material.subject} • {material.type}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No materials available yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
