'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import {
  Palette,
  Video,
  Globe,
  Trophy,
  BookOpen,
  Lightbulb,
  Beaker,
  Calculator,
  Wrench,
  Code,
  BarChart3,
  Microscope,
  Atom,
  Rocket,
  Brain,
  Music,
  Camera,
  Mic,
  FileText,
  Users,
  Star,
  Play,
  Pause,
  Settings,
  Download,
  Share2,
  Plus,
  Eye,
  Award,
  PenTool,
  FlaskConical,
  Box,
} from 'lucide-react'

// Import feature components
import InteractiveWhiteboard from './InteractiveWhiteboard'
import MultimediaLessonCreator from './MultimediaLessonCreator'
import VirtualFieldTrips from './VirtualFieldTrips'
import StudentWorkShowcase from './StudentWorkShowcase'
import AIStoryWeaver from './AIStoryWeaver'
import DigitalMusicComposer from './DigitalMusicComposer'
import VirtualScienceLab from './VirtualScienceLab'
import CodePlayground from './CodePlayground'

const iconMap = {
  Palette,
  Video,
  Globe,
  Trophy,
  BookOpen,
  Lightbulb,
  Beaker,
  Calculator,
  Wrench,
  Code,
  BarChart3,
  Microscope,
  Atom,
  Rocket,
  Brain,
  Music,
  Camera,
  Mic,
  FileText,
  Users,
  Star,
  Play,
  Pause,
  Settings,
  Download,
  Share2,
  Plus,
  Eye,
  Award,
  PenTool,
  FlaskConical,
  Box,
}

/** Production-ready — no Beta badge */
const PRODUCTION_FEATURE_IDS = new Set(['ai_lesson_planner', 'ai_quiz_maker', 'ecz_practice'])

function FeatureBetaBadge({ featureId }) {
  if (PRODUCTION_FEATURE_IDS.has(featureId)) return null
  return (
    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500 text-white">
      Beta
    </span>
  )
}

const componentMap = {
  interactive_whiteboard: InteractiveWhiteboard,
  ai_story_generator: AIStoryWeaver,
  music_composer: DigitalMusicComposer,
  virtual_lab: VirtualScienceLab,
  code_playground: CodePlayground,
  virtual_field_trips: VirtualFieldTrips,
  student_work_showcase: StudentWorkShowcase,
  multimedia_lesson_creator: MultimediaLessonCreator,
}

export default function CreativeTeachingHub() {
  const router = useRouter()
  const [activeFeature, setActiveFeature] = useState('overview')

  const { data: apiFeatures, isLoading } = useQuery({
    queryKey: ['creative-features'],
    queryFn: async () => {
      const res = await api.getCreativeFeatures()
      return res.data
    },
  })

  // Map DB features to frontend components and icons
  const features = (apiFeatures?.all || []).map((f) => ({
    ...f,
    id: f.featureId, // Map featureId to id for frontend compatibility
    icon: iconMap[f.iconName] || Star,
    component: componentMap[f.featureId] || null,
  }))

  // Filter features based on user role
  const availableFeatures = features.filter((feature) => {
    return true
  })

  const creativeFeatures = availableFeatures.filter((f) => f.category === 'creative')
  const stemFeatures = availableFeatures.filter((f) => f.category === 'stem')

  const accessLabel = useMemo(() => {
    return (access) => {
      const a = String(access || '').toLowerCase()
      if (a === 'full') return 'Full'
      if (a === 'partial') return 'Limited'
      if (a === 'view') return 'Read-only'
      return ''
    }
  }, [])

  const canLaunch = useMemo(() => {
    return (feature) => {
      if (!feature?.component) return false
      const a = String(feature?.access || '').toLowerCase()
      if (a === 'view') return false
      return true
    }
  }, [])

  const renderFeatureComponent = () => {
    const feature = features.find((f) => f.id === activeFeature)
    if (feature && feature.component) {
      const FeatureComponent = feature.component
      return <FeatureComponent />
    }
    return null
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return 'text-royalPurple-successTx bg-royalPurple-success/20'
      case 'Intermediate':
        return 'text-yellow-400 bg-yellow-600/20'
      case 'Advanced':
        return 'text-royalPurple-dangerTx bg-royalPurple-danger/20'
      default:
        return 'text-royalPurple-text3 bg-royalPurple-muted/20'
    }
  }

  if (activeFeature !== 'overview') {
    return (
      <div className="space-y-6">
        {/* Feature Navigation */}
        <Card className="bg-royalPurple-card/60 border-royalPurple-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setActiveFeature('overview')}
                className="bg-royalPurple-muted text-royalPurple-text1"
              >
                Back to Creative Teaching Hub
              </Button>
              <div className="text-royalPurple-text1">
                <span className="text-royalPurple-text3">Current Feature: </span>
                <span className="font-medium">
                  {features.find((f) => f.id === activeFeature)?.name}
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
      <p className="text-sm text-royalPurple-text3 text-center">
        Beta features are actively developed. Report issues to{' '}
        <a
          className="underline text-royalPurple-accentTx"
          href="mailto:support@bluepeacktechnologies.com"
        >
          support@bluepeacktechnologies.com
        </a>
        .
      </p>
      <Card className="bg-royalPurple-card/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
            <div className="flex items-center">
              <Rocket className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
              Creative Teaching & STEM Features Hub
            </div>
            {/* User role selector removed for Student Dashboard */}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hub Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
              <CardContent className="p-4 text-center">
                <Palette className="h-8 w-8 mx-auto mb-2 text-royalPurple-pillTx" />
                <div className="text-2xl font-bold text-royalPurple-text1">
                  {creativeFeatures.length}
                </div>
                <div className="text-royalPurple-text3 text-sm">Creative Tools</div>
              </CardContent>
            </Card>
            <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
              <CardContent className="p-4 text-center">
                <Atom className="h-8 w-8 mx-auto mb-2 text-royalPurple-accentTx" />
                <div className="text-2xl font-bold text-royalPurple-text1">
                  {stemFeatures.length}
                </div>
                <div className="text-royalPurple-text3 text-sm">STEM Features</div>
              </CardContent>
            </Card>
            <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-royalPurple-successTx" />
                <div className="text-2xl font-bold text-royalPurple-text1">
                  {availableFeatures.length}
                </div>
                <div className="text-royalPurple-text3 text-sm">Available Features</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Features */}
          <div>
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-400" />
              Quick Access - Most Popular
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableFeatures.slice(0, 4).map((feature) => (
                <Card
                  key={feature.id}
                  className="relative bg-royalPurple-muted/60 border-royalPurple-border/40 hover:border-royalPurple-border2/60 transition-colors cursor-pointer"
                >
                  <FeatureBetaBadge featureId={feature.id} />
                  <CardContent className="p-4">
                    <div className="text-center">
                      <feature.icon className="h-12 w-12 mx-auto mb-3 text-royalPurple-pillTx" />
                      <h4 className="text-royalPurple-text1 font-medium mb-2">{feature.name}</h4>
                      <p className="text-royalPurple-text3 text-sm mb-3 line-clamp-2">
                        {feature.description}
                      </p>
                      {feature.route ? (
                        <button
                          onClick={() => {
                            router.push(feature.route)
                            if (feature.component) setActiveFeature(feature.id)
                          }}
                          style={{
                            background: '#FF3B00',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 20px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            width: '100%',
                          }}
                        >
                          Open →
                        </button>
                      ) : (
                        <button
                          disabled
                          style={{
                            background: '#FFFFFF',
                            color: '#A8A7A2',
                            border: '1px solid #111111',
                            borderRadius: 8,
                            padding: '10px 20px',
                            width: '100%',
                          }}
                        >
                          Coming Soon
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Creative Teaching Tools */}
          <div>
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-4 flex items-center">
              <Palette className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
              Creative Teaching Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creativeFeatures.map((feature) => (
                <Card
                  key={feature.id}
                  className="relative bg-royalPurple-muted/60 border-royalPurple-border/40 hover:border-royalPurple-border2/60 transition-colors"
                >
                  <FeatureBetaBadge featureId={feature.id} />
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <feature.icon className="h-8 w-8 text-royalPurple-pillTx mt-1" />
                      <div className="flex-1">
                        <h4 className="text-royalPurple-text1 font-medium mb-1">{feature.name}</h4>
                        <p className="text-royalPurple-text3 text-sm mb-3">{feature.description}</p>

                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getDifficultyColor(feature.difficulty)}`}
                          >
                            {feature.difficulty}
                          </span>
                          <span className="text-royalPurple-text3 text-xs">
                            {feature.estimatedTime}
                          </span>
                        </div>

                        {feature.route ? (
                          <button
                            onClick={() => {
                              router.push(feature.route)
                              if (feature.component) setActiveFeature(feature.id)
                            }}
                            style={{
                              background: '#FF3B00',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              padding: '10px 20px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              width: '100%',
                            }}
                          >
                            Open →
                          </button>
                        ) : (
                          <button
                            disabled
                            style={{
                              background: '#FFFFFF',
                              color: '#A8A7A2',
                              border: '1px solid #111111',
                              borderRadius: 8,
                              padding: '10px 20px',
                              width: '100%',
                            }}
                          >
                            Coming Soon
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* STEM Features */}
          <div>
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-4 flex items-center">
              <Atom className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
              STEM Learning Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stemFeatures.map((feature) => (
                <Card
                  key={feature.id}
                  className="relative bg-royalPurple-muted/60 border-royalPurple-border/40 hover:border-royalPurple-border2/60 transition-colors"
                >
                  <FeatureBetaBadge featureId={feature.id} />
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <feature.icon className="h-8 w-8 text-royalPurple-accentTx mt-1" />
                      <div className="flex-1">
                        <h4 className="text-royalPurple-text1 font-medium mb-1">{feature.name}</h4>
                        <p className="text-royalPurple-text3 text-sm mb-3">{feature.description}</p>

                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getDifficultyColor(feature.difficulty)}`}
                          >
                            {feature.difficulty}
                          </span>
                          <span className="text-royalPurple-text3 text-xs">
                            {feature.estimatedTime}
                          </span>
                        </div>

                        {feature.route ? (
                          <button
                            onClick={() => {
                              router.push(feature.route)
                              if (feature.component) setActiveFeature(feature.id)
                            }}
                            style={{
                              background: '#FF3B00',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              padding: '10px 20px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              width: '100%',
                            }}
                          >
                            Open
                          </button>
                        ) : (
                          <button
                            disabled
                            style={{
                              background: '#FFFFFF',
                              color: '#A8A7A2',
                              border: '1px solid #111111',
                              borderRadius: 8,
                              padding: '10px 20px',
                              width: '100%',
                            }}
                          >
                            Coming Soon
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
