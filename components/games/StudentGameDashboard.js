'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
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
  ChevronRight,
} from 'lucide-react'

const gameTypeIcons = {
  quiz: '❓',
  flashcards: '📚',
  matching: '🔗',
  'word-search': '🔍',
  'fill-blanks': '✏️',
  'drag-drop': '🎯',
}

const achievementRarityColors = {
  common: 'bg-royalPurple-card2 text-royalPurple-text1 border-royalPurple-border',
  rare: 'bg-royalPurple-accent text-royalPurple-accentTx border-royalPurple-border2',
  epic: 'bg-royalPurple-pill text-royalPurple-pillTx border-royalPurple-border2',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300',
}

export default function StudentGameDashboard({ currentUser, onPlayGame }) {
  const [activeTab, setActiveTab] = useState('games')

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['student-game-dashboard'],
    queryFn: () => api.getStudentGameDashboard().then((res) => res.data.data),
  })

  const {
    availableGames = [],
    studentProgress = null,
    achievements = [],
    recentSessions = [],
    leaderboard = [],
  } = dashboardData || {}

  const handlePlayGame = (gameId) => {
    // Find the game and pass it to the parent component
    const game = availableGames.find((g) => g.id === gameId)
    if (game && onPlayGame) {
      onPlayGame(game)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-royalPurple-card2 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-royalPurple-card2 rounded w-1/2"></div>
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
      <Card className="dashboard-card bg-ink border-2 border-ink text-paper shadow-brutal">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="bg-royalPurple-card/20 rounded-full p-4">
                <Crown className="h-12 w-12 text-yellow-300" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Level {studentProgress?.level}</h2>
                <p className="text-royalPurple-accentTx text-lg">
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
              <div className="bg-royalPurple-card/20 rounded-xl p-4 min-w-[200px]">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to Level {(studentProgress?.level || 0) + 1}</span>
                  <span>{studentProgress?.progressPercentage || 0}%</span>
                </div>
                <div className="w-full bg-royalPurple-card/20 rounded-full h-3">
                  <div
                    className="bg-yellow-300 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${studentProgress?.progressPercentage || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-royalPurple-accentTx mt-2">
                  {(studentProgress?.nextLevelXP || 0) - (studentProgress?.experiencePoints || 0)}{' '}
                  XP to next level
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
                <p className="text-sm font-medium text-royalPurple-text2">Games Played</p>
                <p className="text-3xl font-bold text-royalPurple-text1">
                  {studentProgress?.gamesPlayed}
                </p>
              </div>
              <GamepadIcon className="h-8 w-8 text-royalPurple-accentTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-royalPurple-text2">Average Score</p>
                <p className="text-3xl font-bold text-royalPurple-text1">
                  {studentProgress?.averageScore}%
                </p>
              </div>
              <Target className="h-8 w-8 text-royalPurple-successTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-royalPurple-text2">Achievements</p>
                <p className="text-3xl font-bold text-royalPurple-text1">{achievements.length}</p>
              </div>
              <Award className="h-8 w-8 text-royalPurple-pillTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-royalPurple-text2">Current Streak</p>
                <p className="text-3xl font-bold text-royalPurple-text1">
                  {studentProgress?.currentStreak}
                </p>
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
          { id: 'progress', name: 'My Progress', icon: TrendingUp },
        ].map((tab) => {
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
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-6">Available Games</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableGames.map((game) => (
                <Card
                  key={game.id}
                  className="dashboard-card hover:shadow-xl transition-all duration-300"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{gameTypeIcons[game.gameType]}</div>
                      <div>
                        <CardTitle className="text-lg">{game.title}</CardTitle>
                        <p className="text-sm text-royalPurple-text2">{game.subject.name}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-royalPurple-text2 text-sm">{game.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-royalPurple-accentTx" />
                        <span>{game.timeLimit} min</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <span>{game.pointsReward} pts</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-royalPurple-pillTx" />
                        <span>{game.playCount} plays</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-royalPurple-successTx" />
                        <span>{game.averageScore}% avg</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          game.difficulty === 'easy'
                            ? 'bg-royalPurple-success text-royalPurple-successTx'
                            : game.difficulty === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-royalPurple-danger text-royalPurple-dangerTx'
                        }`}
                      >
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
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-6">My Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className="dashboard-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">{achievement.icon}</div>
                    <h4 className="font-bold text-lg text-royalPurple-text1 mb-2">
                      {achievement.name}
                    </h4>
                    <p className="text-royalPurple-text2 text-sm mb-4">{achievement.description}</p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${achievementRarityColors[achievement.rarity]}`}
                      >
                        {achievement.rarity}
                      </span>
                      <span className="text-sm font-semibold text-royalPurple-accentTx">
                        +{achievement.pointsReward} pts
                      </span>
                    </div>
                    <p className="text-xs text-royalPurple-text3 mt-2">
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
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-6">Class Leaderboard</h3>
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <Card
                  key={index}
                  className={`dashboard-card ${
                    entry.studentName === currentUser?.name
                      ? 'ring-2 ring-blue-500 bg-royalPurple-accent'
                      : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            entry.rank === 1
                              ? 'bg-yellow-100 text-yellow-800'
                              : entry.rank === 2
                                ? 'bg-royalPurple-card2 text-royalPurple-text1'
                                : entry.rank === 3
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-royalPurple-accent text-royalPurple-accentTx'
                          }`}
                        >
                          {entry.rank === 1
                            ? '🥇'
                            : entry.rank === 2
                              ? '🥈'
                              : entry.rank === 3
                                ? '🥉'
                                : entry.rank}
                        </div>
                        <div>
                          <h4 className="font-semibold text-royalPurple-text1">
                            {entry.studentName}
                          </h4>
                          <p className="text-sm text-royalPurple-text2">
                            {entry.gamesPlayed} games played
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-royalPurple-text1">
                          {entry.totalPoints}
                        </p>
                        <p className="text-sm text-royalPurple-text2">points</p>
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
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-6">My Progress</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle>Recent Game Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-royalPurple-page rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{gameTypeIcons[session.game.gameType]}</div>
                        <div>
                          <h4 className="font-semibold">{session.game.title}</h4>
                          <p className="text-sm text-royalPurple-text2">
                            {new Date(session.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{session.percentage}%</p>
                        <p className="text-sm text-royalPurple-accentTx">
                          +{session.pointsEarned} pts
                        </p>
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
                    <div className="w-full bg-royalPurple-card2 rounded-full h-3">
                      <div
                        className="bg-royalPurple-success h-3 rounded-full"
                        style={{ width: `${studentProgress?.averageScore}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-royalPurple-accent rounded-lg">
                      <p className="text-2xl font-bold text-royalPurple-accentTx">
                        {studentProgress?.longestStreak}
                      </p>
                      <p className="text-sm text-royalPurple-text2">Longest Streak</p>
                    </div>
                    <div className="text-center p-4 bg-royalPurple-success rounded-lg">
                      <p className="text-2xl font-bold text-royalPurple-successTx">
                        #{studentProgress?.rank?.school}
                      </p>
                      <p className="text-sm text-royalPurple-text2">School Rank</p>
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
