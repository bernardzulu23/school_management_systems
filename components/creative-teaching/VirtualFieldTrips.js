'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  MapPin, Globe, Camera, Compass, Clock, Users, Star, Play,
  Pause, Volume2, VolumeX, RotateCcw, ZoomIn, ZoomOut, Share2,
  Download, Bookmark, Eye, Heart, MessageCircle, Award, Map,
  SkipBack, SkipForward
} from 'lucide-react'

export default function VirtualFieldTrips() {
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStop, setCurrentStop] = useState(0)
  const [favorites, setFavorites] = useState([])
  const [completedTrips, setCompletedTrips] = useState([])

  const { data: fieldTrips = [], isLoading } = useQuery({
    queryKey: ['field-trips'],
    queryFn: () => api.getFieldTrips().then(res => res.data.data || [])
  })

  const startTrip = (trip) => {
    setSelectedTrip(trip)
    setCurrentStop(0)
    setIsPlaying(true)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const nextStop = () => {
    if (selectedTrip && currentStop < selectedTrip.stops.length - 1) {
      setCurrentStop(currentStop + 1)
    }
  }

  const previousStop = () => {
    if (currentStop > 0) {
      setCurrentStop(currentStop - 1)
    }
  }

  const toggleFavorite = (tripId) => {
    setFavorites(prev => 
      prev.includes(tripId) 
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    )
  }

  const completeTrip = (tripId) => {
    if (!completedTrips.includes(tripId)) {
      setCompletedTrips(prev => [...prev, tripId])
      // Award points or badges here
    }
  }

  const currentStopData = selectedTrip?.stops[currentStop]

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/60 border-slate-700/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="h-5 w-5 mr-2 text-purple-400" />
              Virtual Field Trips
            </div>
            <div className="flex items-center space-x-2">
              <Button className="bg-blue-600 text-white">
                <MapPin className="h-4 w-4 mr-2" />
                Create Trip
              </Button>
              <Button className="bg-green-600 text-white">
                <Share2 className="h-4 w-4 mr-2" />
                Share Collection
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTrip ? (
            // Trip Selection View
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fieldTrips.map((trip) => (
                  <Card key={trip.id} className="bg-slate-700/60 border-slate-600/40 overflow-hidden">
                    <div className="relative">
                      <img 
                        src={trip.thumbnail} 
                        alt={trip.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <Button
                          onClick={() => toggleFavorite(trip.id)}
                          className={`p-2 ${favorites.includes(trip.id) ? 'bg-red-600' : 'bg-black/50'} text-white`}
                        >
                          <Heart className={`h-4 w-4 ${favorites.includes(trip.id) ? 'fill-current' : ''}`} />
                        </Button>
                        {completedTrips.includes(trip.id) && (
                          <div className="p-2 bg-green-600 text-white rounded">
                            <Award className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {trip.duration}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-white font-bold text-lg mb-2">{trip.title}</h3>
                      <p className="text-slate-300 text-sm mb-3">{trip.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-slate-400 text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {trip.location}
                        </div>
                        <div className="flex items-center text-slate-400 text-sm">
                          <Users className="h-3 w-3 mr-1" />
                          {trip.subject} • {trip.grade}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs ${
                          trip.difficulty === 'Beginner' ? 'bg-green-600/20 text-green-400' :
                          trip.difficulty === 'Intermediate' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-red-600/20 text-red-400'
                        }`}>
                          {trip.difficulty}
                        </span>
                        <Button
                          onClick={() => startTrip(trip)}
                          className="bg-purple-600 text-white"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Trip
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            // Trip Experience View
            <div className="space-y-6">
              {/* Trip Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedTrip.title}</h2>
                  <p className="text-slate-300">{selectedTrip.location}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setSelectedTrip(null)}
                    className="bg-slate-600 text-white"
                  >
                    <Map className="h-4 w-4 mr-2" />
                    Back to Trips
                  </Button>
                  <Button
                    onClick={() => completeTrip(selectedTrip.id)}
                    className="bg-green-600 text-white"
                    disabled={completedTrips.includes(selectedTrip.id)}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    {completedTrips.includes(selectedTrip.id) ? 'Completed' : 'Complete Trip'}
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStop + 1) / selectedTrip.stops.length) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Stop Navigation */}
                <div className="lg:col-span-1">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <Compass className="h-4 w-4 mr-2" />
                    Trip Stops
                  </h3>
                  <div className="space-y-2">
                    {selectedTrip.stops.map((stop, index) => (
                      <div
                        key={stop.id}
                        onClick={() => setCurrentStop(index)}
                        className={`p-3 rounded cursor-pointer border-2 ${
                          currentStop === index 
                            ? 'border-purple-500 bg-purple-600/20' 
                            : 'border-slate-600 bg-slate-700/40'
                        }`}
                      >
                        <div className="text-white text-sm font-medium">{stop.title}</div>
                        <div className="text-slate-400 text-xs">{stop.duration}</div>
                        <div className="text-slate-400 text-xs">{stop.type}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-700/40 rounded-lg p-6 min-h-96">
                    {currentStopData && (
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">{currentStopData.title}</h3>
                        <p className="text-slate-300">{currentStopData.description}</p>
                        
                        {/* Media Player Simulation */}
                        <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-6xl mb-4">
                              {currentStopData.type === '360-video' && '🎥'}
                              {currentStopData.type === 'interactive' && '🎮'}
                              {currentStopData.type === 'documentary' && '📺'}
                              {currentStopData.type === 'simulation' && '🔬'}
                              {currentStopData.type === 'presentation' && '📊'}
                              {currentStopData.type === 'virtual-walk' && '🚶'}
                              {currentStopData.type === 'hands-on' && '✋'}
                              {currentStopData.type === 'multimedia' && '🎭'}
                              {currentStopData.type === 'comparison' && '⚖️'}
                              {currentStopData.type === 'animation' && '🎬'}
                              {currentStopData.type === 'data-visualization' && '📈'}
                              {currentStopData.type === 'case-study' && '📋'}
                              {currentStopData.type === 'interviews' && '🎤'}
                              {currentStopData.type === 'prediction' && '🔮'}
                            </div>
                            <p className="text-white text-lg">{currentStopData.type.replace('-', ' ').toUpperCase()}</p>
                            <p className="text-slate-400">Duration: {currentStopData.duration}</p>
                          </div>
                        </div>

                        {/* Media Controls */}
                        <div className="flex items-center justify-center space-x-4">
                          <Button onClick={previousStop} disabled={currentStop === 0} className="bg-slate-600 text-white">
                            <SkipBack className="h-4 w-4" />
                          </Button>
                          <Button onClick={togglePlayPause} className="bg-purple-600 text-white">
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button 
                            onClick={nextStop} 
                            disabled={currentStop === selectedTrip.stops.length - 1} 
                            className="bg-slate-600 text-white"
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Activities */}
                        <div>
                          <h4 className="text-white font-medium mb-2">Activities</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {currentStopData.activities.map((activity, index) => (
                              <Button
                                key={index}
                                className="bg-blue-600/20 text-blue-300 border border-blue-600/40 hover:bg-blue-600/40"
                              >
                                {activity}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trip Information */}
                <div className="lg:col-span-1">
                  <div className="space-y-4">
                    {/* Learning Objectives */}
                    <div className="bg-slate-700/40 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3 flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Learning Objectives
                      </h4>
                      <ul className="space-y-2">
                        {selectedTrip.learningObjectives.map((objective, index) => (
                          <li key={index} className="text-slate-300 text-sm flex items-start">
                            <span className="text-purple-400 mr-2">•</span>
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Resources */}
                    <div className="bg-slate-700/40 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3 flex items-center">
                        <Download className="h-4 w-4 mr-2" />
                        Resources
                      </h4>
                      <div className="space-y-2">
                        {selectedTrip.resources.map((resource, index) => (
                          <Button
                            key={index}
                            className="w-full justify-start bg-slate-600/40 text-slate-300 hover:bg-slate-600/60"
                          >
                            <Download className="h-3 w-3 mr-2" />
                            {resource}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Trip Stats */}
                    <div className="bg-slate-700/40 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Trip Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Current Stop:</span>
                          <span className="text-white">{currentStop + 1} of {selectedTrip.stops.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Time Remaining:</span>
                          <span className="text-white">
                            {selectedTrip.stops.slice(currentStop).reduce((total, stop) => 
                              total + parseInt(stop.duration), 0
                            )} min
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Difficulty:</span>
                          <span className={`${
                            selectedTrip.difficulty === 'Beginner' ? 'text-green-400' :
                            selectedTrip.difficulty === 'Intermediate' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {selectedTrip.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
