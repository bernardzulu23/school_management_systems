'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Brain, Glasses, Heart, Shield, Rocket, Zap, Globe, Cpu, Database,
  Cloud, Lock, Star, Play, Settings, Users, Target, Award, Lightbulb,
  Monitor, Headphones, Camera, Mic, BookOpen, GraduationCap, TrendingUp,
  Activity, Bell, CheckCircle, AlertTriangle, Sparkles, Atom, Beaker, Clock
} from 'lucide-react'

export default function InnovationHub() {
  const [activeFeature, setActiveFeature] = useState('overview')
  const [selectedDemo, setSelectedDemo] = useState(null)

  const innovationFeatures = [
    {
      id: 'ai-learning',
      name: '🚀 AI-Powered Learning Tools',
      icon: Brain,
      description: 'Intelligent tutoring, personalized learning paths, and automated assessment',
      color: 'from-blue-600 to-purple-600',
      status: 'beta',
      features: [
        'Smart Tutoring System',
        'Personalized Learning Paths',
        'Automated Essay Grading',
        'Learning Analytics & Predictions',
        'Intelligent Content Recommendations',
        'Adaptive Testing Engine'
      ],
      demoAvailable: true
    },
    {
      id: 'ar-vr',
      name: '🥽 AR/VR Integration',
      icon: Glasses,
      description: 'Immersive virtual classrooms and 3D learning experiences',
      color: 'from-green-600 to-teal-600',
      status: 'preview',
      features: [
        'Virtual Classroom Environments',
        '3D Interactive Models',
        'Immersive Field Trips',
        'VR Laboratory Simulations',
        'AR Textbook Overlays',
        'Collaborative Virtual Spaces'
      ],
      demoAvailable: true
    },
    {
      id: 'mental-health',
      name: '🧠 Mental Health Monitoring',
      icon: Heart,
      description: 'Student wellness tracking, stress monitoring, and support systems',
      color: 'from-pink-600 to-red-600',
      status: 'active',
      features: [
        'Wellness Check-ins',
        'Stress Level Monitoring',
        'Counseling Appointment System',
        'Mental Health Resources',
        'Early Intervention Alerts',
        'Peer Support Networks'
      ],
      demoAvailable: true
    },
    {
      id: 'blockchain',
      name: '🔗 Blockchain Credentials',
      icon: Shield,
      description: 'Secure, tamper-proof digital certificates and achievements',
      color: 'from-yellow-600 to-orange-600',
      status: 'development',
      features: [
        'Tamper-proof Certificates',
        'Decentralized Transcript Verification',
        'Smart Contract Achievements',
        'Portable Digital Credentials',
        'Employer Verification Portal',
        'Micro-credential Stacking'
      ],
      demoAvailable: false
    }
  ]

  const getStatusBadge = (status) => {
    const badges = {
      'active': { color: 'bg-green-500', text: 'Active' },
      'beta': { color: 'bg-blue-500', text: 'Beta' },
      'preview': { color: 'bg-purple-500', text: 'Preview' },
      'development': { color: 'bg-orange-500', text: 'In Development' }
    }
    const badge = badges[status] || badges['development']
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  const renderFeatureDetail = (feature) => {
    const IconComponent = feature.icon
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} mb-4`}>
            <IconComponent className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{feature.name}</h3>
          <p className="text-slate-300 mb-4">{feature.description}</p>
          {getStatusBadge(feature.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feature.features.map((item, index) => (
            <div key={index} className="flex items-center p-3 bg-slate-800/60 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-white">{item}</span>
            </div>
          ))}
        </div>

        {feature.demoAvailable && (
          <div className="text-center">
            <Button 
              onClick={() => setSelectedDemo(feature.id)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Try Interactive Demo
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderDemo = (featureId) => {
    const demos = {
      'ai-learning': (
        <div className="space-y-4">
          <h4 className="text-xl font-bold text-white mb-4">AI Tutoring Demo</h4>
          <div className="bg-slate-800/60 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Brain className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-white font-medium">AI Tutor: Mathematics</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-600/20 p-3 rounded">
                <span className="text-blue-300">AI: "I notice you're struggling with quadratic equations. Let me create a personalized learning path for you."</span>
              </div>
              <div className="bg-green-600/20 p-3 rounded">
                <span className="text-green-300">Student: "Yes, I find the factoring method confusing."</span>
              </div>
              <div className="bg-blue-600/20 p-3 rounded">
                <span className="text-blue-300">AI: "Let's start with visual representations. Here's an interactive graph..."</span>
              </div>
            </div>
          </div>
        </div>
      ),
      'ar-vr': (
        <div className="space-y-4">
          <h4 className="text-xl font-bold text-white mb-4">VR Classroom Preview</h4>
          <div className="bg-slate-800/60 rounded-lg p-4">
            <div className="aspect-video bg-gradient-to-br from-green-600/20 to-teal-600/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Glasses className="h-12 w-12 text-green-400 mx-auto mb-2" />
                <p className="text-white">Virtual Solar System Exploration</p>
                <p className="text-slate-300 text-sm">Students can walk through planets in 3D</p>
              </div>
            </div>
          </div>
        </div>
      ),
      'mental-health': (
        <div className="space-y-4">
          <h4 className="text-xl font-bold text-white mb-4">Wellness Dashboard</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/60 rounded-lg p-4 text-center">
              <Activity className="h-8 w-8 text-pink-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">7.2/10</div>
              <div className="text-sm text-slate-300">Mood Score</div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">Improving</div>
              <div className="text-sm text-slate-300">Trend</div>
            </div>
          </div>
        </div>
      )
    }
    return demos[featureId] || <div className="text-white">Demo coming soon...</div>
  }

  if (activeFeature !== 'overview') {
    const feature = innovationFeatures.find(f => f.id === activeFeature)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => setActiveFeature('overview')}
            variant="outline"
            className="text-white border-white"
          >
            ← Back to Innovation Hub
          </Button>
        </div>
        
        {selectedDemo ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Interactive Demo</h3>
              <Button 
                onClick={() => setSelectedDemo(null)}
                variant="outline"
                className="text-white border-white"
              >
                Close Demo
              </Button>
            </div>
            {renderDemo(selectedDemo)}
          </div>
        ) : (
          renderFeatureDetail(feature)
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <Rocket className="h-12 w-12 text-purple-400" />
            <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          Innovation Hub
        </h1>
        <p className="text-xl text-slate-300 mb-2">Explore Innovation</p>
        <p className="text-slate-400">Cutting-edge educational technology for the future of learning</p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {innovationFeatures.map((feature) => {
          const IconComponent = feature.icon
          return (
            <Card 
              key={feature.id} 
              className={`bg-gradient-to-br ${feature.color} border-0 cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
              onClick={() => setActiveFeature(feature.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <IconComponent className="h-6 w-6 mr-3" />
                    {feature.name}
                  </CardTitle>
                  {getStatusBadge(feature.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 mb-4">{feature.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">
                    {feature.features.length} features
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-white border-white hover:bg-white hover:text-gray-900"
                  >
                    Explore →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 rounded-lg p-4 text-center transform hover:scale-105 transition-all duration-300">
          <Cpu className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">4</div>
          <div className="text-sm text-slate-300">AI Models</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-4 text-center transform hover:scale-105 transition-all duration-300">
          <Globe className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">12</div>
          <div className="text-sm text-slate-300">VR Experiences</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-4 text-center transform hover:scale-105 transition-all duration-300">
          <Activity className="h-8 w-8 text-pink-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">24/7</div>
          <div className="text-sm text-slate-300">Wellness Monitoring</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-4 text-center transform hover:scale-105 transition-all duration-300">
          <Shield className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">100%</div>
          <div className="text-sm text-slate-300">Secure Credentials</div>
        </div>
      </div>

      {/* Innovation Roadmap */}
      <Card className="bg-slate-800/60 border border-purple-500/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Target className="h-6 w-6 mr-2 text-purple-400" />
            Innovation Roadmap 2024
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                <span className="text-white">Mental Health Monitoring</span>
              </div>
              <span className="text-green-400 text-sm font-medium">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-600/20 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-400 mr-3" />
                <span className="text-white">AI-Powered Learning Tools</span>
              </div>
              <span className="text-blue-400 text-sm font-medium">BETA</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-600/20 rounded-lg">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-purple-400 mr-3" />
                <span className="text-white">AR/VR Integration</span>
              </div>
              <span className="text-purple-400 text-sm font-medium">PREVIEW</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-600/20 rounded-lg">
              <div className="flex items-center">
                <Zap className="h-5 w-5 text-orange-400 mr-3" />
                <span className="text-white">Blockchain Credentials</span>
              </div>
              <span className="text-orange-400 text-sm font-medium">Q2 2024</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
