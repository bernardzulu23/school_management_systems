'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Map, Layers, UserCheck, MessageSquare, Clock,
  PenTool, Eye, Brain, Heart, Handshake, Plus,
  Edit, Delete, Calendar, Users, Target, BookOpen,
  CheckCircle, AlertTriangle, TrendingUp, Star,
  FileText, Download, Upload, Search, Filter,
  Video, Share2, Bell, Award, Settings
} from 'lucide-react'

// Collaborative Lesson Planning
export const renderLessonPlanning = () => {
  const [lessonPlans, setLessonPlans] = useState([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-400" />
          Collaborative Lesson Planning
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-slate-300 border-slate-600">
            <Share2 className="h-4 w-4 mr-2" />
            Share Template
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Lesson Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lessonPlans.map((plan) => (
          <Card key={plan.id} className="bg-slate-700/60 border-slate-600/40">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{plan.title}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  plan.status === 'Published' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                }`}>
                  {plan.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Subject:</span>
                  <p className="text-white">{plan.subject}</p>
                </div>
                <div>
                  <span className="text-slate-400">Duration:</span>
                  <p className="text-white">{plan.duration}</p>
                </div>
                <div>
                  <span className="text-slate-400">Grade:</span>
                  <p className="text-white">{plan.grade}</p>
                </div>
                <div>
                  <span className="text-slate-400">Last Modified:</span>
                  <p className="text-white">{plan.lastModified}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-sm">Collaborators:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {plan.collaborators.map((collaborator, idx) => (
                    <span key={idx} className="bg-blue-600/60 text-white px-2 py-1 rounded text-xs">
                      {collaborator}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-sm">Learning Objectives:</span>
                <ul className="text-white text-sm mt-1 space-y-1">
                  {plan.objectives.map((objective, idx) => (
                    <li key={idx} className="flex items-center">
                      <Target className="h-3 w-3 mr-2 text-green-400" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-slate-400 text-sm">Key Activities:</span>
                <ul className="text-white text-sm mt-1 space-y-1">
                  {plan.activities.map((activity, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 text-purple-400" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" size="sm" className="text-slate-300 border-slate-600">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Plan
                </Button>
                <Button variant="outline" size="sm" className="text-slate-300 border-slate-600">
                  <Share2 className="h-3 w-3 mr-1" />
                  Collaborate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Collaboration Tools */}
      <Card className="bg-slate-700/60 border-slate-600/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Heart className="h-5 w-5 mr-2 text-purple-400" />
            Collaboration Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700 h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span>Find Collaborators</span>
            </Button>
            <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700 h-20 flex-col">
              <FileText className="h-6 w-6 mb-2" />
              <span>Template Library</span>
            </Button>
            <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700 h-20 flex-col">
              <Video className="h-6 w-6 mb-2" />
              <span>Virtual Planning</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Parent-Teacher Conference Scheduler
export const renderParentConferences = () => {
  const [conferences, setConferences] = useState([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-purple-400" />
          Parent-Teacher Conference Scheduler
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-slate-300 border-slate-600">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Conference
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {conferences.map((conference) => (
          <Card key={conference.id} className="bg-slate-700/60 border-slate-600/40">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{conference.studentName}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  conference.status === 'Confirmed' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {conference.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Parent:</span>
                  <p className="text-white">{conference.parentName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Type:</span>
                  <p className="text-white">{conference.type}</p>
                </div>
                <div>
                  <span className="text-slate-400">Date:</span>
                  <p className="text-white">{conference.date}</p>
                </div>
                <div>
                  <span className="text-slate-400">Time:</span>
                  <p className="text-white">{conference.time}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-sm">Discussion Topics:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {conference.concerns.map((concern, idx) => (
                    <span key={idx} className="bg-orange-600/60 text-white px-2 py-1 rounded text-xs">
                      {concern}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-sm">Notes:</span>
                <p className="text-white text-sm mt-1 bg-slate-800/60 p-2 rounded">
                  {conference.notes}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" size="sm" className="text-slate-300 border-slate-600">
                  <Edit className="h-3 w-3 mr-1" />
                  Reschedule
                </Button>
                <Button variant="outline" size="sm" className="text-slate-300 border-slate-600">
                  <Video className="h-3 w-3 mr-1" />
                  Join Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card className="bg-slate-700/60 border-slate-600/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Clock className="h-5 w-5 mr-2 text-purple-400" />
            Conference Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-800/60 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">8</div>
              <div className="text-sm text-slate-300">This Week</div>
            </div>
            <div className="text-center p-4 bg-slate-800/60 rounded-lg">
              <div className="text-2xl font-bold text-green-400">24</div>
              <div className="text-sm text-slate-300">This Month</div>
            </div>
            <div className="text-center p-4 bg-slate-800/60 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">3</div>
              <div className="text-sm text-slate-300">Pending</div>
            </div>
            <div className="text-center p-4 bg-slate-800/60 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">96%</div>
              <div className="text-sm text-slate-300">Attendance Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
