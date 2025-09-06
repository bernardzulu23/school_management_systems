'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import SecureForm from '@/components/ui/SecureForm'
import { 
  User, 
  Calendar, 
  BookOpen, 
  Star, 
  FileText, 
  Target,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeacherObservationForm({ 
  teachers = [], 
  observationTools = [], 
  onSubmit, 
  onCancel,
  initialData = null 
}) {
  const [formData, setFormData] = useState({
    teacher_id: '',
    observation_tool_id: '',
    observation_date: '',
    lesson_subject: '',
    lesson_topic: '',
    class_observed: '',
    observation_period: '',
    academic_year: new Date().getFullYear().toString(),
    scores: {},
    overall_score: 0,
    grade: '',
    strengths: '',
    areas_for_improvement: '',
    recommendations: '',
    action_plan: '',
    observation_duration: '',
    teaching_method: '',
    classroom_management_notes: '',
    student_engagement_notes: '',
    resource_utilization_notes: '',
    follow_up_required: false,
    follow_up_date: ''
  })

  const [selectedTool, setSelectedTool] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData })
    }
  }, [initialData])

  useEffect(() => {
    if (formData.observation_tool_id) {
      const tool = observationTools.find(t => t.id === parseInt(formData.observation_tool_id))
      setSelectedTool(tool)
      
      // Initialize scores object
      if (tool && tool.criteria) {
        const initialScores = {}
        tool.criteria.forEach(criterion => {
          initialScores[criterion.name] = 0
        })
        setFormData(prev => ({ ...prev, scores: initialScores }))
      }
    }
  }, [formData.observation_tool_id, observationTools])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleScoreChange = (criterionName, score) => {
    const newScores = { ...formData.scores, [criterionName]: parseFloat(score) }
    setFormData(prev => ({ ...prev, scores: newScores }))
    
    // Calculate overall score
    calculateOverallScore(newScores)
  }

  const calculateOverallScore = (scores) => {
    if (!selectedTool || !selectedTool.criteria) return

    let totalWeightedScore = 0
    let totalWeight = 0

    selectedTool.criteria.forEach(criterion => {
      const score = scores[criterion.name] || 0
      const weight = criterion.weight || 1
      totalWeightedScore += score * (weight / 100)
      totalWeight += weight / 100
    })

    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0
    const grade = getGradeFromScore(overallScore)

    setFormData(prev => ({
      ...prev,
      overall_score: Math.round(overallScore * 100) / 100,
      grade
    }))
  }

  const getGradeFromScore = (score) => {
    if (score >= 90) return 'Outstanding'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Satisfactory'
    if (score >= 60) return 'Needs Improvement'
    return 'Unsatisfactory'
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.teacher_id) newErrors.teacher_id = 'Teacher is required'
    if (!formData.observation_tool_id) newErrors.observation_tool_id = 'Observation tool is required'
    if (!formData.observation_date) newErrors.observation_date = 'Observation date is required'
    if (!formData.lesson_subject) newErrors.lesson_subject = 'Lesson subject is required'
    if (!formData.lesson_topic) newErrors.lesson_topic = 'Lesson topic is required'
    if (!formData.class_observed) newErrors.class_observed = 'Class observed is required'
    if (!formData.observation_period) newErrors.observation_period = 'Observation period is required'

    // Validate scores
    if (selectedTool && selectedTool.criteria) {
      selectedTool.criteria.forEach(criterion => {
        const score = formData.scores[criterion.name]
        if (score === undefined || score === null || score === '') {
          newErrors[`score_${criterion.name}`] = `Score for ${criterion.name} is required`
        } else if (score < 0 || score > 100) {
          newErrors[`score_${criterion.name}`] = `Score must be between 0 and 100`
        }
      })
    }

    if (formData.follow_up_required && !formData.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required when follow-up is needed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (sanitizedData) => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)
    try {
      await onSubmit(sanitizedData)
      toast.success('Observation saved successfully')
    } catch (error) {
      toast.error('Error saving observation')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'Outstanding': return 'bg-green-100 text-green-800'
      case 'Good': return 'bg-blue-100 text-blue-800'
      case 'Satisfactory': return 'bg-yellow-100 text-yellow-800'
      case 'Needs Improvement': return 'bg-orange-100 text-orange-800'
      case 'Unsatisfactory': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Teacher Observation Form
        </h2>
        <p className="text-gray-600 mt-2">
          Complete this form to record teacher observation details and performance assessment
        </p>
      </div>

      <SecureForm onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher *
                </label>
                <select
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.teacher_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} - {teacher.department}
                    </option>
                  ))}
                </select>
                {errors.teacher_id && <p className="text-red-500 text-sm mt-1">{errors.teacher_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observation Tool *
                </label>
                <select
                  name="observation_tool_id"
                  value={formData.observation_tool_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.observation_tool_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Observation Tool</option>
                  {observationTools.map(tool => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name}
                    </option>
                  ))}
                </select>
                {errors.observation_tool_id && <p className="text-red-500 text-sm mt-1">{errors.observation_tool_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observation Date *
                  </label>
                  <input
                    type="date"
                    name="observation_date"
                    value={formData.observation_date}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.observation_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.observation_date && <p className="text-red-500 text-sm mt-1">{errors.observation_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="observation_duration"
                    value={formData.observation_duration}
                    onChange={handleChange}
                    min="1"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 45"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term *
                  </label>
                  <select
                    name="observation_period"
                    value={formData.observation_period}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.observation_period ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Term</option>
                    <option value="term1">Term 1</option>
                    <option value="term2">Term 2</option>
                    <option value="term3">Term 3</option>
                  </select>
                  {errors.observation_period && <p className="text-red-500 text-sm mt-1">{errors.observation_period}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    name="academic_year"
                    value={formData.academic_year}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2024"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Lesson Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  name="lesson_subject"
                  value={formData.lesson_subject}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.lesson_subject ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Mathematics"
                />
                {errors.lesson_subject && <p className="text-red-500 text-sm mt-1">{errors.lesson_subject}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Topic *
                </label>
                <input
                  type="text"
                  name="lesson_topic"
                  value={formData.lesson_topic}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.lesson_topic ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Quadratic Equations"
                />
                {errors.lesson_topic && <p className="text-red-500 text-sm mt-1">{errors.lesson_topic}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Observed *
                </label>
                <input
                  type="text"
                  name="class_observed"
                  value={formData.class_observed}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.class_observed ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Form 4A"
                />
                {errors.class_observed && <p className="text-red-500 text-sm mt-1">{errors.class_observed}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teaching Method
                </label>
                <input
                  type="text"
                  name="teaching_method"
                  value={formData.teaching_method}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Interactive lecture, Group work"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Observation Scores */}
        {selectedTool && selectedTool.criteria && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Observation Scores
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedTool.criteria.map((criterion, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{criterion.name}</h4>
                    <span className="text-sm text-gray-500">Weight: {criterion.weight}%</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
                  
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.scores[criterion.name] || ''}
                      onChange={(e) => handleScoreChange(criterion.name, e.target.value)}
                      className={`w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`score_${criterion.name}`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0-100"
                    />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, formData.scores[criterion.name] || 0))}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${getScoreColor(formData.scores[criterion.name] || 0)}`}>
                      {formData.scores[criterion.name] || 0}%
                    </span>
                  </div>
                  {errors[`score_${criterion.name}`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`score_${criterion.name}`]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Overall Score Display */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Overall Score</h4>
                  <p className="text-sm text-gray-600">Calculated based on weighted criteria</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(formData.overall_score)}`}>
                    {formData.overall_score}%
                  </div>
                  {formData.grade && (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(formData.grade)}`}>
                      {formData.grade}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Written Observations */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Written Observations
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strengths
                </label>
                <textarea
                  name="strengths"
                  value={formData.strengths}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the teacher's strengths observed during the lesson..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas for Improvement
                </label>
                <textarea
                  name="areas_for_improvement"
                  value={formData.areas_for_improvement}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Identify areas where the teacher can improve..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom Management Notes
                </label>
                <textarea
                  name="classroom_management_notes"
                  value={formData.classroom_management_notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notes on classroom management and behavior control..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recommendations
                </label>
                <textarea
                  name="recommendations"
                  value={formData.recommendations}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Provide specific recommendations for improvement..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Plan
                </label>
                <textarea
                  name="action_plan"
                  value={formData.action_plan}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Outline specific actions the teacher should take..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Engagement Notes
                </label>
                <textarea
                  name="student_engagement_notes"
                  value={formData.student_engagement_notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observations about student participation and engagement..."
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Utilization Notes
            </label>
            <textarea
              name="resource_utilization_notes"
              value={formData.resource_utilization_notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes on how effectively the teacher used available resources..."
            />
          </div>
        </Card>

        {/* Follow-up */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Follow-up
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="follow_up_required"
                name="follow_up_required"
                checked={formData.follow_up_required}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="follow_up_required" className="text-sm font-medium text-gray-700">
                Follow-up observation required
              </label>
            </div>

            {formData.follow_up_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date *
                </label>
                <input
                  type="date"
                  name="follow_up_date"
                  value={formData.follow_up_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.follow_up_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.follow_up_date && <p className="text-red-500 text-sm mt-1">{errors.follow_up_date}</p>}
              </div>
            )}
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Save Observation
              </>
            )}
          </Button>
        </div>
      </SecureForm>
    </Card>
  )
}
