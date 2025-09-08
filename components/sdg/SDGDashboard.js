'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SDG_GOALS, calculateSDGProgress, getSDGsByCategory } from '@/lib/sdg-framework'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Target, TrendingUp, Globe, Users, Leaf, Building } from 'lucide-react'

export default function SDGDashboard({ schoolData = {} }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sdgProgress, setSDGProgress] = useState({})

  useEffect(() => {
    // Calculate progress for each SDG based on school data
    const progress = {}
    Object.keys(SDG_GOALS).forEach(key => {
      const sdgId = SDG_GOALS[key].id
      progress[sdgId] = calculateSDGProgress(sdgId, schoolData.metrics || {})
    })
    setSDGProgress(progress)
  }, [schoolData])

  const categories = getSDGsByCategory()
  const allSDGs = Object.values(SDG_GOALS)

  const getFilteredSDGs = () => {
    if (selectedCategory === 'all') return allSDGs
    return allSDGs.filter(sdg => categories[selectedCategory]?.includes(sdg.id))
  }

  const getOverallProgress = () => {
    const totalProgress = Object.values(sdgProgress).reduce((sum, progress) => sum + progress, 0)
    return Math.round(totalProgress / Object.keys(sdgProgress).length)
  }

  const getCategoryProgress = () => {
    return Object.keys(categories).map(category => {
      const categorySDGs = categories[category]
      const categoryProgress = categorySDGs.reduce((sum, sdgId) => sum + (sdgProgress[sdgId] || 0), 0)
      return {
        name: category.charAt(0).toUpperCase() + category.slice(1),
        progress: Math.round(categoryProgress / categorySDGs.length),
        color: category === 'social' ? '#E5243B' : category === 'environmental' ? '#56C02B' : '#FD6925'
      }
    })
  }

  const getChartData = () => {
    return getFilteredSDGs().map(sdg => ({
      name: `SDG ${sdg.id}`,
      progress: sdgProgress[sdg.id] || 0,
      color: sdg.color,
      title: sdg.title
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          🇺🇳 UN Sustainable Development Goals
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Tracking our school's contribution to the 2030 Agenda for Sustainable Development
        </p>
        <div className="flex items-center justify-center space-x-2">
          <Globe className="h-6 w-6 text-blue-600" />
          <span className="text-2xl font-bold text-blue-600">{getOverallProgress()}%</span>
          <span className="text-gray-600">Overall Progress</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex justify-center space-x-4">
        {['all', 'social', 'environmental', 'economic'].map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category === 'all' ? '🌍 All SDGs' : 
             category === 'social' ? '👥 Social' :
             category === 'environmental' ? '🌱 Environmental' : '💼 Economic'}
          </button>
        ))}
      </div>

      {/* Category Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {getCategoryProgress().map(category => (
          <Card key={category.name}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2">
                {category.name === 'Social' && <Users className="h-5 w-5" />}
                {category.name === 'Environmental' && <Leaf className="h-5 w-5" />}
                {category.name === 'Economic' && <Building className="h-5 w-5" />}
                <span>{category.name} SDGs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${category.progress}%`,
                        backgroundColor: category.color
                      }}
                    />
                  </div>
                </div>
                <span className="text-2xl font-bold" style={{ color: category.color }}>
                  {category.progress}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SDG Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart className="h-5 w-5" />
            <span>SDG Progress Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value}%`, 
                  props.payload.title
                ]}
              />
              <Bar 
                dataKey="progress" 
                fill={(entry) => entry.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SDG Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {getFilteredSDGs().map(sdg => (
          <Card key={sdg.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{sdg.icon}</span>
                  <span className="font-bold text-sm">SDG {sdg.id}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: sdg.color }}>
                    {sdgProgress[sdg.id] || 0}%
                  </div>
                </div>
              </div>
              <CardTitle className="text-sm leading-tight" style={{ color: sdg.color }}>
                {sdg.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {sdg.description}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${sdgProgress[sdg.id] || 0}%`,
                    backgroundColor: sdg.color
                  }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {sdg.targets.length} targets • {sdg.metrics.length} metrics
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left">
              <div className="text-blue-600 font-semibold">📊 Update Metrics</div>
              <div className="text-sm text-gray-600">Update SDG progress data</div>
            </button>
            <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left">
              <div className="text-green-600 font-semibold">📈 View Reports</div>
              <div className="text-sm text-gray-600">Generate SDG reports</div>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left">
              <div className="text-purple-600 font-semibold">🎯 Set Targets</div>
              <div className="text-sm text-gray-600">Define SDG targets</div>
            </button>
            <button className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left">
              <div className="text-orange-600 font-semibold">🤝 Partnerships</div>
              <div className="text-sm text-gray-600">Manage partnerships</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
