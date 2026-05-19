'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Map,
  Layers,
  UserCheck,
  MessageSquare,
  Clock,
  PenTool,
  Eye,
  Brain,
  Heart,
  Handshake,
  Plus,
  Edit,
  Delete,
  Calendar,
  Users,
  Target,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Star,
  FileText,
  Download,
  Upload,
  Search,
  Filter,
  Video,
  Share2,
  Bell,
  Award,
  Settings,
} from 'lucide-react'
import { percentTextClass } from '@/lib/utils/percentColor'

// Collaborative Lesson Planning
export const LessonPlanning = () => {
  const [lessonPlans, setLessonPlans] = useState([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-royalPurple-text1 flex items-center">
          <Users className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
          Collaborative Lesson Planning
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-royalPurple-text2 border-royalPurple-border">
            <Share2 className="h-4 w-4 mr-2" />
            Share Template
          </Button>
          <Button className="bg-accent hover:bg-accent/90 text-white border-2 border-ink">
            <Plus className="h-4 w-4 mr-2" />
            New Lesson Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lessonPlans.map((plan) => (
          <Card key={plan.id} className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
                <span>{plan.title}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    plan.status === 'Published'
                      ? 'bg-royalPurple-success text-royalPurple-text1'
                      : 'bg-yellow-600 text-royalPurple-text1'
                  }`}
                >
                  {plan.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-royalPurple-text3">Subject:</span>
                  <p className="text-royalPurple-text1">{plan.subject}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Duration:</span>
                  <p className="text-royalPurple-text1">{plan.duration}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Grade:</span>
                  <p className="text-royalPurple-text1">{plan.grade}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Last Modified:</span>
                  <p className="text-royalPurple-text1">{plan.lastModified}</p>
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Collaborators:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {plan.collaborators.map((collaborator, idx) => (
                    <span
                      key={idx}
                      className="bg-royalPurple-accent/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {collaborator}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Learning Objectives:</span>
                <ul className="text-royalPurple-text1 text-sm mt-1 space-y-1">
                  {plan.objectives.map((objective, idx) => (
                    <li key={idx} className="flex items-center">
                      <Target className="h-3 w-3 mr-2 text-royalPurple-successTx" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Key Activities:</span>
                <ul className="text-royalPurple-text1 text-sm mt-1 space-y-1">
                  {plan.activities.map((activity, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 text-royalPurple-pillTx" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Collaborate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Collaboration Tools */}
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center">
            <Heart className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
            Collaboration Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="text-royalPurple-text2 border-royalPurple-border hover:bg-royalPurple-muted h-20 flex-col"
            >
              <Users className="h-6 w-6 mb-2" />
              <span>Find Collaborators</span>
            </Button>
            <Button
              variant="outline"
              className="text-royalPurple-text2 border-royalPurple-border hover:bg-royalPurple-muted h-20 flex-col"
            >
              <FileText className="h-6 w-6 mb-2" />
              <span>Template Library</span>
            </Button>
            <Button
              variant="outline"
              className="text-royalPurple-text2 border-royalPurple-border hover:bg-royalPurple-muted h-20 flex-col"
            >
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
export const ParentConferences = () => {
  const [conferences, setConferences] = useState([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-royalPurple-text1 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
          Parent-Teacher Conference Scheduler
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-royalPurple-text2 border-royalPurple-border">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          <Button className="bg-accent hover:bg-accent/90 text-white border-2 border-ink">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Conference
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {conferences.map((conference) => (
          <Card
            key={conference.id}
            className="bg-royalPurple-muted/60 border-royalPurple-border/40"
          >
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
                <span>{conference.studentName}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    conference.status === 'Confirmed'
                      ? 'bg-royalPurple-success text-royalPurple-text1'
                      : 'bg-royalPurple-accent text-royalPurple-text1'
                  }`}
                >
                  {conference.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-royalPurple-text3">Parent:</span>
                  <p className="text-royalPurple-text1">{conference.parentName}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Type:</span>
                  <p className="text-royalPurple-text1">{conference.type}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Date:</span>
                  <p className="text-royalPurple-text1">{conference.date}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Time:</span>
                  <p className="text-royalPurple-text1">{conference.time}</p>
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Discussion Topics:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {conference.concerns.map((concern, idx) => (
                    <span
                      key={idx}
                      className="bg-orange-600/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {concern}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Notes:</span>
                <p className="text-royalPurple-text1 text-sm mt-1 bg-royalPurple-card/60 p-2 rounded">
                  {conference.notes}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <Video className="h-3 w-3 mr-1" />
                  Join Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
            Conference Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-accentTx">8</div>
              <div className="text-sm text-royalPurple-text2">This Week</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-successTx">24</div>
              <div className="text-sm text-royalPurple-text2">This Month</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">3</div>
              <div className="text-sm text-royalPurple-text2">Pending</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className={`text-2xl font-bold ${percentTextClass(96)}`}>96%</div>
              <div className="text-sm text-royalPurple-text2">Attendance Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
