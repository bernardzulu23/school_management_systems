'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  MapPin, Globe, Camera, Compass, Clock, Users, Star, Play,
  Pause, Volume2, VolumeX, RotateCcw, ZoomIn, ZoomOut, Share2,
  Download, Bookmark, Eye, Heart, MessageCircle, Award, Map
} from 'lucide-react'

export default function VirtualFieldTrips() {
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStop, setCurrentStop] = useState(0)
  const [favorites, setFavorites] = useState([])
  const [completedTrips, setCompletedTrips] = useState([])

  // Virtual field trip destinations focused on Zambian and African content
  const fieldTrips = [
    {
      id: 1,
      title: 'Victoria Falls - Mosi-oa-Tunya',
      location: 'Livingstone, Zambia',
      subject: 'Geography',
      grade: 'Grade 5-8',
      duration: '45 minutes',
      description: 'Explore one of the Seven Natural Wonders of the World',
      thumbnail: '/api/placeholder/400/250',
      difficulty: 'Beginner',
      rating: 4.8,
      participants: 1250,
      stops: [
        {
          id: 1,
          title: 'The Falls Overview',
          description: 'Learn about the formation and geology of Victoria Falls',
          duration: '8 minutes',
          type: '360-video',
          activities: ['Virtual walk', 'Geological timeline', 'Sound experience']
        },
        {
          id: 2,
          title: 'Wildlife at the Falls',
          description: 'Discover the unique ecosystem around the falls',
          duration: '10 minutes',
          type: 'interactive',
          activities: ['Animal spotting', 'Ecosystem mapping', 'Conservation quiz']
        },
        {
          id: 3,
          title: 'Cultural Heritage',
          description: 'Learn about the Lozi and Tonga peoples connection to the falls',
          duration: '12 minutes',
          type: 'documentary',
          activities: ['Cultural stories', 'Traditional practices', 'Language learning']
        },
        {
          id: 4,
          title: 'Adventure Activities',
          description: 'Experience virtual bungee jumping and white water rafting',
          duration: '10 minutes',
          type: 'simulation',
          activities: ['Virtual bungee', 'Rapids navigation', 'Safety protocols']
        },
        {
          id: 5,
          title: 'Conservation Efforts',
          description: 'Understand conservation challenges and solutions',
          duration: '5 minutes',
          type: 'presentation',
          activities: ['Conservation projects', 'Student action plans', 'Reflection']
        }
      ],
      learningObjectives: [
        'Understand geological processes that create waterfalls',
        'Identify wildlife species in the Zambezi ecosystem',
        'Appreciate cultural significance of natural landmarks',
        'Recognize importance of conservation'
      ],
      resources: [
        'Interactive map of the Zambezi River',
        'Wildlife identification guide',
        'Cultural heritage timeline',
        'Conservation action worksheet'
      ]
    },
    {
      id: 2,
      title: 'Copper Mining in the Copperbelt',
      location: 'Kitwe & Ndola, Zambia',
      subject: 'Science & Economics',
      grade: 'Form 1-3',
      duration: '60 minutes',
      description: 'Explore Zambias copper mining industry and its impact',
      thumbnail: '/api/placeholder/400/250',
      difficulty: 'Intermediate',
      rating: 4.6,
      participants: 890,
      stops: [
        {
          id: 1,
          title: 'Underground Mine Tour',
          description: 'Virtual tour of an active copper mine',
          duration: '15 minutes',
          type: '360-video',
          activities: ['Mine navigation', 'Equipment identification', 'Safety procedures']
        },
        {
          id: 2,
          title: 'Copper Processing',
          description: 'Learn how copper ore becomes pure copper',
          duration: '12 minutes',
          type: 'interactive',
          activities: ['Process simulation', 'Chemistry experiments', 'Quality testing']
        },
        {
          id: 3,
          title: 'Economic Impact',
          description: 'Understand coppers role in Zambias economy',
          duration: '15 minutes',
          type: 'data-visualization',
          activities: ['Economic graphs', 'Trade analysis', 'Future projections']
        },
        {
          id: 4,
          title: 'Environmental Considerations',
          description: 'Explore environmental challenges and solutions',
          duration: '10 minutes',
          type: 'case-study',
          activities: ['Impact assessment', 'Mitigation strategies', 'Sustainability planning']
        },
        {
          id: 5,
          title: 'Career Opportunities',
          description: 'Discover careers in mining and related industries',
          duration: '8 minutes',
          type: 'interviews',
          activities: ['Professional interviews', 'Skill requirements', 'Education pathways']
        }
      ],
      learningObjectives: [
        'Understand copper extraction and processing',
        'Analyze economic importance of mining',
        'Evaluate environmental impacts',
        'Explore career opportunities in mining'
      ],
      resources: [
        'Periodic table interactive',
        'Economic data dashboard',
        'Environmental impact calculator',
        'Career exploration guide'
      ]
    },
    {
      id: 3,
      title: 'Great Rift Valley Exploration',
      location: 'Eastern Africa',
      subject: 'Geography & Science',
      grade: 'Grade 6-10',
      duration: '50 minutes',
      description: 'Journey through the Great Rift Valley system',
      thumbnail: '/api/placeholder/400/250',
      difficulty: 'Advanced',
      rating: 4.9,
      participants: 2100,
      stops: [
        {
          id: 1,
          title: 'Rift Valley Formation',
          description: 'Understand the geological forces creating the rift',
          duration: '12 minutes',
          type: 'animation',
          activities: ['Tectonic simulation', 'Timeline creation', 'Force analysis']
        },
        {
          id: 2,
          title: 'Lake Tanganyika',
          description: 'Explore one of the worlds deepest lakes',
          duration: '15 minutes',
          type: '360-video',
          activities: ['Underwater exploration', 'Species identification', 'Water cycle']
        },
        {
          id: 3,
          title: 'Human Settlement',
          description: 'Learn about communities living in the rift valley',
          duration: '10 minutes',
          type: 'documentary',
          activities: ['Cultural comparison', 'Adaptation strategies', 'Modern challenges']
        },
        {
          id: 4,
          title: 'Volcanic Activity',
          description: 'Study active and dormant volcanoes in the region',
          duration: '8 minutes',
          type: 'simulation',
          activities: ['Eruption modeling', 'Risk assessment', 'Monitoring systems']
        },
        {
          id: 5,
          title: 'Future of the Rift',
          description: 'Predict future changes and implications',
          duration: '5 minutes',
          type: 'prediction',
          activities: ['Scientific modeling', 'Impact scenarios', 'Research planning']
        }
      ],
      learningObjectives: [
        'Explain tectonic plate movements',
        'Describe rift valley ecosystems',
        'Analyze human adaptation to geography',
        'Predict geological changes'
      ],
      resources: [
        'Tectonic plate simulator',
        'Species database',
        'Cultural heritage archive',
        'Geological timeline'
      ]
    },
    {
      id: 4,
      title: 'Traditional Zambian Villages',
      location: 'Rural Zambia',
      subject: 'Social Studies & Culture',
      grade: 'Grade 3-7',
      duration: '40 minutes',
      description: 'Experience traditional Zambian village life and customs',
      thumbnail: '/api/placeholder/400/250',
      difficulty: 'Beginner',
      rating: 4.7,
      participants: 1580,
      stops: [
        {
          id: 1,
          title: 'Village Layout',
          description: 'Explore traditional village organization',
          duration: '8 minutes',
          type: 'virtual-walk',
          activities: ['Village mapping', 'Building identification', 'Social structure']
        },
        {
          id: 2,
          title: 'Traditional Crafts',
          description: 'Learn about pottery, weaving, and woodcarving',
          duration: '12 minutes',
          type: 'hands-on',
          activities: ['Craft tutorials', 'Material identification', 'Technique practice']
        },
        {
          id: 3,
          title: 'Agricultural Practices',
          description: 'Understand traditional farming methods',
          duration: '10 minutes',
          type: 'interactive',
          activities: ['Crop identification', 'Seasonal calendar', 'Tool usage']
        },
        {
          id: 4,
          title: 'Cultural Ceremonies',
          description: 'Experience traditional music, dance, and rituals',
          duration: '8 minutes',
          type: 'multimedia',
          activities: ['Music learning', 'Dance participation', 'Ceremony explanation']
        },
        {
          id: 5,
          title: 'Modern Adaptations',
          description: 'See how villages adapt to modern challenges',
          duration: '2 minutes',
          type: 'comparison',
          activities: ['Then vs now', 'Technology integration', 'Future planning']
        }
      ],
      learningObjectives: [
        'Appreciate traditional Zambian culture',
        'Understand village social organization',
        'Learn traditional skills and crafts',
        'Compare traditional and modern lifestyles'
      ],
      resources: [
        'Cultural artifact gallery',
        'Traditional recipe collection',
        'Language phrase book',
        'Craft instruction videos'
      ]
    }
  ]

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
                        <div className="flex items-center text-slate-400 text-sm">
                          <Star className="h-3 w-3 mr-1 text-yellow-400" />
                          {trip.rating} ({trip.participants} students)
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
