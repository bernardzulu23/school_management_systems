'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Palette, Video, Globe, Trophy, BookOpen, Lightbulb, Beaker,
  Calculator, Wrench, Code, BarChart3, Microscope, Atom,
  Rocket, Brain, Music, Camera, Mic, FileText, Users, Star,
  Play, Pause, Settings, Download, Share2, Plus, Eye, Award
} from 'lucide-react'

// Import feature components
import InteractiveWhiteboard from './InteractiveWhiteboard'
import MultimediaLessonCreator from './MultimediaLessonCreator'
import VirtualFieldTrips from './VirtualFieldTrips'
import StudentWorkShowcase from './StudentWorkShowcase'

export default function CreativeTeachingHub() {
  const [activeFeature, setActiveFeature] = useState('overview')
  const [userRole, setUserRole] = useState('teacher') // teacher, student, hod, headteacher

  // Creative Teaching & STEM Features
  const features = [
    {
      id: 'whiteboard',
      name: 'Interactive Whiteboard',
      icon: Palette,
      description: 'Digital drawing, annotation, and collaboration tools',
      category: 'creative',
      component: InteractiveWhiteboard,
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '5-30 minutes'
    },
    {
      id: 'lesson-creator',
      name: 'Multimedia Lesson Creator',
      icon: Video,
      description: 'Create engaging lessons with video, audio, and interactive content',
      category: 'creative',
      component: MultimediaLessonCreator,
      roles: ['teacher', 'hod'],
      difficulty: 'Intermediate',
      estimatedTime: '30-60 minutes'
    },
    {
      id: 'virtual-trips',
      name: 'Virtual Field Trips',
      icon: Globe,
      description: 'Explore Zambian landmarks and global destinations virtually',
      category: 'creative',
      component: VirtualFieldTrips,
      roles: ['teacher', 'student', 'hod'],
      difficulty: 'Beginner',
      estimatedTime: '20-45 minutes'
    },
    {
      id: 'work-showcase',
      name: 'Student Work Showcase',
      icon: Trophy,
      description: 'Display and celebrate student achievements and creativity',
      category: 'creative',
      component: StudentWorkShowcase,
      roles: ['teacher', 'student', 'hod', 'headteacher'],
      difficulty: 'Beginner',
      estimatedTime: '10-20 minutes'
    },
    {
      id: 'project-templates',
      name: 'Creative Project Templates',
      icon: BookOpen,
      description: 'Pre-built templates for various creative projects',
      category: 'creative',
      component: null,
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '15-45 minutes'
    },
    {
      id: 'storytelling',
      name: 'Digital Storytelling Platform',
      icon: Lightbulb,
      description: 'Create and share digital stories with multimedia elements',
      category: 'creative',
      component: null,
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '30-60 minutes'
    },
    {
      id: 'art-music',
      name: 'Art & Music Integration',
      icon: Music,
      description: 'Creative arts tools and music education features',
      category: 'creative',
      component: null,
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '20-40 minutes'
    },
    {
      id: 'science-experiments',
      name: 'Science Experiment Database',
      icon: Beaker,
      description: 'Comprehensive library of science experiments and procedures',
      category: 'stem',
      component: null,
      roles: ['teacher', 'student', 'hod'],
      difficulty: 'Intermediate',
      estimatedTime: '30-90 minutes'
    },
    {
      id: 'math-problems',
      name: 'Mathematics Problem Bank',
      icon: Calculator,
      description: 'Extensive collection of math problems with step-by-step solutions',
      category: 'stem',
      component: null,
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '15-45 minutes'
    },
    {
      id: 'engineering-challenges',
      name: 'Engineering Design Challenges',
      icon: Wrench,
      description: 'STEM project challenges and design thinking exercises',
      category: 'stem',
      component: null,
      roles: ['teacher', 'student', 'hod'],
      difficulty: 'Advanced',
      estimatedTime: '60-120 minutes'
    },
    {
      id: 'tech-integration',
      name: 'Technology Integration Tools',
      icon: Code,
      description: 'Digital tools and coding education features',
      category: 'stem',
      component: null,
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '30-90 minutes'
    },
    {
      id: 'data-collection',
      name: 'Scientific Data Collection',
      icon: BarChart3,
      description: 'Tools for gathering and analyzing scientific data',
      category: 'stem',
      component: null,
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '20-60 minutes'
    },
    {
      id: 'scientific-method',
      name: 'Scientific Method Tracker',
      icon: Microscope,
      description: 'Step-by-step guidance through the scientific process',
      category: 'stem',
      component: null,
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '30-60 minutes'
    }
  ]

  // Filter features based on user role
  const availableFeatures = features.filter(feature => 
    feature.roles.includes(userRole)
  )

  const creativeFeatures = availableFeatures.filter(f => f.category === 'creative')
  const stemFeatures = availableFeatures.filter(f => f.category === 'stem')

  const renderFeatureComponent = () => {
    const feature = features.find(f => f.id === activeFeature)
    if (feature && feature.component) {
      const FeatureComponent = feature.component
      return <FeatureComponent />
    }
    return null
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-400 bg-green-600/20'
      case 'Intermediate': return 'text-yellow-400 bg-yellow-600/20'
      case 'Advanced': return 'text-red-400 bg-red-600/20'
      default: return 'text-slate-400 bg-slate-600/20'
    }
  }

  if (activeFeature !== 'overview') {
    return (
      <div className="space-y-6">
        {/* Feature Navigation */}
        <Card className="bg-slate-800/60 border-slate-700/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setActiveFeature('overview')}
                className="bg-slate-600 text-white"
              >
                ← Back to Creative Teaching Hub
              </Button>
              <div className="text-white">
                <span className="text-slate-400">Current Feature: </span>
                <span className="font-medium">
                  {features.find(f => f.id === activeFeature)?.name}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Component */}
        {renderFeatureComponent()}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/60 border-slate-700/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Rocket className="h-5 w-5 mr-2 text-purple-400" />
              Creative Teaching & STEM Features Hub
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
              >
                <option value="teacher">Teacher View</option>
                <option value="student">Student View</option>
                <option value="hod">HOD View</option>
                <option value="headteacher">Headteacher View</option>
              </select>
              <Button className="bg-blue-600 text-white">
                <Settings className="h-4 w-4 mr-2" />
                Customize Hub
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hub Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-700/60 border-slate-600/40">
              <CardContent className="p-4 text-center">
                <Palette className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-white">{creativeFeatures.length}</div>
                <div className="text-slate-400 text-sm">Creative Tools</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-700/60 border-slate-600/40">
              <CardContent className="p-4 text-center">
                <Atom className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold text-white">{stemFeatures.length}</div>
                <div className="text-slate-400 text-sm">STEM Features</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-700/60 border-slate-600/40">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold text-white">{availableFeatures.length}</div>
                <div className="text-slate-400 text-sm">Available Features</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-700/60 border-slate-600/40">
              <CardContent className="p-4 text-center">
                <Star className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-white">4.8</div>
                <div className="text-slate-400 text-sm">Average Rating</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Features */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-400" />
              Quick Access - Most Popular
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableFeatures.slice(0, 4).map((feature) => (
                <Card key={feature.id} className="bg-slate-700/60 border-slate-600/40 hover:border-purple-500/60 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <feature.icon className="h-12 w-12 mx-auto mb-3 text-purple-400" />
                      <h4 className="text-white font-medium mb-2">{feature.name}</h4>
                      <p className="text-slate-400 text-sm mb-3 line-clamp-2">{feature.description}</p>
                      <Button
                        onClick={() => setActiveFeature(feature.id)}
                        className="w-full bg-purple-600 text-white"
                        disabled={!feature.component}
                      >
                        {feature.component ? 'Launch' : 'Coming Soon'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Creative Teaching Tools */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Palette className="h-5 w-5 mr-2 text-purple-400" />
              Creative Teaching Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creativeFeatures.map((feature) => (
                <Card key={feature.id} className="bg-slate-700/60 border-slate-600/40 hover:border-purple-500/60 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <feature.icon className="h-8 w-8 text-purple-400 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{feature.name}</h4>
                        <p className="text-slate-400 text-sm mb-3">{feature.description}</p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(feature.difficulty)}`}>
                            {feature.difficulty}
                          </span>
                          <span className="text-slate-400 text-xs">{feature.estimatedTime}</span>
                        </div>

                        <Button
                          onClick={() => setActiveFeature(feature.id)}
                          className="w-full bg-purple-600 text-white"
                          disabled={!feature.component}
                        >
                          {feature.component ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Launch Tool
                            </>
                          ) : (
                            'Coming Soon'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* STEM Features */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Atom className="h-5 w-5 mr-2 text-blue-400" />
              STEM Learning Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stemFeatures.map((feature) => (
                <Card key={feature.id} className="bg-slate-700/60 border-slate-600/40 hover:border-blue-500/60 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <feature.icon className="h-8 w-8 text-blue-400 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{feature.name}</h4>
                        <p className="text-slate-400 text-sm mb-3">{feature.description}</p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(feature.difficulty)}`}>
                            {feature.difficulty}
                          </span>
                          <span className="text-slate-400 text-xs">{feature.estimatedTime}</span>
                        </div>

                        <Button
                          onClick={() => setActiveFeature(feature.id)}
                          className="w-full bg-blue-600 text-white"
                          disabled={!feature.component}
                        >
                          {feature.component ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Launch Tool
                            </>
                          ) : (
                            'Coming Soon'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Feature Development Roadmap */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-green-400" />
              Development Roadmap
            </h3>
            <Card className="bg-slate-700/60 border-slate-600/40">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Phase 1: Core Creative Tools</h4>
                      <p className="text-slate-400 text-sm">Interactive Whiteboard, Multimedia Lessons, Virtual Trips, Work Showcase</p>
                    </div>
                    <span className="bg-green-600 text-white px-3 py-1 rounded text-sm">✓ Complete</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Phase 2: Advanced Creative Features</h4>
                      <p className="text-slate-400 text-sm">Project Templates, Digital Storytelling, Art & Music Integration</p>
                    </div>
                    <span className="bg-yellow-600 text-white px-3 py-1 rounded text-sm">In Progress</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Phase 3: STEM Laboratory</h4>
                      <p className="text-slate-400 text-sm">Science Experiments, Math Problems, Engineering Challenges</p>
                    </div>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Planned</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Phase 4: Technology Integration</h4>
                      <p className="text-slate-400 text-sm">Coding Tools, Data Collection, Scientific Method Tracking</p>
                    </div>
                    <span className="bg-purple-600 text-white px-3 py-1 rounded text-sm">Future</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
