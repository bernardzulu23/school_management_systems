'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Video, Image, Music, FileText, Mic, Camera, Upload, Play,
  Pause, SkipForward, SkipBack, Volume2, Edit3, Trash2, Plus,
  Save, Share2, Download, Eye, Clock, Users, BookOpen, Target
} from 'lucide-react'

export default function MultimediaLessonCreator() {
  const [currentLesson, setCurrentLesson] = useState({
    title: '',
    subject: '',
    grade: '',
    duration: 45,
    objectives: [],
    slides: []
  })

  const [selectedSlide, setSelectedSlide] = useState(0)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState([])

  // Slide templates
  const slideTemplates = [
    { id: 'title', name: 'Title Slide', icon: FileText, description: 'Lesson introduction' },
    { id: 'content', name: 'Content Slide', icon: BookOpen, description: 'Main content with text and media' },
    { id: 'video', name: 'Video Slide', icon: Video, description: 'Video-focused slide' },
    { id: 'interactive', name: 'Interactive Slide', icon: Users, description: 'Student interaction' },
    { id: 'assessment', name: 'Assessment Slide', icon: Target, description: 'Quiz or evaluation' },
    { id: 'summary', name: 'Summary Slide', icon: Clock, description: 'Lesson recap' }
  ]

  // Media types
  const mediaTypes = [
    { id: 'image', name: 'Image', icon: Image, accept: 'image/*' },
    { id: 'video', name: 'Video', icon: Video, accept: 'video/*' },
    { id: 'audio', name: 'Audio', icon: Music, accept: 'audio/*' },
    { id: 'document', name: 'Document', icon: FileText, accept: '.pdf,.doc,.docx,.ppt,.pptx' }
  ]

  const addSlide = (templateType) => {
    const newSlide = {
      id: Date.now(),
      type: templateType,
      title: `New ${templateType} Slide`,
      content: '',
      media: [],
      duration: 5,
      notes: '',
      interactions: []
    }

    setCurrentLesson(prev => ({
      ...prev,
      slides: [...prev.slides, newSlide]
    }))
    setSelectedSlide(currentLesson.slides.length)
  }

  const updateSlide = (slideIndex, updates) => {
    setCurrentLesson(prev => ({
      ...prev,
      slides: prev.slides.map((slide, index) => 
        index === slideIndex ? { ...slide, ...updates } : slide
      )
    }))
  }

  const deleteSlide = (slideIndex) => {
    setCurrentLesson(prev => ({
      ...prev,
      slides: prev.slides.filter((_, index) => index !== slideIndex)
    }))
    if (selectedSlide >= slideIndex && selectedSlide > 0) {
      setSelectedSlide(selectedSlide - 1)
    }
  }

  const addMediaToSlide = (mediaFile, mediaType) => {
    const mediaItem = {
      id: Date.now(),
      type: mediaType,
      name: mediaFile.name,
      url: URL.createObjectURL(mediaFile),
      size: mediaFile.size
    }

    updateSlide(selectedSlide, {
      media: [...(currentLesson.slides[selectedSlide]?.media || []), mediaItem]
    })
  }

  const addObjective = () => {
    const objective = prompt('Enter learning objective:')
    if (objective) {
      setCurrentLesson(prev => ({
        ...prev,
        objectives: [...prev.objectives, objective]
      }))
    }
  }

  const saveLesson = () => {
    // In a real app, this would save to the backend
    const lessonData = {
      ...currentLesson,
      createdAt: new Date().toISOString(),
      id: Date.now()
    }
    
    // Save to localStorage for demo
    const savedLessons = JSON.parse(localStorage.getItem('multimedia-lessons') || '[]')
    savedLessons.push(lessonData)
    localStorage.setItem('multimedia-lessons', JSON.stringify(savedLessons))
    
    alert('Lesson saved successfully!')
  }

  const exportLesson = () => {
    const lessonData = JSON.stringify(currentLesson, null, 2)
    const blob = new Blob([lessonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentLesson.title || 'lesson'}.json`
    link.click()
  }

  const currentSlideData = currentLesson.slides[selectedSlide]

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/60 border-slate-700/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Video className="h-5 w-5 mr-2 text-purple-400" />
              Multimedia Lesson Creator
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="bg-blue-600 text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPreviewMode ? 'Edit Mode' : 'Preview'}
              </Button>
              <Button onClick={saveLesson} className="bg-green-600 text-white">
                <Save className="h-4 w-4 mr-2" />
                Save Lesson
              </Button>
              <Button onClick={exportLesson} className="bg-purple-600 text-white">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lesson Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-700/40 rounded-lg">
            <div>
              <label className="text-slate-300 text-sm">Lesson Title</label>
              <input
                type="text"
                value={currentLesson.title}
                onChange={(e) => setCurrentLesson(prev => ({ ...prev, title: e.target.value }))}
                className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500"
                placeholder="Enter lesson title"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm">Subject</label>
              <select
                value={currentLesson.subject}
                onChange={(e) => setCurrentLesson(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500"
              >
                <option value="">Select Subject</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Geography">Geography</option>
                <option value="Art">Art</option>
                <option value="Music">Music</option>
              </select>
            </div>
            <div>
              <label className="text-slate-300 text-sm">Grade Level</label>
              <select
                value={currentLesson.grade}
                onChange={(e) => setCurrentLesson(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500"
              >
                <option value="">Select Grade</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Form 1">Form 1</option>
                <option value="Form 2">Form 2</option>
                <option value="Form 3">Form 3</option>
                <option value="Form 4">Form 4</option>
              </select>
            </div>
            <div>
              <label className="text-slate-300 text-sm">Duration (minutes)</label>
              <input
                type="number"
                value={currentLesson.duration}
                onChange={(e) => setCurrentLesson(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500"
                min="5"
                max="120"
              />
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="p-4 bg-slate-700/40 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Learning Objectives
              </h4>
              <Button onClick={addObjective} className="bg-purple-600 text-white text-sm px-3 py-1">
                <Plus className="h-4 w-4 mr-1" />
                Add Objective
              </Button>
            </div>
            <div className="space-y-2">
              {currentLesson.objectives.map((objective, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-600/40 rounded">
                  <span className="text-slate-300 text-sm">{objective}</span>
                  <Button
                    onClick={() => {
                      setCurrentLesson(prev => ({
                        ...prev,
                        objectives: prev.objectives.filter((_, i) => i !== index)
                      }))
                    }}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {currentLesson.objectives.length === 0 && (
                <p className="text-slate-400 text-sm italic">No objectives added yet</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Slide Templates */}
            <div className="lg:col-span-1">
              <h4 className="text-white font-medium mb-3 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </h4>
              <div className="space-y-2">
                {slideTemplates.map((template) => (
                  <Button
                    key={template.id}
                    onClick={() => addSlide(template.id)}
                    className="w-full justify-start bg-slate-700 text-white hover:bg-slate-600 p-3"
                  >
                    <template.icon className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{template.name}</div>
                      <div className="text-xs text-slate-400">{template.description}</div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* Media Upload */}
              <div className="mt-6">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Media
                </h4>
                <div className="space-y-2">
                  {mediaTypes.map((mediaType) => (
                    <div key={mediaType.id}>
                      <input
                        type="file"
                        accept={mediaType.accept}
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) addMediaToSlide(file, mediaType.id)
                        }}
                        className="hidden"
                        id={`upload-${mediaType.id}`}
                      />
                      <label
                        htmlFor={`upload-${mediaType.id}`}
                        className="flex items-center w-full p-2 bg-slate-700 text-white rounded cursor-pointer hover:bg-slate-600"
                      >
                        <mediaType.icon className="h-4 w-4 mr-2" />
                        {mediaType.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide Timeline */}
            <div className="lg:col-span-1">
              <h4 className="text-white font-medium mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Slide Timeline
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentLesson.slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => setSelectedSlide(index)}
                    className={`p-3 rounded cursor-pointer border-2 ${
                      selectedSlide === index 
                        ? 'border-purple-500 bg-purple-600/20' 
                        : 'border-slate-600 bg-slate-700/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{slide.title}</div>
                        <div className="text-slate-400 text-xs">{slide.type} • {slide.duration}min</div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSlide(index)
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {currentLesson.slides.length === 0 && (
                  <p className="text-slate-400 text-sm italic">No slides added yet</p>
                )}
              </div>
            </div>

            {/* Slide Editor */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-medium mb-3 flex items-center">
                <Edit3 className="h-4 w-4 mr-2" />
                Slide Editor
              </h4>
              {currentSlideData ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm">Slide Title</label>
                    <input
                      type="text"
                      value={currentSlideData.title}
                      onChange={(e) => updateSlide(selectedSlide, { title: e.target.value })}
                      className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-slate-300 text-sm">Content</label>
                    <textarea
                      value={currentSlideData.content}
                      onChange={(e) => updateSlide(selectedSlide, { content: e.target.value })}
                      className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500 h-32"
                      placeholder="Enter slide content..."
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm">Duration (minutes)</label>
                    <input
                      type="number"
                      value={currentSlideData.duration}
                      onChange={(e) => updateSlide(selectedSlide, { duration: parseInt(e.target.value) })}
                      className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500"
                      min="1"
                      max="30"
                    />
                  </div>

                  {/* Media in Slide */}
                  {currentSlideData.media && currentSlideData.media.length > 0 && (
                    <div>
                      <label className="text-slate-300 text-sm">Media Files</label>
                      <div className="mt-2 space-y-2">
                        {currentSlideData.media.map((media) => (
                          <div key={media.id} className="flex items-center justify-between p-2 bg-slate-600/40 rounded">
                            <div className="flex items-center">
                              {media.type === 'image' && <Image className="h-4 w-4 mr-2 text-blue-400" />}
                              {media.type === 'video' && <Video className="h-4 w-4 mr-2 text-red-400" />}
                              {media.type === 'audio' && <Music className="h-4 w-4 mr-2 text-green-400" />}
                              {media.type === 'document' && <FileText className="h-4 w-4 mr-2 text-yellow-400" />}
                              <span className="text-white text-sm">{media.name}</span>
                            </div>
                            <Button
                              onClick={() => {
                                updateSlide(selectedSlide, {
                                  media: currentSlideData.media.filter(m => m.id !== media.id)
                                })
                              }}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-300 text-sm">Teacher Notes</label>
                    <textarea
                      value={currentSlideData.notes}
                      onChange={(e) => updateSlide(selectedSlide, { notes: e.target.value })}
                      className="w-full mt-1 p-2 bg-slate-600 text-white rounded border border-slate-500 h-20"
                      placeholder="Add notes for this slide..."
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a slide to edit or add a new slide to get started</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
