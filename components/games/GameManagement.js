'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import GameCreationForm from './GameCreationForm'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Play,
  Users,
  Clock,
  Star,
  BarChart3,
  Search,
  Filter,
  GamepadIcon,
  Trophy,
  Target,
} from 'lucide-react'

const gameTypeIcons = {
  quiz: '❓',
  flashcards: '📚',
  matching: '🔗',
  'word-search': '🔍',
  'fill-blanks': '✏️',
  'drag-drop': '🎯',
}

const difficultyColors = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
}

export default function GameManagement({ userRole, subjects }) {
  const [games, setGames] = useState([])
  const [filteredGames, setFilteredGames] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterGameType, setFilterGameType] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadGames = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/games', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load games')
      const items = Array.isArray(json?.data) ? json.data : []
      setGames(items)
      setFilteredGames(items)
    } catch (e) {
      setError(e.message || 'Could not load games')
      setGames([])
      setFilteredGames([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGames()
  }, [])

  // Filter games based on search and filters
  useEffect(() => {
    let filtered = games.filter((game) => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (game.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSubject =
        !filterSubject ||
        String(game.subject?.name || '').toLowerCase() === filterSubject.toLowerCase()
      const matchesGameType = !filterGameType || game.gameType === filterGameType
      const matchesDifficulty = !filterDifficulty || game.difficulty === filterDifficulty

      return matchesSearch && matchesSubject && matchesGameType && matchesDifficulty
    })
    setFilteredGames(filtered)
  }, [games, searchTerm, filterSubject, filterGameType, filterDifficulty])

  const handleCreateGame = async (gameData) => {
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(gameData),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Create failed')
      await loadGames()
      setShowCreateForm(false)
    } catch (e) {
      window.alert(e.message || 'Failed to create game')
    }
  }

  const handleEditGame = async (gameData) => {
    if (!editingGame?.id) return
    try {
      const res = await fetch(`/api/games/${editingGame.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(gameData),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Update failed')
      await loadGames()
      setEditingGame(null)
    } catch (e) {
      window.alert(e.message || 'Failed to update game')
    }
  }

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Delete failed')
      await loadGames()
    } catch (e) {
      window.alert(e.message || 'Failed to delete game')
    }
  }

  const toggleGameStatus = (gameId) => {
    setGames((prev) =>
      prev.map((game) => (game.id === gameId ? { ...game, isActive: !game.isActive } : game))
    )
  }

  if (showCreateForm) {
    return (
      <GameCreationForm
        subjects={subjects}
        onSave={handleCreateGame}
        onCancel={() => setShowCreateForm(false)}
      />
    )
  }

  if (editingGame) {
    return (
      <GameCreationForm
        subjects={subjects}
        initialData={editingGame}
        onSave={handleEditGame}
        onCancel={() => setEditingGame(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-royalPurple-text1">Game Management</h1>
          <p className="text-royalPurple-text2 mt-1">
            Create and manage educational games for your subjects
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Create New Game
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-royalPurple-text2">Total Games</p>
                <p className="text-3xl font-bold text-royalPurple-text1">{games.length}</p>
              </div>
              <GamepadIcon className="h-8 w-8 text-royalPurple-accentTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-royalPurple-text2">Active Games</p>
                <p className="text-3xl font-bold text-royalPurple-text1">
                  {games.filter((g) => g.isActive).length}
                </p>
              </div>
              <Play className="h-8 w-8 text-royalPurple-successTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-royalPurple-text2">Total Plays</p>
                <p className="text-3xl font-bold text-royalPurple-text1">
                  {games.reduce((sum, g) => sum + g.playCount, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-royalPurple-pillTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-royalPurple-text2">Avg Score</p>
                <p className="text-3xl font-bold text-royalPurple-text1">
                  {Math.round(
                    games.reduce((sum, g) => sum + g.averageScore, 0) / games.length || 0
                  )}
                  %
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Search Games</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-royalPurple-text3" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Search by title or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Subject</label>
              <select
                className="select"
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects?.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Game Type</label>
              <select
                className="select"
                value={filterGameType}
                onChange={(e) => setFilterGameType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="quiz">Quiz</option>
                <option value="flashcards">Flashcards</option>
                <option value="matching">Matching</option>
                <option value="word-search">Word Search</option>
                <option value="fill-blanks">Fill in Blanks</option>
                <option value="drag-drop">Drag & Drop</option>
              </select>
            </div>

            <div>
              <label className="form-label">Difficulty</label>
              <select
                className="select"
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
              >
                <option value="">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-royalPurple-card2 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-royalPurple-card2 rounded w-full mb-2"></div>
                <div className="h-3 bg-royalPurple-card2 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <Card
              key={game.id}
              className="dashboard-card hover:shadow-xl transition-all duration-300"
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{gameTypeIcons[game.gameType]}</div>
                    <div>
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                      <p className="text-sm text-royalPurple-text2">{game.subject.name}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        game.isActive
                          ? 'bg-royalPurple-success text-royalPurple-successTx'
                          : 'bg-royalPurple-card2 text-royalPurple-text1'
                      }`}
                    >
                      {game.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        difficultyColors[game.difficulty] === 'green'
                          ? 'bg-royalPurple-success text-royalPurple-successTx'
                          : difficultyColors[game.difficulty] === 'yellow'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-royalPurple-danger text-royalPurple-dangerTx'
                      }`}
                    >
                      {game.difficulty}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-royalPurple-text2 text-sm">{game.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-royalPurple-accentTx" />
                    <span>{game.targetClass}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-royalPurple-successTx" />
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
                </div>

                {game.playCount > 0 && (
                  <div className="bg-royalPurple-page rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-royalPurple-text2">Average Score</span>
                      <span className="font-semibold">{game.averageScore}%</span>
                    </div>
                    <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-2">
                      <div
                        className="bg-royalPurple-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${game.averageScore}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingGame(game)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleGameStatus(game.id)}
                    className="flex-1"
                  >
                    {game.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGame(game.id)}
                    className="text-royalPurple-dangerTx hover:text-royalPurple-dangerTx"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredGames.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <GamepadIcon className="h-16 w-16 text-royalPurple-text3 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">No games found</h3>
            <p className="text-royalPurple-text2 mb-4">
              {searchTerm || filterSubject || filterGameType || filterDifficulty
                ? 'Try adjusting your filters to see more games.'
                : 'Create your first educational game to get started.'}
            </p>
            <Button onClick={() => setShowCreateForm(true)} className="btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Game
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
