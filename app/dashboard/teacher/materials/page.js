'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  BookOpen,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Share2,
  ArrowLeft,
  Search,
  Filter,
  FileText,
  Video,
  Image,
  File,
} from 'lucide-react'
import Link from 'next/link'

export default function StudyMaterialsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')

  // Sample study materials data
  const materialsData = [
    {
      id: 1,
      title: 'Algebra Fundamentals - Chapter 1',
      subject: 'Mathematics',
      type: 'PDF',
      size: '2.5 MB',
      uploadDate: '2024-01-20',
      downloads: 45,
      views: 128,
      classes: ['Class 9A', 'Class 9B'],
      description: 'Comprehensive guide to algebraic expressions and equations',
      tags: ['algebra', 'fundamentals', 'equations'],
      status: 'published',
    },
    {
      id: 2,
      title: 'Geometry Video Tutorial',
      subject: 'Mathematics',
      type: 'Video',
      size: '125 MB',
      uploadDate: '2024-01-18',
      downloads: 32,
      views: 89,
      classes: ['Class 8C'],
      description: 'Interactive video explaining geometric shapes and properties',
      tags: ['geometry', 'shapes', 'tutorial'],
      status: 'published',
    },
    {
      id: 3,
      title: 'Statistics Worksheet Collection',
      subject: 'Mathematics',
      type: 'ZIP',
      size: '8.2 MB',
      uploadDate: '2024-01-15',
      downloads: 67,
      views: 156,
      classes: ['Class 10B'],
      description: 'Practice worksheets for statistical analysis and data interpretation',
      tags: ['statistics', 'worksheets', 'practice'],
      status: 'published',
    },
    {
      id: 4,
      title: 'Trigonometry Reference Guide',
      subject: 'Mathematics',
      type: 'PDF',
      size: '1.8 MB',
      uploadDate: '2024-01-22',
      downloads: 23,
      views: 67,
      classes: ['Class 10B'],
      description: 'Quick reference for trigonometric functions and identities',
      tags: ['trigonometry', 'reference', 'functions'],
      status: 'draft',
    },
    {
      id: 5,
      title: 'Calculus Introduction Slides',
      subject: 'Mathematics',
      type: 'PowerPoint',
      size: '15.3 MB',
      uploadDate: '2024-01-19',
      downloads: 38,
      views: 94,
      classes: ['Class 11A'],
      description: 'Introduction to differential and integral calculus concepts',
      tags: ['calculus', 'derivatives', 'integrals'],
      status: 'published',
    },
  ]

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-royalPurple-card2 text-royalPurple-text1'
      default:
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
    }
  }

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      case 'video':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'powerpoint':
        return 'bg-orange-100 text-orange-800'
      case 'zip':
        return 'bg-royalPurple-pill text-royalPurple-pillTx'
      case 'image':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const filteredMaterials = materialsData.filter((material) => {
    const matchesSearch =
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesSubject = filterSubject === 'all' || material.subject === filterSubject
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'published' && material.status === 'published') ||
      (activeTab === 'draft' && material.status === 'draft')
    return matchesSearch && matchesSubject && matchesTab
  })

  const materialStats = {
    totalMaterials: materialsData.length,
    totalDownloads: materialsData.reduce((sum, material) => sum + material.downloads, 0),
    totalViews: materialsData.reduce((sum, material) => sum + material.views, 0),
    publishedMaterials: materialsData.filter((material) => material.status === 'published').length,
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
                Upload, organize, and share educational resources
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Bulk Download
            </Button>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Material
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <Download className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Downloads</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {materialStats.totalDownloads}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Views</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {materialStats.totalViews}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Share2 className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Published</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {materialStats.publishedMaterials}
                  </p>
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
                  All Materials ({materialsData.length})
                </Button>
                <Button
                  variant={activeTab === 'published' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('published')}
                >
                  Published ({materialsData.filter((m) => m.status === 'published').length})
                </Button>
                <Button
                  variant={activeTab === 'draft' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('draft')}
                >
                  Drafts ({materialsData.filter((m) => m.status === 'draft').length})
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="pl-10 pr-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="all">All Subjects</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                    <div className="flex items-center space-x-1">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getTypeColor(material.type)}`}
                      >
                        {material.type}
                      </span>
                    </div>
                  </div>

                  <p className="text-royalPurple-text2 text-sm mb-3 line-clamp-2">
                    {material.description}
                  </p>

                  <div className="space-y-2 text-xs text-royalPurple-text3 mb-3">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{material.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded:</span>
                      <span>{new Date(material.uploadDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Downloads:</span>
                      <span>{material.downloads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Views:</span>
                      <span>{material.views}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-royalPurple-text3 mb-1">Classes:</p>
                    <div className="flex flex-wrap gap-1">
                      {material.classes.map((className, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-royalPurple-accent text-royalPurple-accentTx rounded"
                        >
                          {className}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-royalPurple-text3 mb-1">Tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {material.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-royalPurple-card2 text-royalPurple-text2 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(material.status)}`}
                    >
                      {material.status}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload Tools and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Material
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Video className="h-4 w-4 mr-2" />
                  Record Video
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="h-4 w-4 mr-2" />
                  Bulk Share
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Library
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Material Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-royalPurple-accent rounded-lg">
                  <h4 className="font-medium text-royalPurple-accentTx mb-2">Most Downloaded</h4>
                  <p className="text-sm text-royalPurple-accentTx">
                    Statistics Worksheet Collection
                  </p>
                  <p className="text-xs text-royalPurple-accentTx">67 downloads</p>
                </div>
                <div className="p-3 bg-royalPurple-success rounded-lg">
                  <h4 className="font-medium text-royalPurple-successTx mb-2">Most Viewed</h4>
                  <p className="text-sm text-royalPurple-successTx">
                    Statistics Worksheet Collection
                  </p>
                  <p className="text-xs text-royalPurple-successTx">156 views</p>
                </div>
                <div className="p-3 bg-royalPurple-pill rounded-lg">
                  <h4 className="font-medium text-royalPurple-pillTx mb-2">Recent Upload</h4>
                  <p className="text-sm text-royalPurple-pillTx">Trigonometry Reference Guide</p>
                  <p className="text-xs text-royalPurple-pillTx">2 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Material Categories Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Material Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-royalPurple-danger rounded-lg">
                <FileText className="h-8 w-8 text-royalPurple-dangerTx mx-auto mb-2" />
                <h4 className="font-medium text-royalPurple-dangerTx">Documents</h4>
                <p className="text-2xl font-bold text-royalPurple-dangerTx">3</p>
                <p className="text-sm text-royalPurple-dangerTx">PDFs & Docs</p>
              </div>
              <div className="text-center p-4 bg-royalPurple-accent rounded-lg">
                <Video className="h-8 w-8 text-royalPurple-accentTx mx-auto mb-2" />
                <h4 className="font-medium text-royalPurple-accentTx">Videos</h4>
                <p className="text-2xl font-bold text-royalPurple-accentTx">1</p>
                <p className="text-sm text-royalPurple-accentTx">Tutorials</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <FileText className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h4 className="font-medium text-orange-800">Presentations</h4>
                <p className="text-2xl font-bold text-orange-600">1</p>
                <p className="text-sm text-orange-600">Slides</p>
              </div>
              <div className="text-center p-4 bg-royalPurple-pill rounded-lg">
                <File className="h-8 w-8 text-royalPurple-pillTx mx-auto mb-2" />
                <h4 className="font-medium text-royalPurple-pillTx">Archives</h4>
                <p className="text-2xl font-bold text-royalPurple-pillTx">1</p>
                <p className="text-sm text-royalPurple-pillTx">ZIP Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
