'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Image, Video, FileText, Mic, Camera, Upload, Eye, Heart,
  MessageCircle, Share2, Download, Star, Award, Filter,
  Search, Grid, List, Calendar, User, BookOpen, Palette,
  Trophy, ThumbsUp, Flag, Edit, Trash2, Plus
} from 'lucide-react'

export default function StudentWorkShowcase() {
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWork, setSelectedWork] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Sample student work data (in production, this would come from API)
  const studentWorks = [
    {
      id: 1,
      title: 'Traditional Zambian Pottery',
      student: 'Mwila Banda',
      grade: 'Grade 7',
      subject: 'Art',
      category: 'visual-art',
      type: 'image',
      thumbnail: '/api/placeholder/300/200',
      description: 'A beautiful clay pot inspired by traditional Lozi pottery techniques',
      uploadDate: '2024-01-15',
      likes: 24,
      comments: 8,
      views: 156,
      featured: true,
      tags: ['pottery', 'traditional', 'lozi', 'clay'],
      teacher: 'Mrs. Mulenga',
      awards: ['Best Traditional Art', 'Student Choice Award']
    },
    {
      id: 2,
      title: 'The Water Cycle in Zambia',
      student: 'Chipo Mwanza',
      grade: 'Grade 5',
      subject: 'Science',
      category: 'presentation',
      type: 'video',
      thumbnail: '/api/placeholder/300/200',
      description: 'An animated explanation of how the water cycle affects Zambias climate',
      uploadDate: '2024-01-12',
      likes: 31,
      comments: 12,
      views: 203,
      featured: false,
      tags: ['water-cycle', 'climate', 'animation', 'science'],
      teacher: 'Mr. Phiri',
      awards: []
    },
    {
      id: 3,
      title: 'My Village Story',
      student: 'Temba Sakala',
      grade: 'Grade 4',
      subject: 'English',
      category: 'writing',
      type: 'document',
      thumbnail: '/api/placeholder/300/200',
      description: 'A creative story about life in a rural Zambian village',
      uploadDate: '2024-01-10',
      likes: 18,
      comments: 6,
      views: 89,
      featured: false,
      tags: ['creative-writing', 'village', 'story', 'culture'],
      teacher: 'Ms. Zulu',
      awards: ['Creative Writing Excellence']
    },
    {
      id: 4,
      title: 'Bemba Language Poem',
      student: 'Natasha Mulenga',
      grade: 'Form 2',
      subject: 'Local Languages',
      category: 'audio',
      type: 'audio',
      thumbnail: '/api/placeholder/300/200',
      description: 'An original poem in Bemba about the beauty of Zambian nature',
      uploadDate: '2024-01-08',
      likes: 27,
      comments: 9,
      views: 134,
      featured: true,
      tags: ['bemba', 'poetry', 'nature', 'language'],
      teacher: 'Mr. Banda',
      awards: ['Best Local Language Work']
    },
    {
      id: 5,
      title: 'Solar System Model',
      student: 'David Chilufya',
      grade: 'Grade 6',
      subject: 'Science',
      category: 'project',
      type: 'image',
      thumbnail: '/api/placeholder/300/200',
      description: 'A 3D model of the solar system made from recycled materials',
      uploadDate: '2024-01-05',
      likes: 42,
      comments: 15,
      views: 278,
      featured: true,
      tags: ['solar-system', 'recycled', '3d-model', 'space'],
      teacher: 'Mrs. Tembo',
      awards: ['Innovation Award', 'Environmental Consciousness']
    },
    {
      id: 6,
      title: 'Traditional Dance Performance',
      student: 'Grace Mwape',
      grade: 'Form 1',
      subject: 'Cultural Studies',
      category: 'performance',
      type: 'video',
      thumbnail: '/api/placeholder/300/200',
      description: 'A performance of the traditional Tonga dance with cultural explanation',
      uploadDate: '2024-01-03',
      likes: 56,
      comments: 22,
      views: 445,
      featured: true,
      tags: ['dance', 'tonga', 'culture', 'performance'],
      teacher: 'Mr. Siame',
      awards: ['Cultural Heritage Award']
    }
  ]

  const categories = [
    { id: 'all', name: 'All Categories', icon: Grid },
    { id: 'visual-art', name: 'Visual Art', icon: Palette },
    { id: 'writing', name: 'Writing', icon: FileText },
    { id: 'presentation', name: 'Presentations', icon: Eye },
    { id: 'audio', name: 'Audio', icon: Mic },
    { id: 'project', name: 'Projects', icon: Award },
    { id: 'performance', name: 'Performances', icon: Video }
  ]

  const grades = [
    'all', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
    'Grade 6', 'Grade 7', 'Form 1', 'Form 2', 'Form 3', 'Form 4'
  ]

  const filteredWorks = studentWorks.filter(work => {
    const matchesCategory = selectedCategory === 'all' || work.category === selectedCategory
    const matchesGrade = selectedGrade === 'all' || work.grade === selectedGrade
    const matchesSearch = work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         work.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         work.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesCategory && matchesGrade && matchesSearch
  })

  const featuredWorks = studentWorks.filter(work => work.featured)

  const likeWork = (workId) => {
    // In a real app, this would update the backend
    console.log(`Liked work ${workId}`)
  }

  const shareWork = (work) => {
    // In a real app, this would generate a shareable link
    navigator.clipboard.writeText(`Check out "${work.title}" by ${work.student}`)
    alert('Link copied to clipboard!')
  }

  const downloadWork = (work) => {
    // In a real app, this would download the actual file
    console.log(`Downloading ${work.title}`)
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return Image
      case 'video': return Video
      case 'audio': return Mic
      case 'document': return FileText
      default: return FileText
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/60 border-slate-700/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-purple-400" />
              Student Work Showcase
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-purple-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Work
              </Button>
              <Button className="bg-blue-600 text-white">
                <Award className="h-4 w-4 mr-2" />
                Awards Gallery
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Featured Works Section */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-400" />
              Featured Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredWorks.slice(0, 3).map((work) => {
                const TypeIcon = getTypeIcon(work.type)
                return (
                  <Card key={work.id} className="bg-slate-700/60 border-slate-600/40 overflow-hidden">
                    <div className="relative">
                      <img 
                        src={work.thumbnail} 
                        alt={work.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold">
                        FEATURED
                      </div>
                      <div className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded">
                        <TypeIcon className="h-4 w-4" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="text-white font-medium text-sm mb-1">{work.title}</h4>
                      <p className="text-slate-400 text-xs mb-2">by {work.student} • {work.grade}</p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 text-slate-400">
                          <span className="flex items-center">
                            <Heart className="h-3 w-3 mr-1" />
                            {work.likes}
                          </span>
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {work.views}
                          </span>
                        </div>
                        <Button
                          onClick={() => setSelectedWork(work)}
                          className="bg-purple-600 text-white text-xs px-2 py-1"
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Filters and Search */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search works, students, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 w-64"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
              >
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade === 'all' ? 'All Grades' : grade}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-2 ml-auto">
                <Button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-purple-600' : 'bg-slate-600'} text-white`}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-purple-600' : 'bg-slate-600'} text-white`}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Works Display */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                All Works ({filteredWorks.length})
              </h3>
              <div className="text-slate-400 text-sm">
                Showing {filteredWorks.length} of {studentWorks.length} works
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredWorks.map((work) => {
                  const TypeIcon = getTypeIcon(work.type)
                  return (
                    <Card key={work.id} className="bg-slate-700/60 border-slate-600/40 overflow-hidden">
                      <div className="relative">
                        <img 
                          src={work.thumbnail} 
                          alt={work.title}
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded">
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        {work.featured && (
                          <div className="absolute top-2 left-2 bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                            FEATURED
                          </div>
                        )}
                        {work.awards.length > 0 && (
                          <div className="absolute bottom-2 left-2 bg-green-600 text-white p-1 rounded">
                            <Award className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h4 className="text-white font-medium mb-1">{work.title}</h4>
                        <p className="text-slate-400 text-sm mb-2">by {work.student}</p>
                        <p className="text-slate-300 text-xs mb-3 line-clamp-2">{work.description}</p>
                        
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span>{work.grade} • {work.subject}</span>
                          <span>{new Date(work.uploadDate).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 text-slate-400 text-sm">
                            <button
                              onClick={() => likeWork(work.id)}
                              className="flex items-center hover:text-red-400"
                            >
                              <Heart className="h-4 w-4 mr-1" />
                              {work.likes}
                            </button>
                            <span className="flex items-center">
                              <MessageCircle className="h-4 w-4 mr-1" />
                              {work.comments}
                            </span>
                            <span className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              {work.views}
                            </span>
                          </div>
                          <Button
                            onClick={() => setSelectedWork(work)}
                            className="bg-purple-600 text-white text-sm px-3 py-1"
                          >
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWorks.map((work) => {
                  const TypeIcon = getTypeIcon(work.type)
                  return (
                    <Card key={work.id} className="bg-slate-700/60 border-slate-600/40">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={work.thumbnail} 
                            alt={work.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-white font-medium">{work.title}</h4>
                              <TypeIcon className="h-4 w-4 text-slate-400" />
                              {work.featured && (
                                <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                                  FEATURED
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm mb-1">
                              by {work.student} • {work.grade} • {work.subject}
                            </p>
                            <p className="text-slate-300 text-sm mb-2">{work.description}</p>
                            <div className="flex items-center space-x-4 text-slate-400 text-sm">
                              <span className="flex items-center">
                                <Heart className="h-3 w-3 mr-1" />
                                {work.likes}
                              </span>
                              <span className="flex items-center">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                {work.comments}
                              </span>
                              <span className="flex items-center">
                                <Eye className="h-3 w-3 mr-1" />
                                {work.views}
                              </span>
                              <span>{new Date(work.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => likeWork(work.id)}
                              className="bg-slate-600 text-white p-2"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => shareWork(work)}
                              className="bg-slate-600 text-white p-2"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setSelectedWork(work)}
                              className="bg-purple-600 text-white px-4 py-2"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {filteredWorks.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No works found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Detail Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div>
                  <h2 className="text-xl">{selectedWork.title}</h2>
                  <p className="text-slate-400 text-sm">by {selectedWork.student} • {selectedWork.grade}</p>
                </div>
                <Button
                  onClick={() => setSelectedWork(null)}
                  className="bg-slate-600 text-white"
                >
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Work Display */}
              <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    {selectedWork.type === 'image' && '🖼️'}
                    {selectedWork.type === 'video' && '🎥'}
                    {selectedWork.type === 'audio' && '🎵'}
                    {selectedWork.type === 'document' && '📄'}
                  </div>
                  <p className="text-white text-lg">{selectedWork.title}</p>
                  <p className="text-slate-400">Click to view full {selectedWork.type}</p>
                </div>
              </div>

              {/* Work Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-medium mb-3">Description</h3>
                  <p className="text-slate-300 mb-4">{selectedWork.description}</p>
                  
                  <h3 className="text-white font-medium mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedWork.tags.map((tag, index) => (
                      <span key={index} className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {selectedWork.awards.length > 0 && (
                    <>
                      <h3 className="text-white font-medium mb-3">Awards</h3>
                      <div className="space-y-2">
                        {selectedWork.awards.map((award, index) => (
                          <div key={index} className="flex items-center bg-yellow-600/20 text-yellow-300 px-3 py-2 rounded">
                            <Award className="h-4 w-4 mr-2" />
                            {award}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-white font-medium mb-3">Work Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Student:</span>
                      <span className="text-white">{selectedWork.student}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Grade:</span>
                      <span className="text-white">{selectedWork.grade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subject:</span>
                      <span className="text-white">{selectedWork.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Teacher:</span>
                      <span className="text-white">{selectedWork.teacher}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Upload Date:</span>
                      <span className="text-white">{new Date(selectedWork.uploadDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Views:</span>
                      <span className="text-white">{selectedWork.views}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Likes:</span>
                      <span className="text-white">{selectedWork.likes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Comments:</span>
                      <span className="text-white">{selectedWork.comments}</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button
                      onClick={() => likeWork(selectedWork.id)}
                      className="w-full bg-red-600 text-white"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Like This Work
                    </Button>
                    <Button
                      onClick={() => shareWork(selectedWork)}
                      className="w-full bg-blue-600 text-white"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Work
                    </Button>
                    <Button
                      onClick={() => downloadWork(selectedWork)}
                      className="w-full bg-green-600 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
