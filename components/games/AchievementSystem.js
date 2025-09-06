'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Trophy, 
  Star, 
  Award, 
  Crown, 
  Medal, 
  Target,
  Zap,
  Flame,
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Lock,
  CheckCircle
} from 'lucide-react'

const achievementCategories = {
  performance: { name: 'Performance', icon: Trophy, color: 'yellow' },
  participation: { name: 'Participation', icon: Users, color: 'blue' },
  streak: { name: 'Streak', icon: Flame, color: 'orange' },
  completion: { name: 'Completion', icon: CheckCircle, color: 'green' },
  speed: { name: 'Speed', icon: Zap, color: 'purple' },
  accuracy: { name: 'Accuracy', icon: Target, color: 'red' },
  special: { name: 'Special', icon: Crown, color: 'indigo' }
}

const rarityConfig = {
  common: {
    name: 'Common',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
    glowColor: 'shadow-gray-200'
  },
  rare: {
    name: 'Rare',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    glowColor: 'shadow-blue-200'
  },
  epic: {
    name: 'Epic',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    glowColor: 'shadow-purple-200'
  },
  legendary: {
    name: 'Legendary',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    glowColor: 'shadow-yellow-200'
  }
}

export default function AchievementSystem({ studentId, earnedAchievements = [], allAchievements = [] }) {
  const [achievements, setAchievements] = useState([])
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [showEarnedOnly, setShowEarnedOnly] = useState(false)
  const [newAchievement, setNewAchievement] = useState(null)

  // Load achievements from API in production
  useEffect(() => {
    // TODO: Replace with API call to fetch user achievements
    const loadAchievements = async () => {
      try {
        // const response = await fetch('/api/achievements')
        // const data = await response.json()
        // setAchievements(data.achievements || [])
        setAchievements([]) // Empty for production
      } catch (error) {
        console.error('Failed to load achievements:', error)
        setAchievements([])
      }
    }

    loadAchievements()

  }, [])

  const filteredAchievements = achievements.filter(achievement => {
    if (showEarnedOnly && !achievement.earned) return false
    if (filter !== 'all' && achievement.category !== filter) return false
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        if (a.earned && b.earned) {
          return new Date(b.earnedAt) - new Date(a.earnedAt)
        }
        return b.earned - a.earned
      case 'rarity':
        const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 }
        return rarityOrder[b.rarity] - rarityOrder[a.rarity]
      case 'points':
        return b.pointsReward - a.pointsReward
      case 'progress':
        const aProgress = a.earned ? 1 : a.progress / a.maxProgress
        const bProgress = b.earned ? 1 : b.progress / b.maxProgress
        return bProgress - aProgress
      default:
        return 0
    }
  })

  const earnedCount = achievements.filter(a => a.earned).length
  const totalPoints = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.pointsReward, 0)

  const AchievementCard = ({ achievement }) => {
    const rarity = rarityConfig[achievement.rarity]
    const category = achievementCategories[achievement.category]
    const CategoryIcon = category.icon
    const progressPercentage = achievement.earned ? 100 : (achievement.progress / achievement.maxProgress) * 100

    return (
      <Card className={`dashboard-card transition-all duration-300 hover:scale-105 ${
        achievement.earned 
          ? `${rarity.glowColor} shadow-lg border-2 ${rarity.borderColor}` 
          : 'opacity-75 hover:opacity-100'
      }`}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {/* Achievement Icon */}
            <div className={`relative mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl ${
              achievement.earned 
                ? `${rarity.bgColor} border-2 ${rarity.borderColor}` 
                : 'bg-gray-100 border-2 border-gray-300'
            }`}>
              {achievement.earned ? achievement.icon : <Lock className="h-8 w-8 text-gray-400" />}
              {achievement.earned && (
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Achievement Info */}
            <div>
              <h3 className={`font-bold text-lg ${achievement.earned ? 'text-gray-900' : 'text-gray-500'}`}>
                {achievement.name}
              </h3>
              <p className={`text-sm mt-1 ${achievement.earned ? 'text-gray-600' : 'text-gray-400'}`}>
                {achievement.description}
              </p>
            </div>

            {/* Rarity Badge */}
            <div className="flex justify-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                achievement.earned 
                  ? `${rarity.bgColor} ${rarity.textColor} ${rarity.borderColor}`
                  : 'bg-gray-100 text-gray-500 border-gray-300'
              }`}>
                {rarity.name}
              </span>
            </div>

            {/* Progress Bar */}
            {!achievement.earned && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Progress</span>
                  <span>{achievement.progress}/{achievement.maxProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Points and Category */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1">
                <CategoryIcon className={`h-4 w-4 text-${category.color}-600`} />
                <span className="text-gray-600">{category.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-600" />
                <span className="font-semibold text-gray-900">+{achievement.pointsReward}</span>
              </div>
            </div>

            {/* Earned Date */}
            {achievement.earned && (
              <p className="text-xs text-gray-500">
                Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Achievement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stats-card">
          <CardContent className="p-6 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{earnedCount}</p>
            <p className="text-sm text-gray-600">Achievements Earned</p>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
            <p className="text-sm text-gray-600">Points from Achievements</p>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              {Math.round((earnedCount / achievements.length) * 100)}%
            </p>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Category</label>
              <select
                className="select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {Object.entries(achievementCategories).map(([key, category]) => (
                  <option key={key} value={key}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Sort By</label>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Recently Earned</option>
                <option value="rarity">Rarity</option>
                <option value="points">Points Value</option>
                <option value="progress">Progress</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showEarnedOnly}
                  onChange={(e) => setShowEarnedOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Earned Only</span>
              </label>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">
                Showing {filteredAchievements.length} of {achievements.length} achievements
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAchievements.map(achievement => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No achievements found</h3>
            <p className="text-gray-600">
              {showEarnedOnly 
                ? 'You haven\'t earned any achievements in this category yet.'
                : 'Try adjusting your filters to see more achievements.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* New Achievement Notification */}
      {newAchievement && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="dashboard-card border-2 border-yellow-400 shadow-2xl animate-bounce">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="font-bold text-lg text-gray-900">Achievement Unlocked!</h3>
              <p className="text-sm text-gray-600 mt-1">{newAchievement.name}</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setNewAchievement(null)}
              >
                Awesome!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
