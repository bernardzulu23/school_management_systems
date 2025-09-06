'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Clock, 
  Star, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  ArrowLeft,
  Trophy,
  Target,
  Zap,
  RotateCcw,
  Home
} from 'lucide-react'

export default function GamePlayer({ game, onComplete, onExit }) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(game.timeLimit * 60) // Convert to seconds
  const [gameStarted, setGameStarted] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [score, setScore] = useState(0)
  const [showResults, setShowResults] = useState(false)

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameCompleted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleGameComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [gameStarted, gameCompleted, timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < game.content.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      handleGameComplete()
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const calculateScore = () => {
    let totalScore = 0
    let correctAnswers = 0

    game.content.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        totalScore += question.points || 1
        correctAnswers++
      }
    })

    return { totalScore, correctAnswers }
  }

  const handleGameComplete = () => {
    const { totalScore, correctAnswers } = calculateScore()
    setScore(totalScore)
    setGameCompleted(true)
    setShowResults(true)

    // Calculate results
    const maxScore = game.content.questions.reduce((sum, q) => sum + (q.points || 1), 0)
    const percentage = Math.round((totalScore / maxScore) * 100)
    const timeSpent = (game.timeLimit * 60) - timeLeft

    const results = {
      score: totalScore,
      maxScore,
      percentage,
      correctAnswers,
      totalQuestions: game.content.questions.length,
      timeSpent,
      answers
    }

    onComplete(results)
  }

  const startGame = () => {
    setGameStarted(true)
  }

  const restartGame = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setTimeLeft(game.timeLimit * 60)
    setGameStarted(false)
    setGameCompleted(false)
    setScore(0)
    setShowResults(false)
  }

  // Pre-game screen
  if (!gameStarted) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="dashboard-card">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">{game.gameType === 'quiz' ? '❓' : '🎮'}</div>
            <CardTitle className="text-3xl">{game.title}</CardTitle>
            <p className="text-gray-600 text-lg mt-2">{game.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Time Limit</h3>
                <p className="text-2xl font-bold text-blue-600">{game.timeLimit} min</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Questions</h3>
                <p className="text-2xl font-bold text-green-600">{game.content.questions.length}</p>
              </div>
              <div className="text-center p-6 bg-yellow-50 rounded-xl">
                <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Max Points</h3>
                <p className="text-2xl font-bold text-yellow-600">{game.pointsReward}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Instructions:</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Read each question carefully before selecting your answer</li>
                <li>• You can navigate between questions using the Previous/Next buttons</li>
                <li>• Your progress is automatically saved</li>
                <li>• Submit your answers before time runs out</li>
              </ul>
            </div>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={onExit}>
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button onClick={startGame} className="btn-primary px-8">
                <Zap className="h-4 w-4 mr-2" />
                Start Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Results screen
  if (showResults) {
    const { totalScore, correctAnswers } = calculateScore()
    const maxScore = game.content.questions.reduce((sum, q) => sum + (q.points || 1), 0)
    const percentage = Math.round((totalScore / maxScore) * 100)
    const timeSpent = (game.timeLimit * 60) - timeLeft

    return (
      <div className="max-w-4xl mx-auto">
        <Card className="dashboard-card">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">
              {percentage >= 90 ? '🏆' : percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
            </div>
            <CardTitle className="text-3xl">
              {percentage >= 90 ? 'Excellent!' : percentage >= 70 ? 'Great Job!' : percentage >= 50 ? 'Good Effort!' : 'Keep Practicing!'}
            </CardTitle>
            <p className="text-gray-600 text-lg mt-2">You scored {percentage}% on {game.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <Trophy className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Score</h3>
                <p className="text-2xl font-bold text-blue-600">{totalScore}/{maxScore}</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Correct</h3>
                <p className="text-2xl font-bold text-green-600">{correctAnswers}/{game.content.questions.length}</p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Time</h3>
                <p className="text-2xl font-bold text-purple-600">{formatTime(timeSpent)}</p>
              </div>
              <div className="text-center p-6 bg-yellow-50 rounded-xl">
                <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Points Earned</h3>
                <p className="text-2xl font-bold text-yellow-600">{Math.round((percentage / 100) * game.pointsReward)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ${
                  percentage >= 90 ? 'bg-green-500' :
                  percentage >= 70 ? 'bg-blue-500' :
                  percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>

            {/* Question Review */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Question Review</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {game.content.questions.map((question, index) => {
                  const userAnswer = answers[index]
                  const isCorrect = userAnswer === question.correctAnswer
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center space-x-3">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="text-sm font-medium">Question {index + 1}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Your answer: {userAnswer || 'Not answered'}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-600">
                            Correct: {question.correctAnswer}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={restartGame}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Play Again
              </Button>
              <Button onClick={onExit} className="btn-primary">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Game playing screen
  const question = game.content.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / game.content.questions.length) * 100

  return (
    <div className="max-w-4xl mx-auto">
      {/* Game Header */}
      <Card className="dashboard-card mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-blue-600">
                {currentQuestion + 1}/{game.content.questions.length}
              </div>
              <div className="flex-1">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-red-600">
                <Clock className="h-5 w-5" />
                <span className="font-bold text-lg">{formatTime(timeLeft)}</span>
              </div>
              <Button variant="outline" size="sm" onClick={onExit}>
                Exit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="text-xl">
            Question {currentQuestion + 1}
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({question.points || 1} point{(question.points || 1) !== 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-lg text-gray-900 leading-relaxed">
            {question.question}
          </div>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(currentQuestion, option)}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-300 ${
                  answers[currentQuestion] === option
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    answers[currentQuestion] === option
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {answers[currentQuestion] === option && (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-3">
              {currentQuestion === game.content.questions.length - 1 ? (
                <Button
                  onClick={handleGameComplete}
                  className="btn-primary"
                  disabled={!answers[currentQuestion]}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Submit Game
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="btn-primary"
                  disabled={!answers[currentQuestion]}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
