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
} from 'lucide-react'

// Curriculum Mapping System
export const CurriculumMapping = () => {
  const [curriculumMaps, setCurriculumMaps] = useState([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-royalPurple-text1 flex items-center">
          <Map className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
          Curriculum Mapping System
        </h3>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-royalPurple-text1">
          <Plus className="h-4 w-4 mr-2" />
          Create New Map
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {curriculumMaps.map((map) => (
          <Card key={map.id} className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
                <span>
                  {map.subject} - {map.unit}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    map.status === 'In Progress'
                      ? 'bg-royalPurple-accent text-royalPurple-text1'
                      : 'bg-royalPurple-muted text-royalPurple-text1'
                  }`}
                >
                  {map.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-royalPurple-text3">Grade:</span>
                  <p className="text-royalPurple-text1">{map.grade}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Timeline:</span>
                  <p className="text-royalPurple-text1">{map.timeline}</p>
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Learning Objectives:</span>
                <ul className="text-royalPurple-text1 text-sm mt-1 space-y-1">
                  {map.objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 text-royalPurple-successTx" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Standards Alignment:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {map.standards.map((standard, idx) => (
                    <span
                      key={idx}
                      className="bg-royalPurple-pill/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {standard}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="text-royalPurple-text2 border-royalPurple-border hover:bg-royalPurple-muted"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Standards
        </Button>
        <Button
          variant="outline"
          className="text-royalPurple-text2 border-royalPurple-border hover:bg-royalPurple-muted"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Maps
        </Button>
        <Button
          variant="outline"
          className="text-royalPurple-text2 border-royalPurple-border hover:bg-royalPurple-muted"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Progress Report
        </Button>
      </div>
    </div>
  )
}

// Differentiated Instruction Tools
export const DifferentiatedInstruction = () => {
  const [instructionStrategies, setInstructionStrategies] = useState([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-royalPurple-text1 flex items-center">
          <Layers className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
          Differentiated Instruction Tools
        </h3>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-royalPurple-text1">
          <Plus className="h-4 w-4 mr-2" />
          Create Strategy
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {instructionStrategies.map((strategy) => (
          <Card key={strategy.id} className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
                <span>{strategy.strategy}</span>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-sm text-royalPurple-text2">{strategy.effectiveness}%</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-royalPurple-text2 text-sm">{strategy.description}</p>

              <div>
                <span className="text-royalPurple-text3 text-sm">Target Students:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {strategy.targetStudents.map((student, idx) => (
                    <span
                      key={idx}
                      className="bg-royalPurple-accent/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {student}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Applicable Subjects:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {strategy.subjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="bg-royalPurple-success/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Required Resources:</span>
                <ul className="text-royalPurple-text1 text-sm mt-1 space-y-1">
                  {strategy.resources.map((resource, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 text-royalPurple-successTx" />
                      {resource}
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
                  Modify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Apply to Class
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Learning Style Assessment */}
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
            Learning Style Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-accentTx">32%</div>
              <div className="text-sm text-royalPurple-text2">Visual Learners</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-successTx">28%</div>
              <div className="text-sm text-royalPurple-text2">Auditory Learners</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">25%</div>
              <div className="text-sm text-royalPurple-text2">Kinesthetic Learners</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-pillTx">15%</div>
              <div className="text-sm text-royalPurple-text2">Mixed Learning</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Student Portfolio Management
export const StudentPortfolios = () => {
  const [portfolios, setPortfolios] = useState([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-royalPurple-text1 flex items-center">
          <UserCheck className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
          Student Portfolio Management
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-royalPurple-text2 border-royalPurple-border">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-royalPurple-text1">
            <Plus className="h-4 w-4 mr-2" />
            Add Work
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {portfolios.map((portfolio) => (
          <Card key={portfolio.id} className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
                <span>{portfolio.studentName}</span>
                <span className="text-sm text-royalPurple-text2">{portfolio.grade}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-royalPurple-text3">Total Works:</span>
                  <p className="text-royalPurple-text1 font-semibold">{portfolio.totalWorks}</p>
                </div>
                <div>
                  <span className="text-royalPurple-text3">Recent Submissions:</span>
                  <p className="text-royalPurple-text1 font-semibold">
                    {portfolio.recentSubmissions}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Overall Progress:</span>
                <div className="flex items-center mt-1">
                  <div className="flex-1 bg-royalPurple-muted rounded-full h-2 mr-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${portfolio.overallProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-royalPurple-text1 text-sm font-semibold">
                    {portfolio.overallProgress}%
                  </span>
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Subjects:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {portfolio.subjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="bg-royalPurple-accent/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Strengths:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {portfolio.strengths.map((strength, idx) => (
                    <span
                      key={idx}
                      className="bg-royalPurple-success/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-royalPurple-text3 text-sm">Areas for Improvement:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {portfolio.improvements.map((improvement, idx) => (
                    <span
                      key={idx}
                      className="bg-orange-600/60 text-royalPurple-text1 px-2 py-1 rounded text-xs"
                    >
                      {improvement}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View Portfolio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-royalPurple-text2 border-royalPurple-border"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Add Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio Analytics */}
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
            Portfolio Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-accentTx">156</div>
              <div className="text-sm text-royalPurple-text2">Total Submissions</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-successTx">89%</div>
              <div className="text-sm text-royalPurple-text2">Avg. Quality Score</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">12</div>
              <div className="text-sm text-royalPurple-text2">Pending Reviews</div>
            </div>
            <div className="text-center p-4 bg-royalPurple-card/60 rounded-lg">
              <div className="text-2xl font-bold text-royalPurple-pillTx">95%</div>
              <div className="text-sm text-royalPurple-text2">On-Time Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
