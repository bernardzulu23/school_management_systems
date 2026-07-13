'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'
import {
  Video,
  Image as ImageIcon,
  Music,
  FileText,
  Mic,
  Camera,
  Upload,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Edit3,
  Trash2,
  Plus,
  Save,
  Share2,
  Download,
  Eye,
  Clock,
  Users,
  BookOpen,
  Target,
} from 'lucide-react'

const LOCAL_STORAGE_KEY = 'multimedia-lessons'

function payloadFromLesson(lesson) {
  return {
    title: String(lesson?.title || '').trim(),
    subject: String(lesson?.subject || '').trim(),
    grade: String(lesson?.grade || '').trim(),
    duration: Number(lesson?.duration) || 45,
    objectives: Array.isArray(lesson?.objectives) ? lesson.objectives : [],
    slides: Array.isArray(lesson?.slides) ? lesson.slides : [],
    status: 'SAVED',
  }
}

export default function MultimediaLessonCreator() {
  const [currentLesson, setCurrentLesson] = useState({
    title: '',
    subject: '',
    grade: '',
    duration: 45,
    objectives: [],
    slides: [],
  })

  const [selectedSlide, setSelectedSlide] = useState(0)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState([])
  const [savedLessonId, setSavedLessonId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [newObjective, setNewObjective] = useState('')

  useEffect(() => {
    let cancelled = false
    const migrate = async () => {
      if (typeof window === 'undefined') return
      let raw = []
      try {
        raw = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        return
      }
      if (!Array.isArray(raw) || raw.length === 0) return

      setMigrating(true)
      let migrated = 0
      let failed = 0
      for (const entry of raw) {
        if (cancelled) return
        const body = payloadFromLesson(entry)
        if (!body.title || !body.subject || !body.grade) {
          failed += 1
          continue
        }
        try {
          const res = await fetch('/api/multimedia-lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          })
          if (res.ok) migrated += 1
          else failed += 1
        } catch {
          failed += 1
        }
      }
      if (!cancelled) {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        if (migrated > 0) {
          toast.success(
            `Moved ${migrated} previously local lesson(s) to your account${
              failed ? ` (${failed} skipped)` : ''
            }`
          )
        } else if (failed > 0) {
          toast.error('Could not migrate local lessons — they were cleared from this browser')
        }
        setMigrating(false)
      }
    }
    migrate()
    return () => {
      cancelled = true
    }
  }, [])

  // Slide templates
  const slideTemplates = [
    { id: 'title', name: 'Title Slide', icon: FileText, description: 'Lesson introduction' },
    {
      id: 'content',
      name: 'Content Slide',
      icon: BookOpen,
      description: 'Main content with text and media',
    },
    { id: 'video', name: 'Video Slide', icon: Video, description: 'Video-focused slide' },
    {
      id: 'interactive',
      name: 'Interactive Slide',
      icon: Users,
      description: 'Student interaction',
    },
    { id: 'assessment', name: 'Assessment Slide', icon: Target, description: 'Quiz or evaluation' },
    { id: 'summary', name: 'Summary Slide', icon: Clock, description: 'Lesson recap' },
  ]

  // Media types
  const mediaTypes = [
    { id: 'image', name: 'Image', icon: ImageIcon, accept: 'image/*' },
    { id: 'video', name: 'Video', icon: Video, accept: 'video/*' },
    { id: 'audio', name: 'Audio', icon: Music, accept: 'audio/*' },
    { id: 'document', name: 'Document', icon: FileText, accept: '.pdf,.doc,.docx,.ppt,.pptx' },
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
      interactions: [],
    }

    setCurrentLesson((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }))
    setSelectedSlide(currentLesson.slides.length)
  }

  const updateSlide = (slideIndex, updates) => {
    setCurrentLesson((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, index) =>
        index === slideIndex ? { ...slide, ...updates } : slide
      ),
    }))
  }

  const deleteSlide = (slideIndex) => {
    setCurrentLesson((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, index) => index !== slideIndex),
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
      size: mediaFile.size,
    }

    updateSlide(selectedSlide, {
      media: [...(currentLesson.slides[selectedSlide]?.media || []), mediaItem],
    })
  }

  const addObjective = () => {
    const objective = newObjective.trim()
    if (!objective) {
      toast.error('Enter a learning objective')
      return
    }
    setCurrentLesson((prev) => ({
      ...prev,
      objectives: [...prev.objectives, objective],
    }))
    setNewObjective('')
  }

  const saveLesson = async () => {
    const body = payloadFromLesson(currentLesson)
    if (!body.title || !body.subject || !body.grade) {
      toast.error('Title, subject, and grade are required to save')
      return
    }

    setSaving(true)
    try {
      if (savedLessonId) {
        const res = await fetch(`/api/multimedia-lessons/${encodeURIComponent(savedLessonId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          toast.error(json?.error || 'Could not update lesson. Please try again.')
          return
        }
        toast.success('Lesson updated')
        return
      }

      const res = await fetch('/api/multimedia-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Could not save lesson. Please try again.')
        return
      }
      setSavedLessonId(json.data.id)
      toast.success('Lesson saved')
    } catch {
      toast.error('Could not save lesson. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
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
      <Card
        className="bg-royalPurple-card/60 border-royalPurple-border/40"
        as="section"
        aria-labelledby="lesson-creator-title"
      >
        <CardHeader>
          <CardTitle
            id="lesson-creator-title"
            className="text-royalPurple-text1 flex items-center justify-between"
          >
            <div className="flex items-center">
              <Video className="h-5 w-5 mr-2 text-royalPurple-pillTx" aria-hidden="true" />
              Multimedia Lesson Creator
            </div>
            <div className="flex items-center space-x-2" role="toolbar" aria-label="Lesson actions">
              <Button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="bg-royalPurple-accent text-royalPurple-text1"
                aria-pressed={isPreviewMode}
              >
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                {isPreviewMode ? 'Edit Mode' : 'Preview'}
              </Button>
              <Button
                onClick={saveLesson}
                disabled={saving || migrating}
                className="bg-royalPurple-success text-royalPurple-text1"
              >
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                {saving ? 'Saving…' : savedLessonId ? 'Update Lesson' : 'Save Lesson'}
              </Button>
              <Button onClick={exportLesson} className="bg-royalPurple-pill text-royalPurple-text1">
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lesson Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-royalPurple-muted/40 rounded-lg">
            <div>
              <label className="text-royalPurple-text2 text-sm">Lesson Title</label>
              <input
                type="text"
                value={currentLesson.title}
                onChange={(e) => setCurrentLesson((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border"
                placeholder="Enter lesson title"
              />
            </div>
            <div>
              <label className="text-royalPurple-text2 text-sm">Subject</label>
              <select
                value={currentLesson.subject}
                onChange={(e) => setCurrentLesson((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border"
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
              <label className="text-royalPurple-text2 text-sm">Grade Level</label>
              <select
                value={currentLesson.grade}
                onChange={(e) => setCurrentLesson((prev) => ({ ...prev, grade: e.target.value }))}
                className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border"
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
              <label className="text-royalPurple-text2 text-sm">Duration (minutes)</label>
              <input
                type="number"
                value={currentLesson.duration}
                onChange={(e) =>
                  setCurrentLesson((prev) => ({ ...prev, duration: parseInt(e.target.value) }))
                }
                className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border"
                min="5"
                max="120"
              />
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="p-4 bg-royalPurple-muted/40 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-royalPurple-text1 font-medium flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Learning Objectives
              </h4>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addObjective()
                  }
                }}
                placeholder="Enter learning objective…"
                className="flex-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border text-sm"
              />
              <Button
                type="button"
                onClick={addObjective}
                className="bg-royalPurple-pill text-royalPurple-text1 text-sm px-3 py-1 shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {currentLesson.objectives.map((objective, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-royalPurple-muted/40 rounded"
                >
                  <span className="text-royalPurple-text2 text-sm">{objective}</span>
                  <Button
                    onClick={() => {
                      setCurrentLesson((prev) => ({
                        ...prev,
                        objectives: prev.objectives.filter((_, i) => i !== index),
                      }))
                    }}
                    className="text-royalPurple-dangerTx hover:text-royalPurple-dangerTx p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {currentLesson.objectives.length === 0 && (
                <p className="text-royalPurple-text3 text-sm italic">No objectives added yet</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Slide Templates */}
            <div className="lg:col-span-1">
              <h4 className="text-royalPurple-text1 font-medium mb-3 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </h4>
              <div className="space-y-2">
                {slideTemplates.map((template) => (
                  <Button
                    key={template.id}
                    onClick={() => addSlide(template.id)}
                    className="w-full justify-start bg-royalPurple-muted text-royalPurple-text1 hover:bg-royalPurple-muted p-3"
                  >
                    <template.icon className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{template.name}</div>
                      <div className="text-xs text-royalPurple-text3">{template.description}</div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* Media Upload */}
              <div className="mt-6">
                <h4 className="text-royalPurple-text1 font-medium mb-3 flex items-center">
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
                        className="flex items-center w-full p-2 bg-royalPurple-muted text-royalPurple-text1 rounded cursor-pointer hover:bg-royalPurple-muted"
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
              <h4 className="text-royalPurple-text1 font-medium mb-3 flex items-center">
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
                        ? 'border-royalPurple-border2 bg-royalPurple-pill/20'
                        : 'border-royalPurple-border bg-royalPurple-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-royalPurple-text1 text-sm font-medium">
                          {slide.title}
                        </div>
                        <div className="text-royalPurple-text3 text-xs">
                          {slide.type} • {slide.duration}min
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSlide(index)
                        }}
                        className="text-royalPurple-dangerTx hover:text-royalPurple-dangerTx p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {currentLesson.slides.length === 0 && (
                  <p className="text-royalPurple-text3 text-sm italic">No slides added yet</p>
                )}
              </div>
            </div>

            {/* Slide Editor */}
            <div className="lg:col-span-2">
              <h4 className="text-royalPurple-text1 font-medium mb-3 flex items-center">
                <Edit3 className="h-4 w-4 mr-2" />
                Slide Editor
              </h4>
              {currentSlideData ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-royalPurple-text2 text-sm">Slide Title</label>
                    <input
                      type="text"
                      value={currentSlideData.title}
                      onChange={(e) => updateSlide(selectedSlide, { title: e.target.value })}
                      className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border"
                    />
                  </div>

                  <div>
                    <label className="text-royalPurple-text2 text-sm">Content</label>
                    <textarea
                      value={currentSlideData.content}
                      onChange={(e) => updateSlide(selectedSlide, { content: e.target.value })}
                      className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border h-32"
                      placeholder="Enter slide content..."
                    />
                  </div>

                  <div>
                    <label className="text-royalPurple-text2 text-sm">Duration (minutes)</label>
                    <input
                      type="number"
                      value={currentSlideData.duration}
                      onChange={(e) =>
                        updateSlide(selectedSlide, { duration: parseInt(e.target.value) })
                      }
                      className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border"
                      min="1"
                      max="30"
                    />
                  </div>

                  {/* Media in Slide */}
                  {currentSlideData.media && currentSlideData.media.length > 0 && (
                    <div>
                      <label className="text-royalPurple-text2 text-sm">Media Files</label>
                      <div className="mt-2 space-y-2">
                        {currentSlideData.media.map((media) => (
                          <div
                            key={media.id}
                            className="flex items-center justify-between p-2 bg-royalPurple-muted/40 rounded"
                          >
                            <div className="flex items-center">
                              {media.type === 'image' && (
                                <>
                                  <ImageIcon className="h-4 w-4 mr-2 text-royalPurple-accentTx" />
                                  <div className="relative h-8 w-8 mr-2 overflow-hidden rounded">
                                    <Image
                                      src={media.url}
                                      alt={media.name || 'Slide image'}
                                      fill
                                      className="object-cover"
                                      sizes="32px"
                                    />
                                  </div>
                                </>
                              )}
                              {media.type === 'video' && (
                                <Video className="h-4 w-4 mr-2 text-royalPurple-dangerTx" />
                              )}
                              {media.type === 'audio' && (
                                <Music className="h-4 w-4 mr-2 text-royalPurple-successTx" />
                              )}
                              {media.type === 'document' && (
                                <FileText className="h-4 w-4 mr-2 text-yellow-400" />
                              )}
                              <span className="text-royalPurple-text1 text-sm">{media.name}</span>
                            </div>
                            <Button
                              onClick={() => {
                                updateSlide(selectedSlide, {
                                  media: currentSlideData.media.filter((m) => m.id !== media.id),
                                })
                              }}
                              className="text-royalPurple-dangerTx hover:text-royalPurple-dangerTx p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-royalPurple-text2 text-sm">Teacher Notes</label>
                    <textarea
                      value={currentSlideData.notes}
                      onChange={(e) => updateSlide(selectedSlide, { notes: e.target.value })}
                      className="w-full mt-1 p-2 bg-royalPurple-muted text-royalPurple-text1 rounded border border-royalPurple-border h-20"
                      placeholder="Add notes for this slide..."
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-royalPurple-text3">
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
