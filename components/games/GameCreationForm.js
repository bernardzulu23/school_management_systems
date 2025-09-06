'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  GamepadIcon,
  BookOpen,
  Clock,
  Target,
  Star,
  Zap
} from 'lucide-react'

const gameTypes = [
  { id: 'quiz', name: 'Quiz', icon: '❓', description: 'Multiple choice questions' },
  { id: 'flashcards', name: 'Flashcards', icon: '📚', description: 'Study cards with front/back content' },
  { id: 'matching', name: 'Matching', icon: '🔗', description: 'Match pairs of related items' },
  { id: 'word-search', name: 'Word Search', icon: '🔍', description: 'Find hidden words in a grid' },
  { id: 'fill-blanks', name: 'Fill in the Blanks', icon: '✏️', description: 'Complete sentences with missing words' },
  { id: 'drag-drop', name: 'Drag & Drop', icon: '🎯', description: 'Drag items to correct positions' }
]

const difficultyLevels = [
  { id: 'easy', name: 'Easy', color: 'green', icon: '🟢' },
  { id: 'medium', name: 'Medium', color: 'yellow', icon: '🟡' },
  { id: 'hard', name: 'Hard', color: 'red', icon: '🔴' }
]

export default function GameCreationForm({ subjects, onSave, onCancel, initialData = null }) {
  const [gameData, setGameData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    subject: initialData?.subject || '',
    gameType: initialData?.gameType || 'quiz',
    difficulty: initialData?.difficulty || 'medium',
    targetClass: initialData?.targetClass || '',
    pointsReward: initialData?.pointsReward || 10,
    timeLimit: initialData?.timeLimit || 30,
    instructions: initialData?.instructions || '',
    content: initialData?.content || {
      questions: [{ question: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', points: 1 }]
    }
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [isPreview, setIsPreview] = useState(false)

  const handleInputChange = (field, value) => {
    setGameData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleContentChange = (type, index, field, value) => {
    setGameData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [type]: prev.content[type]?.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        ) || []
      }
    }))
  }

  const addQuestion = () => {
    setGameData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        questions: [
          ...(prev.content.questions || []),
          { question: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', points: 1 }
        ]
      }
    }))
  }

  const removeQuestion = (index) => {
    setGameData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        questions: prev.content.questions?.filter((_, i) => i !== index) || []
      }
    }))
  }

  const handleSave = () => {
    onSave(gameData)
  }

  const renderGameTypeSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {gameTypes.map(type => (
        <div
          key={type.id}
          onClick={() => handleInputChange('gameType', type.id)}
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
            gameData.gameType === type.id
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">{type.icon}</div>
            <h3 className="font-semibold text-gray-900">{type.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
          </div>
        </div>
      ))}
    </div>
  )

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Game Title</label>
          <input
            type="text"
            className="input"
            value={gameData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter game title"
          />
        </div>
        <div>
          <label className="form-label">Subject</label>
          <select
            className="select"
            value={gameData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
          >
            <option value="">Select Subject</option>
            {subjects?.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea
          className="textarea"
          value={gameData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe what this game is about"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="form-label">Target Class</label>
          <input
            type="text"
            className="input"
            value={gameData.targetClass}
            onChange={(e) => handleInputChange('targetClass', e.target.value)}
            placeholder="e.g., Grade 10"
          />
        </div>
        <div>
          <label className="form-label">Points Reward</label>
          <input
            type="number"
            className="input"
            value={gameData.pointsReward}
            onChange={(e) => handleInputChange('pointsReward', parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
        <div>
          <label className="form-label">Time Limit (minutes)</label>
          <input
            type="number"
            className="input"
            value={gameData.timeLimit}
            onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value))}
            min="5"
            max="120"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Difficulty Level</label>
        <div className="flex space-x-4">
          {difficultyLevels.map(level => (
            <button
              key={level.id}
              type="button"
              onClick={() => handleInputChange('difficulty', level.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl border-2 transition-all duration-300 ${
                gameData.difficulty === level.id
                  ? `border-${level.color}-500 bg-${level.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span>{level.icon}</span>
              <span className="font-medium">{level.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderQuizContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Quiz Questions</h3>
        <Button onClick={addQuestion} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {gameData.content.questions?.map((question, index) => (
        <Card key={index} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Question {index + 1}</CardTitle>
              {gameData.content.questions.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="form-label">Question</label>
              <textarea
                className="textarea"
                value={question.question}
                onChange={(e) => handleContentChange('questions', index, 'question', e.target.value)}
                placeholder="Enter your question"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex}>
                  <label className="form-label">Option {optionIndex + 1}</label>
                  <input
                    type="text"
                    className="input"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...question.options]
                      newOptions[optionIndex] = e.target.value
                      handleContentChange('questions', index, 'options', newOptions)
                    }}
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Correct Answer</label>
                <select
                  className="select"
                  value={question.correctAnswer}
                  onChange={(e) => handleContentChange('questions', index, 'correctAnswer', e.target.value)}
                >
                  <option value="">Select correct answer</option>
                  {question.options.map((option, optionIndex) => (
                    <option key={optionIndex} value={option}>
                      Option {optionIndex + 1}: {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Points</label>
                <input
                  type="number"
                  className="input"
                  value={question.points}
                  onChange={(e) => handleContentChange('questions', index, 'points', parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Explanation (Optional)</label>
              <textarea
                className="textarea"
                value={question.explanation}
                onChange={(e) => handleContentChange('questions', index, 'explanation', e.target.value)}
                placeholder="Explain why this is the correct answer"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const steps = [
    { id: 1, name: 'Game Type', icon: GamepadIcon },
    { id: 2, name: 'Basic Info', icon: BookOpen },
    { id: 3, name: 'Content', icon: Target },
    { id: 4, name: 'Review', icon: Eye }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-blue-600 text-white shadow-lg' :
                  isCompleted ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-1 mx-2 rounded ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GamepadIcon className="h-6 w-6 text-blue-600" />
            <span>{initialData ? 'Edit Game' : 'Create New Game'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Game Type</h3>
              {renderGameTypeSelector()}
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              {renderBasicInfo()}
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Game Content</h3>
              {gameData.gameType === 'quiz' && renderQuizContent()}
              {/* Add other game type content renderers here */}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Review & Save</h3>
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-lg">{gameData.title}</h4>
                <p className="text-gray-600 mt-2">{gameData.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <Clock className="h-5 w-5 mx-auto text-blue-600" />
                    <p className="text-sm font-medium mt-1">{gameData.timeLimit} min</p>
                  </div>
                  <div className="text-center">
                    <Star className="h-5 w-5 mx-auto text-yellow-600" />
                    <p className="text-sm font-medium mt-1">{gameData.pointsReward} pts</p>
                  </div>
                  <div className="text-center">
                    <Target className="h-5 w-5 mx-auto text-green-600" />
                    <p className="text-sm font-medium mt-1">{gameData.targetClass}</p>
                  </div>
                  <div className="text-center">
                    <Zap className="h-5 w-5 mx-auto text-purple-600" />
                    <p className="text-sm font-medium mt-1 capitalize">{gameData.difficulty}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex space-x-4">
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={
                    (currentStep === 1 && !gameData.gameType) ||
                    (currentStep === 2 && (!gameData.title || !gameData.subject))
                  }
                >
                  Next
                </Button>
              ) : (
                <Button onClick={handleSave} className="btn-primary">
                  <Save className="h-4 w-4 mr-2" />
                  {initialData ? 'Update Game' : 'Create Game'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
