'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
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
  AlertTriangle,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import FormField from '@/components/forms/FormField'
import LoadingSpinner from '@/components/LoadingSpinner'
import { FormGroup } from '@/components/forms/FormField'

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
    <article className="max-w-6xl mx-auto p-6" role="article" aria-labelledby="observation-form-title">
      <header className="mb-6">
        <h2 id="observation-form-title" className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6" aria-hidden="true" />
          Teacher Observation Form
        </h2>
        <p className="text-gray-600 mt-2">
          Complete this form to record teacher observation details and performance assessment
        </p>
      </header>

      <SecureForm onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="p-4 border rounded-lg bg-white shadow-sm" aria-labelledby="basic-info-title">
            <h3 id="basic-info-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" aria-hidden="true" />
              Basic Information
            </h3>
            
            <FormGroup className="space-y-4">
              <FormField
                label="Teacher *"
                name="teacher_id"
                type="select"
                value={formData.teacher_id}
                onChange={handleChange}
                error={errors.teacher_id}
                options={[
                  { value: '', label: 'Select Teacher' },
                  ...teachers.map(teacher => ({
                    value: teacher.id,
                    label: `${teacher.name} - ${teacher.department}`
                  }))
                ]}
                required
              />

              <FormField
                label="Observation Tool *"
                name="observation_tool_id"
                type="select"
                value={formData.observation_tool_id}
                onChange={handleChange}
                error={errors.observation_tool_id}
                options={[
                  { value: '', label: 'Select Observation Tool' },
                  ...observationTools.map(tool => ({
                    value: tool.id,
                    label: tool.name
                  }))
                ]}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Observation Date *"
                  name="observation_date"
                  type="date"
                  value={formData.observation_date}
                  onChange={handleChange}
                  error={errors.observation_date}
                  required
                />

                <FormField
                  label="Duration (minutes)"
                  name="observation_duration"
                  type="number"
                  value={formData.observation_duration}
                  onChange={handleChange}
                  min="1"
                  max="300"
                  placeholder="e.g., 45"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Term *"
                  name="observation_period"
                  type="select"
                  value={formData.observation_period}
                  onChange={handleChange}
                  error={errors.observation_period}
                  options={[
                    { value: '', label: 'Select Term' },
                    { value: 'term1', label: 'Term 1' },
                    { value: 'term2', label: 'Term 2' },
                    { value: 'term3', label: 'Term 3' }
                  ]}
                  required
                />

                <FormField
                  label="Academic Year"
                  name="academic_year"
                  type="text"
                  value={formData.academic_year}
                  onChange={handleChange}
                  placeholder="e.g., 2024"
                />
              </div>
            </FormGroup>
          </section>

          <section className="p-4 border rounded-lg bg-white shadow-sm" aria-labelledby="lesson-details-title">
            <h3 id="lesson-details-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
              Lesson Details
            </h3>
            
            <FormGroup className="space-y-4">
              <FormField
                label="Subject *"
                name="lesson_subject"
                type="text"
                value={formData.lesson_subject}
                onChange={handleChange}
                error={errors.lesson_subject}
                placeholder="e.g., Mathematics"
                required
              />

              <FormField
                label="Lesson Topic *"
                name="lesson_topic"
                type="text"
                value={formData.lesson_topic}
                onChange={handleChange}
                error={errors.lesson_topic}
                placeholder="e.g., Quadratic Equations"
                required
              />

              <FormField
                label="Class Observed *"
                name="class_observed"
                type="text"
                value={formData.class_observed}
                onChange={handleChange}
                error={errors.class_observed}
                placeholder="e.g., Form 4A"
                required
              />

              <FormField
                label="Teaching Method"
                name="teaching_method"
                type="text"
                value={formData.teaching_method}
                onChange={handleChange}
                placeholder="e.g., Interactive lecture, Group work"
              />
            </FormGroup>
          </section>
        </div>

        {/* Observation Scores */}
        {selectedTool && selectedTool.criteria && (
          <section className="p-6 border rounded-lg bg-white shadow-sm" aria-labelledby="observation-scores-title">
            <h3 id="observation-scores-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" aria-hidden="true" />
              Observation Scores
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" role="list">
              {selectedTool.criteria.map((criterion, index) => (
                <article key={index} className="border border-gray-200 rounded-lg p-4" role="listitem">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{criterion.name}</h4>
                    <span className="text-sm text-gray-500">Weight: {criterion.weight}%</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
                  
                  <div className="flex items-center gap-4">
                    <FormField
                      label={`Score for ${criterion.name}`}
                      name={`score_${criterion.name}`}
                      type="number"
                      hideLabel
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.scores[criterion.name] || ''}
                      onChange={(e) => handleScoreChange(criterion.name, e.target.value)}
                      error={errors[`score_${criterion.name}`]}
                      placeholder="0-100"
                      className="w-20"
                    />
                    <div className="flex-1 bg-gray-200 rounded-full h-2" aria-hidden="true">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, formData.scores[criterion.name] || 0))}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${getScoreColor(formData.scores[criterion.name] || 0)}`} aria-live="polite">
                      {formData.scores[criterion.name] || 0}%
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {/* Overall Score Display */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg" role="status" aria-live="polite">
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
          </section>
        )}

        {/* Written Observations */}
        <section className="p-6 border rounded-lg bg-white shadow-sm" aria-labelledby="written-observations-title">
          <h3 id="written-observations-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" aria-hidden="true" />
            Written Observations
          </h3>
          
          <FormGroup className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                label="Strengths"
                name="strengths"
                type="textarea"
                value={formData.strengths}
                onChange={handleChange}
                rows="4"
                placeholder="Describe the teacher's strengths observed during the lesson..."
              />

              <FormField
                label="Areas for Improvement"
                name="areas_for_improvement"
                type="textarea"
                value={formData.areas_for_improvement}
                onChange={handleChange}
                rows="4"
                placeholder="Identify areas where the teacher can improve..."
              />

              <FormField
                label="Classroom Management Notes"
                name="classroom_management_notes"
                type="textarea"
                value={formData.classroom_management_notes}
                onChange={handleChange}
                rows="3"
                placeholder="Notes on classroom management and behavior control..."
              />
            </div>
            
            <div className="space-y-4">
              <FormField
                label="Recommendations"
                name="recommendations"
                type="textarea"
                value={formData.recommendations}
                onChange={handleChange}
                rows="4"
                placeholder="Provide specific recommendations for the teacher..."
              />

              <FormField
                label="Action Plan"
                name="action_plan"
                type="textarea"
                value={formData.action_plan}
                onChange={handleChange}
                rows="4"
                placeholder="Outline the agreed action plan..."
              />

              <FormField
                label="Student Engagement Notes"
                name="student_engagement_notes"
                type="textarea"
                value={formData.student_engagement_notes}
                onChange={handleChange}
                rows="3"
                placeholder="Observations about student participation and engagement..."
              />
            </div>
          </FormGroup>

          <div className="mt-6">
            <FormField
              label="Resource Utilization Notes"
              name="resource_utilization_notes"
              type="textarea"
              value={formData.resource_utilization_notes}
              onChange={handleChange}
              rows="3"
              placeholder="Notes on how effectively the teacher used available resources..."
            />
          </div>
        </section>

        {/* Follow-up Section */}
        <section className="p-6 border rounded-lg bg-white shadow-sm" aria-labelledby="follow-up-title">
          <h3 id="follow-up-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" aria-hidden="true" />
            Follow-up
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="follow_up_required"
                name="follow_up_required"
                checked={formData.follow_up_required}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              />
              <label htmlFor="follow_up_required" className="text-sm font-medium text-gray-700">
                Follow-up Observation Required
              </label>
            </div>

            {formData.follow_up_required && (
              <FormField
                label="Follow-up Date *"
                name="follow_up_date"
                type="date"
                value={formData.follow_up_date}
                onChange={handleChange}
                error={errors.follow_up_date}
                required
              />
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <footer className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="focus-visible:ring-2 focus-visible:ring-gray-500"
            aria-label="Cancel and go back"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="min-w-[120px] flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={loading ? "Saving observation..." : "Save observation"}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                Save Observation
              </>
            )}
          </Button>
        </footer>
      </SecureForm>
    </article>
  )
}
