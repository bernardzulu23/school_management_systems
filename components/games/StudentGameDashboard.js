'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Play, 
  Trophy, 
  Star, 
  Target, 
  Clock, 
  Zap,
  Award,
  TrendingUp,
  Users,
  BookOpen,
  GamepadIcon,
  Crown,
  Medal,
  Flame,
  ChevronRight
} from 'lucide-react'

const gameTypeIcons = {
  quiz: '❓',
  flashcards: '📚',
  matching: '🔗',
  'word-search': '🔍',
  'fill-blanks': '✏️',
  'drag-drop': '🎯'
}

const achievementRarityColors = {
  common: 'bg-gray-100 text-gray-800 border-gray-300',
  rare: 'bg-blue-100 text-blue-800 border-blue-300',
  epic: 'bg-purple-100 text-purple-800 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300'
}

export default function StudentGameDashboard({ currentUser, onPlayGame }) {
  const [availableGames, setAvailableGames] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [achievements, setAchievements] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [studentProgress, setStudentProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('games')

  // Mock data - replace with actual API calls
  useEffect(() => {
    setTimeout(() => {
      // Mock available games
      setAvailableGames([
        {
          id: 1,
          title: 'Mathematics Quiz - Algebra Basics',
          description: 'Test your knowledge of basic algebraic concepts',
          subject: { name: 'Mathematics' },
          gameType: 'quiz',
          difficulty: 'medium',
          pointsReward: 15,
          timeLimit: 20,
          playCount: 45,
          averageScore: 78
        },
        {
          id: 2,
          title: 'English Vocabulary Flashcards',
          description: 'Learn new vocabulary words',
          subject: { name: 'English' },
          gameType: 'flashcards',
          difficulty: 'easy',
          pointsReward: 10,
          timeLimit: 15,
          playCount: 32,
          averageScore: 85
        },
        {
          id: 3,
          title: 'Science Elements Matching',
          description: 'Match chemical elements with their symbols',
          subject: { name: 'Science' },
          gameType: 'matching',
          difficulty: 'hard',
          pointsReward: 20,
          timeLimit: 25,
          playCount: 28,
          averageScore: 72
        }
      ])

      // Mock student progress
      setStudentProgress({
        totalPoints: 1250,
        level: 8,
        experiencePoints: 1250,
        nextLevelXP: 1600,
        currentStreak: 5,
        longestStreak: 12,
        gamesPlayed: 23,
        averageScore: 82,
        rank: { class: 3, school: 15 }
      })

      // Mock achievements
      setAchievements([
        {
          id: 1,
          name: 'First Steps',
          description: 'Complete your first game',
          icon: '🎯',
          rarity: 'common',
          earnedAt: '2024-01-15',
          pointsReward: 10
        },
        {
          id: 2,
          name: 'Perfect Score',
          description: 'Get 100% on any game',
          icon: '⭐',
          rarity: 'rare',
          earnedAt: '2024-01-18',
          pointsReward: 50
        },
        {
          id: 3,
          name: 'Speed Demon',
          description: 'Complete a game in under 5 minutes',
          icon: '⚡',
          rarity: 'epic',
          earnedAt: '2024-01-20',
          pointsReward: 30
        }
      ])

      // Mock recent sessions
      setRecentSessions([
        {
          id: 1,
          game: { title: 'Math Quiz', gameType: 'quiz' },
          score: 85,
          percentage: 85,
          pointsEarned: 15,
          completedAt: '2024-01-22'
        },
        {
          id: 2,
          game: { title: 'English Flashcards', gameType: 'flashcards' },
          score: 92,
          percentage: 92,
          pointsEarned: 12,
          completedAt: '2024-01-21'
        }
      ])

      // Mock leaderboard
      setLeaderboard([
        { rank: 1, studentName: 'Alice Johnson', totalPoints: 1850, gamesPlayed: 35 },
        { rank: 2, studentName: 'Bob Smith', totalPoints: 1720, gamesPlayed: 32 },
        { rank: 3, studentName: currentUser?.name || 'You', totalPoints: 1250, gamesPlayed: 23 },
        { rank: 4, studentName: 'Carol Davis', totalPoints: 1180, gamesPlayed: 28 },
        { rank: 5, studentName: 'David Wilson', totalPoints: 1050, gamesPlayed: 25 }
      ])

      setLoading(false)
    }, 1000)
  }, [currentUser])

  const getProgressPercentage = () => {
    if (!studentProgress) return 0
    const currentLevelXP = studentProgress.experiencePoints - (studentProgress.level - 1) * 200
    const levelXPRange = studentProgress.nextLevelXP - (studentProgress.level - 1) * 200
    return Math.round((currentLevelXP / levelXPRange) * 100)
  }

  const handlePlayGame = (gameId) => {
    // Find the game and pass it to the parent component
    const game = availableGames.find(g => g.id === gameId)
    if (game && onPlayGame) {
      onPlayGame(game)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Student Progress Header */}
      <Card className="dashboard-card bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="bg-white/20 rounded-full p-4">
                <Crown className="h-12 w-12 text-yellow-300" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Level {studentProgress?.level}</h2>
                <p className="text-blue-100 text-lg">
                  {studentProgress?.totalPoints} Total Points
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Flame className="h-4 w-4 text-orange-300" />
                    <span className="text-sm">{studentProgress?.currentStreak} day streak</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4 text-yellow-300" />
                    <span className="text-sm">Rank #{studentProgress?.rank?.class} in class</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-xl p-4 min-w-[200px]">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to Level {(studentProgress?.level || 0) + 1}</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div 
                    className="bg-yellow-300 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-100 mt-2">
                  {(studentProgress?.nextLevelXP || 0) - (studentProgress?.experiencePoints || 0)} XP to next level
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Games Played</p>
                <p className="text-3xl font-bold text-gray-900">{studentProgress?.gamesPlayed}</p>
              </div>
              <GamepadIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-3xl font-bold text-gray-900">{studentProgress?.averageScore}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Achievements</p>
                <p className="text-3xl font-bold text-gray-900">{achievements.length}</p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Streak</p>
                <p className="text-3xl font-bold text-gray-900">{studentProgress?.currentStreak}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        {[
          { id: 'games', name: 'Available Games', icon: GamepadIcon },
          { id: 'achievements', name: 'Achievements', icon: Award },
          { id: 'leaderboard', name: 'Leaderboard', icon: Trophy },
          { id: 'progress', name: 'My Progress', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="content-section">
        {activeTab === 'games' && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Available Games</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableGames.map(game => (
                <Card key={game.id} className="dashboard-card hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{gameTypeIcons[game.gameType]}</div>
                      <div>
                        <CardTitle className="text-lg">{game.title}</CardTitle>
                        <p className="text-sm text-gray-600">{game.subject.name}</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm">{game.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>{game.timeLimit} min</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <span>{game.pointsReward} pts</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span>{game.playCount} plays</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <span>{game.averageScore}% avg</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        game.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        game.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {game.difficulty}
                      </span>
                      <Button 
                        onClick={() => handlePlayGame(game.id)}
                        className="btn-primary"
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Play Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">My Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map(achievement => (
                <Card key={achievement.id} className="dashboard-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">{achievement.icon}</div>
                    <h4 className="font-bold text-lg text-gray-900 mb-2">{achievement.name}</h4>
                    <p className="text-gray-600 text-sm mb-4">{achievement.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${achievementRarityColors[achievement.rarity]}`}>
                        {achievement.rarity}
                      </span>
                      <span className="text-sm font-semibold text-blue-600">
                        +{achievement.pointsReward} pts
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Class Leaderboard</h3>
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <Card key={index} className={`dashboard-card ${
                  entry.studentName === currentUser?.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          entry.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                          entry.rank === 2 ? 'bg-gray-100 text-gray-800' :
                          entry.rank === 3 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{entry.studentName}</h4>
                          <p className="text-sm text-gray-600">{entry.gamesPlayed} games played</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">{entry.totalPoints}</p>
                        <p className="text-sm text-gray-600">points</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">My Progress</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle>Recent Game Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentSessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{gameTypeIcons[session.game.gameType]}</div>
                        <div>
                          <h4 className="font-semibold">{session.game.title}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(session.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{session.percentage}%</p>
                        <p className="text-sm text-blue-600">+{session.pointsEarned} pts</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle>Performance Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Performance</span>
                      <span>{studentProgress?.averageScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${studentProgress?.averageScore}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{studentProgress?.longestStreak}</p>
                      <p className="text-sm text-gray-600">Longest Streak</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">#{studentProgress?.rank?.school}</p>
                      <p className="text-sm text-gray-600">School Rank</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
