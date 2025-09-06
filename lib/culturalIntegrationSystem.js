/**
 * Cultural & Local Integration System
 * Zambian cultural heritage, local history, and community integration features
 * Designed to preserve and teach local knowledge alongside modern education
 */

/**
 * Local History Module
 * Comprehensive database of Zambian history, regions, and cultural heritage
 */
export class LocalHistoryModule {
  constructor() {
    this.historicalEvents = new Map()
    this.culturalSites = new Map()
    this.traditionalPractices = new Map()
    this.regionalHistory = new Map()
    this.timelines = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize Zambian historical events
    this.addHistoricalEvent('independence_1964', {
      title: 'Zambian Independence',
      date: new Date('1964-10-24'),
      description: 'Zambia gained independence from British colonial rule under the leadership of Kenneth Kaunda.',
      significance: 'Birth of modern Zambia as a sovereign nation',
      keyFigures: ['Kenneth Kaunda', 'Harry Nkumbula', 'Simon Kapwepwe'],
      location: 'Lusaka',
      category: 'political',
      sources: ['National Archives of Zambia', 'Independence Day Records'],
      multimedia: {
        images: ['independence_ceremony.jpg', 'kaunda_speech.jpg'],
        videos: ['independence_highlights.mp4'],
        audio: ['national_anthem_1964.mp3']
      }
    })
    
    this.addHistoricalEvent('copper_discovery', {
      title: 'Discovery of Copper Belt',
      date: new Date('1920-01-01'),
      description: 'Major copper deposits discovered in Northern Rhodesia, transforming the economy.',
      significance: 'Foundation of Zambian mining industry and economic development',
      keyFigures: ['Cecil Rhodes', 'Edmund Davis'],
      location: 'Copperbelt Province',
      category: 'economic',
      sources: ['Mining Heritage Foundation', 'Copperbelt Museum'],
      multimedia: {
        images: ['copper_mines_1920s.jpg', 'mining_equipment.jpg'],
        videos: ['copper_mining_history.mp4']
      }
    })
    
    // Initialize cultural sites
    this.addCulturalSite('victoria_falls', {
      name: 'Victoria Falls (Mosi-oa-Tunya)',
      location: 'Livingstone, Southern Province',
      description: 'One of the largest waterfalls in the world, known locally as "The Smoke that Thunders"',
      culturalSignificance: 'Sacred site for the Tonga people, believed to be home of ancestral spirits',
      traditionalName: 'Mosi-oa-Tunya',
      tribalConnections: ['Tonga', 'Lozi'],
      visitingGuidelines: 'Respect local customs, no loud noises near sacred areas',
      conservationStatus: 'UNESCO World Heritage Site',
      multimedia: {
        images: ['victoria_falls_aerial.jpg', 'traditional_ceremony.jpg'],
        videos: ['falls_documentary.mp4'],
        audio: ['tonga_traditional_songs.mp3']
      }
    })
    
    // Initialize traditional practices
    this.addTraditionalPractice('kuomboka_ceremony', {
      name: 'Kuomboka Ceremony',
      tribe: 'Lozi',
      region: 'Western Province',
      description: 'Annual ceremony where the Litunga moves from the flood plains to higher ground',
      significance: 'Celebrates the relationship between the Lozi people and the Zambezi River',
      season: 'February-April (flood season)',
      rituals: [
        'Preparation of the royal barge (Nalikwanda)',
        'Traditional drumming and singing',
        'Royal procession across the floodplains',
        'Blessing ceremonies at the destination'
      ],
      culturalLessons: [
        'Environmental adaptation and seasonal living',
        'Community cooperation and unity',
        'Respect for natural cycles',
        'Traditional leadership structures'
      ],
      modernRelevance: 'Tourism, cultural preservation, environmental awareness'
    })
    
    console.log('🏛️ Local History Module initialized with Zambian heritage')
  }

  addHistoricalEvent(eventId, eventData) {
    this.historicalEvents.set(eventId, {
      id: eventId,
      ...eventData,
      addedDate: new Date()
    })
  }

  addCulturalSite(siteId, siteData) {
    this.culturalSites.set(siteId, {
      id: siteId,
      ...siteData,
      addedDate: new Date()
    })
  }

  addTraditionalPractice(practiceId, practiceData) {
    this.traditionalPractices.set(practiceId, {
      id: practiceId,
      ...practiceData,
      addedDate: new Date()
    })
  }

  createTimeline(timelineId, timelineData) {
    const timeline = {
      id: timelineId,
      title: timelineData.title,
      description: timelineData.description,
      category: timelineData.category,
      events: [],
      createdDate: new Date()
    }
    
    // Add events to timeline
    if (timelineData.eventIds) {
      timelineData.eventIds.forEach(eventId => {
        const event = this.historicalEvents.get(eventId)
        if (event) {
          timeline.events.push({
            eventId,
            title: event.title,
            date: event.date,
            significance: event.significance
          })
        }
      })
      
      // Sort events by date
      timeline.events.sort((a, b) => a.date - b.date)
    }
    
    this.timelines.set(timelineId, timeline)
    
    console.log(`📅 Timeline "${timeline.title}" created with ${timeline.events.length} events`)
    return timeline
  }

  searchHistory(query, filters = {}) {
    const results = []
    const searchTerm = query.toLowerCase()
    
    // Search historical events
    for (const [eventId, event] of this.historicalEvents) {
      let relevanceScore = 0
      
      if (event.title.toLowerCase().includes(searchTerm)) relevanceScore += 10
      if (event.description.toLowerCase().includes(searchTerm)) relevanceScore += 5
      if (event.keyFigures.some(figure => figure.toLowerCase().includes(searchTerm))) relevanceScore += 8
      if (event.location.toLowerCase().includes(searchTerm)) relevanceScore += 6
      
      // Apply filters
      if (filters.category && event.category !== filters.category) continue
      if (filters.dateRange) {
        const eventDate = new Date(event.date)
        if (eventDate < filters.dateRange.start || eventDate > filters.dateRange.end) continue
      }
      
      if (relevanceScore > 0) {
        results.push({
          type: 'historical_event',
          id: eventId,
          title: event.title,
          description: event.description,
          relevanceScore,
          data: event
        })
      }
    }
    
    // Search cultural sites
    for (const [siteId, site] of this.culturalSites) {
      let relevanceScore = 0
      
      if (site.name.toLowerCase().includes(searchTerm)) relevanceScore += 10
      if (site.description.toLowerCase().includes(searchTerm)) relevanceScore += 5
      if (site.traditionalName && site.traditionalName.toLowerCase().includes(searchTerm)) relevanceScore += 8
      if (site.tribalConnections.some(tribe => tribe.toLowerCase().includes(searchTerm))) relevanceScore += 6
      
      if (relevanceScore > 0) {
        results.push({
          type: 'cultural_site',
          id: siteId,
          title: site.name,
          description: site.description,
          relevanceScore,
          data: site
        })
      }
    }
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  getRegionalHistory(province) {
    const regionalEvents = []
    const regionalSites = []
    const regionalPractices = []
    
    // Find events related to the province
    for (const [eventId, event] of this.historicalEvents) {
      if (event.location.toLowerCase().includes(province.toLowerCase())) {
        regionalEvents.push(event)
      }
    }
    
    // Find cultural sites in the province
    for (const [siteId, site] of this.culturalSites) {
      if (site.location.toLowerCase().includes(province.toLowerCase())) {
        regionalSites.push(site)
      }
    }
    
    // Find traditional practices in the region
    for (const [practiceId, practice] of this.traditionalPractices) {
      if (practice.region.toLowerCase().includes(province.toLowerCase())) {
        regionalPractices.push(practice)
      }
    }
    
    return {
      province,
      events: regionalEvents.sort((a, b) => a.date - b.date),
      culturalSites: regionalSites,
      traditionalPractices: regionalPractices
    }
  }

  generateLessonPlan(topic, gradeLevel) {
    const lessonPlan = {
      id: this.generateLessonId(),
      topic,
      gradeLevel,
      title: `Zambian Heritage: ${topic}`,
      duration: '45 minutes',
      objectives: [],
      activities: [],
      resources: [],
      assessment: [],
      culturalConnections: [],
      createdDate: new Date()
    }
    
    // Generate content based on topic
    switch (topic.toLowerCase()) {
      case 'independence':
        lessonPlan.objectives = [
          'Understand the significance of Zambian independence',
          'Identify key figures in the independence movement',
          'Appreciate the journey from colonial rule to sovereignty'
        ]
        lessonPlan.activities = [
          'Timeline creation of independence events',
          'Role-play of independence ceremony',
          'Discussion of Kenneth Kaunda\'s leadership',
          'Comparison with other African independence movements'
        ]
        lessonPlan.resources = [
          'Independence Day photographs',
          'Audio recordings of historical speeches',
          'Map of colonial Northern Rhodesia vs modern Zambia'
        ]
        break
        
      case 'traditional ceremonies':
        lessonPlan.objectives = [
          'Learn about major Zambian traditional ceremonies',
          'Understand the cultural significance of rituals',
          'Appreciate the connection between tradition and environment'
        ]
        lessonPlan.activities = [
          'Virtual tour of Kuomboka ceremony',
          'Traditional music and dance demonstration',
          'Storytelling session with local elders',
          'Create traditional ceremony calendar'
        ]
        break
    }
    
    return lessonPlan
  }

  generateLessonId() {
    return 'lesson_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Traditional Knowledge Library
 * Repository of indigenous knowledge, practices, and wisdom
 */
export class TraditionalKnowledgeLibrary {
  constructor() {
    this.knowledgeAreas = new Map()
    this.practices = new Map()
    this.stories = new Map()
    this.medicinalKnowledge = new Map()
    this.agriculturalWisdom = new Map()
    this.craftTechniques = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize traditional agricultural knowledge
    this.addAgriculturalWisdom('crop_rotation_bemba', {
      title: 'Bemba Chitemene System',
      tribe: 'Bemba',
      region: 'Northern Province',
      description: 'Traditional slash-and-burn agriculture system that maintains soil fertility',
      techniques: [
        'Selective tree cutting and burning',
        'Ash fertilization of soil',
        'Crop rotation with finger millet',
        'Fallow periods for forest regeneration'
      ],
      crops: ['Finger millet', 'Cassava', 'Sweet potatoes', 'Beans'],
      seasonalCalendar: {
        'May-July': 'Tree cutting and preparation',
        'August-September': 'Burning and ash spreading',
        'October-December': 'Planting season',
        'January-April': 'Growing and harvesting'
      },
      modernRelevance: 'Sustainable agriculture, soil conservation, biodiversity preservation',
      scientificBasis: 'Ash provides potassium and phosphorus, burning controls pests and diseases'
    })
    
    // Initialize traditional medicinal knowledge
    this.addMedicinalKnowledge('malaria_treatment_traditional', {
      title: 'Traditional Malaria Treatment',
      condition: 'Malaria and fever',
      plants: [
        {
          name: 'Mukwa (Pterocarpus angolensis)',
          part: 'Bark',
          preparation: 'Boil bark in water, drink as tea',
          dosage: 'Small cup 3 times daily'
        },
        {
          name: 'Musamba (Julbernardia paniculata)',
          part: 'Leaves',
          preparation: 'Crush leaves, mix with water',
          dosage: 'Apply as poultice on forehead'
        }
      ],
      preparation: 'Traditional healers combine multiple plants based on patient symptoms',
      cautions: 'Always consult modern medical professionals for serious conditions',
      culturalContext: 'Part of holistic healing approach including spiritual elements',
      modernResearch: 'Some compounds show antimalarial properties in laboratory studies'
    })
    
    // Initialize traditional stories
    this.addStory('kalulu_rabbit_stories', {
      title: 'Kalulu the Clever Rabbit',
      type: 'Folktale',
      origin: 'Multiple Zambian tribes',
      moralLessons: [
        'Intelligence overcomes physical strength',
        'Cleverness should be used to help others',
        'Pride comes before a fall'
      ],
      characters: ['Kalulu (Rabbit)', 'Fisi (Hyena)', 'Ng\'ombe (Cattle)', 'Njovu (Elephant)'],
      plotSummary: 'Kalulu uses wit and cunning to outsmart larger, stronger animals',
      culturalSignificance: 'Teaches children problem-solving and moral values',
      variations: 'Different tribes have unique versions with local adaptations',
      educationalUse: 'Language learning, moral education, critical thinking'
    })
    
    console.log('📚 Traditional Knowledge Library initialized')
  }

  addAgriculturalWisdom(wisdomId, wisdomData) {
    this.agriculturalWisdom.set(wisdomId, {
      id: wisdomId,
      ...wisdomData,
      addedDate: new Date()
    })
  }

  addMedicinalKnowledge(knowledgeId, knowledgeData) {
    this.medicinalKnowledge.set(knowledgeId, {
      id: knowledgeId,
      ...knowledgeData,
      addedDate: new Date(),
      disclaimer: 'Traditional knowledge for educational purposes. Consult healthcare professionals for medical treatment.'
    })
  }

  addStory(storyId, storyData) {
    this.stories.set(storyId, {
      id: storyId,
      ...storyData,
      addedDate: new Date()
    })
  }

  addCraftTechnique(techniqueId, techniqueData) {
    this.craftTechniques.set(techniqueId, {
      id: techniqueId,
      ...techniqueData,
      addedDate: new Date()
    })
  }

  searchTraditionalKnowledge(query, category = null) {
    const results = []
    const searchTerm = query.toLowerCase()
    
    const searchCollections = [
      { collection: this.agriculturalWisdom, type: 'agricultural' },
      { collection: this.medicinalKnowledge, type: 'medicinal' },
      { collection: this.stories, type: 'story' },
      { collection: this.craftTechniques, type: 'craft' }
    ]
    
    searchCollections.forEach(({ collection, type }) => {
      if (category && category !== type) return
      
      for (const [id, item] of collection) {
        let relevanceScore = 0
        
        if (item.title.toLowerCase().includes(searchTerm)) relevanceScore += 10
        if (item.description && item.description.toLowerCase().includes(searchTerm)) relevanceScore += 5
        if (item.tribe && item.tribe.toLowerCase().includes(searchTerm)) relevanceScore += 8
        
        if (relevanceScore > 0) {
          results.push({
            type,
            id,
            title: item.title,
            description: item.description || '',
            tribe: item.tribe || '',
            relevanceScore,
            data: item
          })
        }
      }
    })
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  getKnowledgeByTribe(tribeName) {
    const tribalKnowledge = {
      tribe: tribeName,
      agricultural: [],
      medicinal: [],
      stories: [],
      crafts: []
    }
    
    // Collect agricultural wisdom
    for (const [id, wisdom] of this.agriculturalWisdom) {
      if (wisdom.tribe && wisdom.tribe.toLowerCase() === tribeName.toLowerCase()) {
        tribalKnowledge.agricultural.push(wisdom)
      }
    }
    
    // Collect medicinal knowledge
    for (const [id, knowledge] of this.medicinalKnowledge) {
      if (knowledge.tribe && knowledge.tribe.toLowerCase() === tribeName.toLowerCase()) {
        tribalKnowledge.medicinal.push(knowledge)
      }
    }
    
    // Collect stories
    for (const [id, story] of this.stories) {
      if (story.origin && story.origin.toLowerCase().includes(tribeName.toLowerCase())) {
        tribalKnowledge.stories.push(story)
      }
    }
    
    // Collect craft techniques
    for (const [id, craft] of this.craftTechniques) {
      if (craft.tribe && craft.tribe.toLowerCase() === tribeName.toLowerCase()) {
        tribalKnowledge.crafts.push(craft)
      }
    }
    
    return tribalKnowledge
  }

  createEducationalModule(topic, targetAge) {
    const module = {
      id: this.generateModuleId(),
      topic,
      targetAge,
      title: `Traditional Knowledge: ${topic}`,
      description: `Learn about traditional Zambian knowledge in ${topic}`,
      lessons: [],
      activities: [],
      assessments: [],
      culturalContext: '',
      createdDate: new Date()
    }
    
    // Generate age-appropriate content
    switch (targetAge) {
      case 'primary':
        module.activities = [
          'Story telling sessions',
          'Simple craft demonstrations',
          'Traditional games',
          'Picture identification'
        ]
        break
      case 'secondary':
        module.activities = [
          'Research projects on traditional practices',
          'Interviews with community elders',
          'Comparative analysis with modern methods',
          'Practical demonstrations'
        ]
        break
    }
    
    return module
  }

  generateModuleId() {
    return 'module_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Community Heroes Database
 * Celebrating local leaders, innovators, and role models
 */
export class CommunityHeroesDatabase {
  constructor() {
    this.heroes = new Map()
    this.categories = new Map()
    this.achievements = new Map()
    this.inspirationalStories = new Map()

    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize hero categories
    this.createCategory('political_leaders', {
      name: 'Political Leaders',
      description: 'Leaders who shaped Zambian politics and governance',
      icon: '🏛️'
    })

    this.createCategory('educators', {
      name: 'Educators',
      description: 'Teachers and educational pioneers',
      icon: '📚'
    })

    this.createCategory('innovators', {
      name: 'Innovators',
      description: 'Scientists, inventors, and technological pioneers',
      icon: '💡'
    })

    this.createCategory('community_builders', {
      name: 'Community Builders',
      description: 'Local leaders who improved their communities',
      icon: '🤝'
    })

    this.createCategory('athletes', {
      name: 'Athletes',
      description: 'Sports heroes who represented Zambia',
      icon: '🏆'
    })

    // Add notable Zambian heroes
    this.addHero('kenneth_kaunda', {
      name: 'Kenneth David Kaunda',
      category: 'political_leaders',
      birthDate: new Date('1924-04-28'),
      birthPlace: 'Lubwa, Northern Province',
      achievements: [
        'First President of independent Zambia (1964-1991)',
        'Leader of the independence movement',
        'Advocate for African unity and non-violence',
        'Promoted education and healthcare development'
      ],
      biography: 'Kenneth Kaunda led Zambia to independence and served as its first president for 27 years. Known for his philosophy of humanism and non-violence.',
      inspirationalQuotes: [
        'The secret of political bargaining is to look more strong than what you really are.',
        'A political leader must keep looking over his shoulder all the time to see if the boys are still there.'
      ],
      legacy: 'Father of the Nation, advocate for education and unity',
      modernRelevance: 'Leadership principles, peaceful conflict resolution, nation building',
      multimedia: {
        images: ['kaunda_independence.jpg', 'kaunda_portrait.jpg'],
        videos: ['kaunda_speeches.mp4'],
        audio: ['kaunda_interviews.mp3']
      }
    })

    this.addHero('levy_mwanawasa', {
      name: 'Levy Patrick Mwanawasa',
      category: 'political_leaders',
      birthDate: new Date('1948-09-03'),
      birthPlace: 'Mufulira, Copperbelt Province',
      achievements: [
        'Third President of Zambia (2002-2008)',
        'Anti-corruption crusader',
        'Economic reformer',
        'Advocate for good governance'
      ],
      biography: 'Levy Mwanawasa was known for his fight against corruption and efforts to improve Zambia\'s economy and governance.',
      inspirationalQuotes: [
        'We must fight corruption with the same vigor we fought for independence.',
        'Good governance is not a luxury but a necessity for development.'
      ],
      legacy: 'Anti-corruption champion, economic reformer',
      modernRelevance: 'Integrity in leadership, economic development, good governance'
    })

    this.addHero('dambisa_moyo', {
      name: 'Dambisa Moyo',
      category: 'innovators',
      birthDate: new Date('1969-02-02'),
      birthPlace: 'Lusaka, Lusaka Province',
      achievements: [
        'Renowned economist and author',
        'Expert on macroeconomics and international affairs',
        'Author of "Dead Aid" and other influential books',
        'Global thought leader on development economics'
      ],
      biography: 'Dambisa Moyo is a globally recognized economist who has challenged conventional thinking about aid and development in Africa.',
      inspirationalQuotes: [
        'Aid has been, and continues to be, an unmitigated political, economic, and humanitarian disaster.',
        'What Africa needs is more trade, not more aid.'
      ],
      legacy: 'Economic thought leadership, challenging development paradigms',
      modernRelevance: 'Critical thinking, economic analysis, global perspective'
    })

    console.log('🦸 Community Heroes Database initialized')
  }

  createCategory(categoryId, categoryData) {
    this.categories.set(categoryId, {
      id: categoryId,
      ...categoryData,
      heroCount: 0,
      createdDate: new Date()
    })
  }

  addHero(heroId, heroData) {
    const hero = {
      id: heroId,
      ...heroData,
      addedDate: new Date(),
      viewCount: 0,
      inspirationRating: 0,
      studentFavorites: new Set()
    }

    this.heroes.set(heroId, hero)

    // Update category count
    const category = this.categories.get(hero.category)
    if (category) {
      category.heroCount++
    }

    console.log(`🦸 Hero "${hero.name}" added to database`)
    return hero
  }

  searchHeroes(query, filters = {}) {
    const results = []
    const searchTerm = query.toLowerCase()

    for (const [heroId, hero] of this.heroes) {
      let relevanceScore = 0

      if (hero.name.toLowerCase().includes(searchTerm)) relevanceScore += 10
      if (hero.biography.toLowerCase().includes(searchTerm)) relevanceScore += 5
      if (hero.achievements.some(achievement => achievement.toLowerCase().includes(searchTerm))) relevanceScore += 8
      if (hero.birthPlace.toLowerCase().includes(searchTerm)) relevanceScore += 6

      // Apply filters
      if (filters.category && hero.category !== filters.category) continue
      if (filters.birthPlace && !hero.birthPlace.toLowerCase().includes(filters.birthPlace.toLowerCase())) continue
      if (filters.timeperiod) {
        const birthYear = hero.birthDate.getFullYear()
        if (birthYear < filters.timeperiod.start || birthYear > filters.timeperiod.end) continue
      }

      if (relevanceScore > 0) {
        results.push({
          heroId,
          hero,
          relevanceScore
        })
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  getHeroesByCategory(categoryId) {
    const heroes = []

    for (const [heroId, hero] of this.heroes) {
      if (hero.category === categoryId) {
        heroes.push(hero)
      }
    }

    return heroes.sort((a, b) => a.name.localeCompare(b.name))
  }

  createHeroProfile(heroId) {
    const hero = this.heroes.get(heroId)
    if (!hero) return null

    // Increment view count
    hero.viewCount++

    const profile = {
      ...hero,
      category: this.categories.get(hero.category),
      timeline: this.generateHeroTimeline(hero),
      lessonPlans: this.generateHeroLessonPlans(hero),
      discussionQuestions: this.generateDiscussionQuestions(hero),
      relatedHeroes: this.findRelatedHeroes(hero)
    }

    return profile
  }

  generateHeroTimeline(hero) {
    const timeline = []

    // Add birth
    timeline.push({
      date: hero.birthDate,
      event: `Born in ${hero.birthPlace}`,
      type: 'birth'
    })

    // Add major achievements (simplified - would need more detailed data)
    hero.achievements.forEach((achievement, index) => {
      const estimatedDate = new Date(hero.birthDate)
      estimatedDate.setFullYear(estimatedDate.getFullYear() + 25 + (index * 5)) // Rough estimation

      timeline.push({
        date: estimatedDate,
        event: achievement,
        type: 'achievement'
      })
    })

    return timeline.sort((a, b) => a.date - b.date)
  }

  generateHeroLessonPlans(hero) {
    const lessonPlans = []

    // Primary level lesson plan
    lessonPlans.push({
      level: 'primary',
      title: `Learning from ${hero.name}`,
      duration: '30 minutes',
      objectives: [
        `Learn about ${hero.name}'s life and achievements`,
        'Understand how one person can make a difference',
        'Identify qualities that make a good leader'
      ],
      activities: [
        'Story telling about the hero\'s life',
        'Drawing activity: "What I want to be when I grow up"',
        'Discussion: "How can we help our community?"'
      ]
    })

    // Secondary level lesson plan
    lessonPlans.push({
      level: 'secondary',
      title: `Leadership Lessons from ${hero.name}`,
      duration: '45 minutes',
      objectives: [
        `Analyze ${hero.name}'s leadership style and impact`,
        'Evaluate the challenges they faced and overcame',
        'Apply leadership principles to modern contexts'
      ],
      activities: [
        'Research project on the hero\'s major achievements',
        'Debate: Relevance of their ideas today',
        'Essay: "What leadership qualities do I want to develop?"'
      ]
    })

    return lessonPlans
  }

  generateDiscussionQuestions(hero) {
    return [
      `What challenges did ${hero.name} face, and how did they overcome them?`,
      `Which of ${hero.name}'s qualities do you most admire and why?`,
      `How are ${hero.name}'s ideas relevant to Zambia today?`,
      `What can young people learn from ${hero.name}'s example?`,
      `If you could ask ${hero.name} one question, what would it be?`
    ]
  }

  findRelatedHeroes(hero) {
    const related = []

    for (const [heroId, otherHero] of this.heroes) {
      if (heroId === hero.id) continue

      let relationScore = 0

      // Same category
      if (otherHero.category === hero.category) relationScore += 5

      // Same birth place or region
      if (otherHero.birthPlace === hero.birthPlace) relationScore += 3

      // Similar time period (within 20 years)
      const yearDiff = Math.abs(otherHero.birthDate.getFullYear() - hero.birthDate.getFullYear())
      if (yearDiff <= 20) relationScore += 2

      if (relationScore > 0) {
        related.push({
          hero: otherHero,
          relationScore,
          relationship: this.describeRelationship(hero, otherHero)
        })
      }
    }

    return related
      .sort((a, b) => b.relationScore - a.relationScore)
      .slice(0, 5) // Top 5 related heroes
  }

  describeRelationship(hero1, hero2) {
    if (hero1.category === hero2.category) {
      return `Both were ${this.categories.get(hero1.category).name.toLowerCase()}`
    }

    if (hero1.birthPlace === hero2.birthPlace) {
      return `Both from ${hero1.birthPlace}`
    }

    const yearDiff = Math.abs(hero2.birthDate.getFullYear() - hero1.birthDate.getFullYear())
    if (yearDiff <= 10) {
      return 'Contemporaries'
    }

    return 'Related figure'
  }

  addToFavorites(studentId, heroId) {
    const hero = this.heroes.get(heroId)
    if (hero) {
      hero.studentFavorites.add(studentId)
      console.log(`🌟 ${hero.name} added to favorites for student ${studentId}`)
      return true
    }
    return false
  }

  getStudentFavorites(studentId) {
    const favorites = []

    for (const [heroId, hero] of this.heroes) {
      if (hero.studentFavorites.has(studentId)) {
        favorites.push(hero)
      }
    }

    return favorites
  }

  getPopularHeroes(limit = 10) {
    const heroesArray = Array.from(this.heroes.values())

    return heroesArray
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit)
  }
}

/**
 * Environmental Education System
 * Zambian ecology, conservation, and environmental awareness
 */
export class EnvironmentalEducationSystem {
  constructor() {
    this.ecosystems = new Map()
    this.species = new Map()
    this.conservationProjects = new Map()
    this.environmentalChallenges = new Map()
    this.sustainablePractices = new Map()

    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize Zambian ecosystems
    this.addEcosystem('zambezi_floodplains', {
      name: 'Zambezi Floodplains',
      location: 'Western Province',
      description: 'Seasonal floodplains supporting diverse wildlife and traditional livelihoods',
      characteristics: [
        'Annual flooding cycle',
        'Rich alluvial soils',
        'Grassland and woodland mosaic',
        'High biodiversity'
      ],
      keySpecies: ['Lechwe antelope', 'Sitatunga', 'African fish eagle', 'Zambezi shark'],
      threats: ['Overfishing', 'Pollution', 'Climate change', 'Habitat destruction'],
      conservationStatus: 'Vulnerable',
      culturalSignificance: 'Traditional fishing and farming by Lozi people',
      educationalValue: 'Wetland ecology, seasonal adaptation, human-environment interaction'
    })

    this.addEcosystem('miombo_woodland', {
      name: 'Miombo Woodland',
      location: 'Central and Northern Zambia',
      description: 'Dominant woodland ecosystem covering much of Zambia',
      characteristics: [
        'Deciduous trees adapted to dry season',
        'Fire-adapted vegetation',
        'Rich soil with seasonal nutrients',
        'Complex food webs'
      ],
      keySpecies: ['Brachystegia trees', 'Elephants', 'Lions', 'Wild dogs'],
      threats: ['Deforestation', 'Charcoal production', 'Agricultural expansion'],
      conservationStatus: 'Declining',
      culturalSignificance: 'Traditional medicine, construction materials, spiritual sites',
      educationalValue: 'Forest ecology, sustainable use, conservation strategies'
    })

    // Initialize key species
    this.addSpecies('african_elephant', {
      name: 'African Elephant',
      scientificName: 'Loxodonta africana',
      habitat: 'Miombo woodland, grasslands',
      conservationStatus: 'Endangered',
      population: 'Approximately 27,000 in Zambia',
      threats: ['Poaching for ivory', 'Habitat loss', 'Human-wildlife conflict'],
      role: 'Ecosystem engineer - creates paths, disperses seeds',
      culturalSignificance: 'Symbol of strength and wisdom in many cultures',
      conservationEfforts: [
        'Anti-poaching patrols',
        'Community conservation programs',
        'Wildlife corridors',
        'Education campaigns'
      ],
      educationalActivities: [
        'Tracking elephant movements',
        'Understanding ecosystem roles',
        'Conservation project design',
        'Community conflict resolution'
      ]
    })

    // Initialize conservation projects
    this.addConservationProject('kafue_national_park', {
      name: 'Kafue National Park Conservation',
      location: 'Central Zambia',
      area: '22,400 square kilometers',
      established: '1950',
      objectives: [
        'Protect diverse ecosystems',
        'Maintain wildlife populations',
        'Support local communities',
        'Promote sustainable tourism'
      ],
      challenges: [
        'Poaching pressure',
        'Limited funding',
        'Human-wildlife conflict',
        'Infrastructure needs'
      ],
      successes: [
        'Increased wildlife populations',
        'Community employment',
        'Tourism revenue',
        'Research opportunities'
      ],
      studentActivities: [
        'Virtual park tours',
        'Wildlife monitoring simulations',
        'Conservation planning exercises',
        'Community impact assessments'
      ]
    })

    // Initialize environmental challenges
    this.addEnvironmentalChallenge('deforestation', {
      name: 'Deforestation in Zambia',
      description: 'Loss of forest cover due to human activities',
      causes: [
        'Charcoal production for urban energy',
        'Agricultural expansion',
        'Timber harvesting',
        'Infrastructure development'
      ],
      impacts: [
        'Loss of biodiversity',
        'Soil erosion',
        'Climate change contribution',
        'Reduced water quality'
      ],
      statistics: {
        'Annual forest loss': '250,000-300,000 hectares',
        'Deforestation rate': '0.7% per year',
        'Primary cause': 'Charcoal production (70%)'
      },
      solutions: [
        'Alternative energy sources',
        'Sustainable forestry practices',
        'Reforestation programs',
        'Community education'
      ],
      studentActions: [
        'Tree planting initiatives',
        'Energy conservation at school',
        'Alternative fuel research',
        'Community awareness campaigns'
      ]
    })

    console.log('🌍 Environmental Education System initialized')
  }

  addEcosystem(ecosystemId, ecosystemData) {
    this.ecosystems.set(ecosystemId, {
      id: ecosystemId,
      ...ecosystemData,
      addedDate: new Date()
    })
  }

  addSpecies(speciesId, speciesData) {
    this.species.set(speciesId, {
      id: speciesId,
      ...speciesData,
      addedDate: new Date()
    })
  }

  addConservationProject(projectId, projectData) {
    this.conservationProjects.set(projectId, {
      id: projectId,
      ...projectData,
      addedDate: new Date()
    })
  }

  addEnvironmentalChallenge(challengeId, challengeData) {
    this.environmentalChallenges.set(challengeId, {
      id: challengeId,
      ...challengeData,
      addedDate: new Date()
    })
  }

  createEnvironmentalLessonPlan(topic, gradeLevel) {
    const lessonPlan = {
      id: this.generateLessonId(),
      topic,
      gradeLevel,
      title: `Environmental Education: ${topic}`,
      duration: '45 minutes',
      objectives: [],
      activities: [],
      resources: [],
      assessment: [],
      localConnections: [],
      actionItems: [],
      createdDate: new Date()
    }

    switch (topic.toLowerCase()) {
      case 'biodiversity':
        lessonPlan.objectives = [
          'Understand what biodiversity means',
          'Identify local species and their roles',
          'Appreciate the importance of conservation'
        ]
        lessonPlan.activities = [
          'Local species identification walk',
          'Create a school biodiversity map',
          'Interview community elders about wildlife changes',
          'Design a mini conservation area'
        ]
        lessonPlan.localConnections = [
          'Visit to nearby national park or game management area',
          'Guest speaker from wildlife department',
          'Traditional ecological knowledge from elders'
        ]
        break

      case 'climate change':
        lessonPlan.objectives = [
          'Understand climate change causes and effects',
          'Identify local climate impacts',
          'Develop adaptation and mitigation strategies'
        ]
        lessonPlan.activities = [
          'Weather pattern analysis over time',
          'Carbon footprint calculation',
          'Climate adaptation planning',
          'Renewable energy demonstrations'
        ]
        break
    }

    return lessonPlan
  }

  generateEnvironmentalReport(region) {
    const report = {
      region,
      ecosystems: [],
      keySpecies: [],
      conservationProjects: [],
      challenges: [],
      recommendations: [],
      generatedDate: new Date()
    }

    // Find relevant ecosystems
    for (const [id, ecosystem] of this.ecosystems) {
      if (ecosystem.location.toLowerCase().includes(region.toLowerCase())) {
        report.ecosystems.push(ecosystem)
      }
    }

    // Find relevant species
    for (const [id, species] of this.species) {
      if (species.habitat.toLowerCase().includes(region.toLowerCase())) {
        report.keySpecies.push(species)
      }
    }

    // Find relevant conservation projects
    for (const [id, project] of this.conservationProjects) {
      if (project.location.toLowerCase().includes(region.toLowerCase())) {
        report.conservationProjects.push(project)
      }
    }

    // Add relevant challenges
    report.challenges = Array.from(this.environmentalChallenges.values())

    // Generate recommendations
    report.recommendations = [
      'Establish school environmental clubs',
      'Implement waste reduction programs',
      'Create school gardens and tree nurseries',
      'Partner with local conservation organizations',
      'Develop community environmental education programs'
    ]

    return report
  }

  generateLessonId() {
    return 'env_lesson_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Civic Education Platform
 * Zambian governance, citizenship, and civic responsibility
 */
export class CivicEducationPlatform {
  constructor() {
    this.governmentStructure = new Map()
    this.civicRights = new Map()
    this.civicDuties = new Map()
    this.democraticProcesses = new Map()
    this.constitutionalKnowledge = new Map()

    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize government structure
    this.addGovernmentLevel('national', {
      name: 'National Government',
      description: 'Central government of the Republic of Zambia',
      structure: {
        executive: {
          head: 'President',
          role: 'Head of State and Government',
          responsibilities: [
            'Chief Executive of the nation',
            'Commander-in-Chief of Defense Forces',
            'Appoints Cabinet Ministers',
            'Signs bills into law'
          ],
          currentOffice: 'State House, Lusaka'
        },
        legislative: {
          name: 'National Assembly',
          composition: '167 members',
          role: 'Makes laws for the country',
          responsibilities: [
            'Pass legislation',
            'Approve national budget',
            'Oversight of executive',
            'Represent constituencies'
          ],
          location: 'Parliament Buildings, Lusaka'
        },
        judicial: {
          name: 'Judiciary',
          head: 'Chief Justice',
          role: 'Interprets and applies the law',
          courts: [
            'Constitutional Court',
            'Supreme Court',
            'Court of Appeal',
            'High Court',
            'Subordinate Courts'
          ]
        }
      },
      elections: {
        frequency: 'Every 5 years',
        system: 'First-past-the-post',
        eligibility: 'Citizens 18 years and above'
      }
    })

    // Initialize civic rights
    this.addCivicRight('freedom_of_expression', {
      name: 'Freedom of Expression',
      description: 'Right to express opinions and ideas freely',
      constitutionalBasis: 'Article 20 of the Constitution',
      scope: [
        'Freedom of speech',
        'Freedom of the press',
        'Freedom of assembly',
        'Freedom of association'
      ],
      limitations: [
        'Cannot incite violence',
        'Cannot spread hate speech',
        'Must respect others\' rights',
        'Subject to laws of defamation'
      ],
      examples: [
        'Peaceful protests and demonstrations',
        'Writing letters to newspapers',
        'Joining political parties',
        'Expressing views on social media'
      ],
      responsibilities: [
        'Respect others\' right to different opinions',
        'Use freedom responsibly',
        'Verify information before sharing',
        'Engage in constructive dialogue'
      ]
    })

    // Initialize civic duties
    this.addCivicDuty('voting', {
      name: 'Voting in Elections',
      description: 'Participating in democratic processes through voting',
      importance: [
        'Fundamental democratic right and responsibility',
        'Way to choose leaders and influence policy',
        'Ensures government accountability',
        'Strengthens democratic institutions'
      ],
      process: [
        'Register to vote at 18 years',
        'Obtain voter\'s card',
        'Research candidates and issues',
        'Vote on election day',
        'Respect election results'
      ],
      requirements: [
        'Zambian citizenship',
        'Minimum age of 18 years',
        'Valid National Registration Card',
        'Registration with Electoral Commission'
      ],
      studentPreparation: [
        'Learn about democratic processes',
        'Understand different political systems',
        'Practice critical thinking about issues',
        'Engage in school elections and debates'
      ]
    })

    // Initialize democratic processes
    this.addDemocraticProcess('elections', {
      name: 'Electoral Process',
      description: 'How leaders are chosen in Zambia',
      types: [
        'Presidential elections',
        'Parliamentary elections',
        'Local government elections',
        'By-elections'
      ],
      stages: [
        'Voter registration',
        'Candidate nomination',
        'Campaign period',
        'Voting day',
        'Vote counting',
        'Results announcement',
        'Inauguration'
      ],
      keyInstitutions: [
        'Electoral Commission of Zambia (ECZ)',
        'Political parties',
        'Civil society organizations',
        'Media',
        'Courts'
      ],
      studentActivities: [
        'Mock elections in school',
        'Debate competitions',
        'Candidate research projects',
        'Election observation simulations'
      ]
    })

    console.log('🏛️ Civic Education Platform initialized')
  }

  addGovernmentLevel(levelId, levelData) {
    this.governmentStructure.set(levelId, {
      id: levelId,
      ...levelData,
      addedDate: new Date()
    })
  }

  addCivicRight(rightId, rightData) {
    this.civicRights.set(rightId, {
      id: rightId,
      ...rightData,
      addedDate: new Date()
    })
  }

  addCivicDuty(dutyId, dutyData) {
    this.civicDuties.set(dutyId, {
      id: dutyId,
      ...dutyData,
      addedDate: new Date()
    })
  }

  addDemocraticProcess(processId, processData) {
    this.democraticProcesses.set(processId, {
      id: processId,
      ...processData,
      addedDate: new Date()
    })
  }

  createCivicLessonPlan(topic, gradeLevel) {
    const lessonPlan = {
      id: this.generateCivicLessonId(),
      topic,
      gradeLevel,
      title: `Civic Education: ${topic}`,
      duration: '45 minutes',
      objectives: [],
      activities: [],
      resources: [],
      assessment: [],
      practicalApplications: [],
      createdDate: new Date()
    }

    switch (topic.toLowerCase()) {
      case 'democracy':
        lessonPlan.objectives = [
          'Understand the principles of democracy',
          'Identify democratic institutions in Zambia',
          'Appreciate the role of citizens in democracy'
        ]
        lessonPlan.activities = [
          'Class election simulation',
          'Role-play of parliamentary debate',
          'Create a classroom constitution',
          'Interview local government officials'
        ]
        lessonPlan.practicalApplications = [
          'Student council participation',
          'School policy discussions',
          'Community problem-solving',
          'Peer mediation'
        ]
        break

      case 'human rights':
        lessonPlan.objectives = [
          'Understand fundamental human rights',
          'Identify rights and responsibilities',
          'Recognize violations and remedies'
        ]
        lessonPlan.activities = [
          'Human rights scenarios analysis',
          'Create a school bill of rights',
          'Guest speaker from human rights organization',
          'Design awareness campaign'
        ]
        break
    }

    return lessonPlan
  }

  generateCitizenshipGuide(ageGroup) {
    const guide = {
      ageGroup,
      title: `Young Citizen's Guide to Zambia`,
      sections: [],
      activities: [],
      resources: [],
      createdDate: new Date()
    }

    switch (ageGroup) {
      case 'primary':
        guide.sections = [
          'What is a country?',
          'Zambian symbols and identity',
          'Basic rights and responsibilities',
          'How to be a good citizen'
        ]
        guide.activities = [
          'Draw the Zambian flag',
          'Learn the national anthem',
          'Community helper identification',
          'Good citizen pledge'
        ]
        break

      case 'secondary':
        guide.sections = [
          'Constitutional foundations',
          'Government structure and functions',
          'Rights and freedoms',
          'Civic participation',
          'Democratic processes'
        ]
        guide.activities = [
          'Constitution analysis project',
          'Government structure diagram',
          'Rights and duties comparison',
          'Election simulation',
          'Policy proposal writing'
        ]
        break
    }

    return guide
  }

  generateCivicLessonId() {
    return 'civic_lesson_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Enhanced Language Learning Center
 * Multi-language support including local Zambian languages
 */
export class EnhancedLanguageLearningCenter {
  constructor() {
    this.languages = new Map()
    this.lessons = new Map()
    this.vocabulary = new Map()
    this.culturalContext = new Map()
    this.pronunciationGuides = new Map()
    this.languageExchanges = new Map()

    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize Zambian languages
    this.addLanguage('bemba', {
      name: 'Bemba',
      nativeName: 'IciBemba',
      speakers: 'Approximately 4 million',
      regions: ['Northern Province', 'Luapula Province', 'Copperbelt Province'],
      status: 'Major indigenous language',
      writingSystem: 'Latin script',
      characteristics: [
        'Bantu language family',
        'Tonal language',
        'Agglutinative structure',
        'Rich oral tradition'
      ],
      culturalSignificance: 'Language of the Bemba people, important in mining areas',
      commonPhrases: [
        { bemba: 'Mwashibukeni', english: 'Good morning', pronunciation: 'mwa-shi-bu-ke-ni' },
        { bemba: 'Natotela', english: 'Thank you', pronunciation: 'na-to-te-la' },
        { bemba: 'Muli shani?', english: 'How are you?', pronunciation: 'mu-li sha-ni' },
        { bemba: 'Ndefwaya ukusambilila', english: 'I want to learn', pronunciation: 'nde-fwa-ya u-ku-sam-bi-li-la' }
      ],
      grammar: {
        wordOrder: 'Subject-Verb-Object',
        nounClasses: '18 noun classes with prefixes',
        verbConjugation: 'Complex tense and aspect system'
      }
    })

    this.addLanguage('nyanja', {
      name: 'Nyanja (Chewa)',
      nativeName: 'ChiNyanja',
      speakers: 'Approximately 2.5 million',
      regions: ['Eastern Province', 'Lusaka Province'],
      status: 'Major indigenous language',
      writingSystem: 'Latin script',
      characteristics: [
        'Bantu language family',
        'Tonal language',
        'Widely used in urban areas',
        'Cross-border language (Malawi, Mozambique)'
      ],
      culturalSignificance: 'Trade language, urban communication',
      commonPhrases: [
        { nyanja: 'Mwadzuka bwanji?', english: 'Good morning', pronunciation: 'mwa-dzu-ka bwa-nji' },
        { nyanja: 'Zikomo', english: 'Thank you', pronunciation: 'zi-ko-mo' },
        { nyanja: 'Muli bwanji?', english: 'How are you?', pronunciation: 'mu-li bwa-nji' },
        { nyanja: 'Ndikufuna kuphunzira', english: 'I want to learn', pronunciation: 'ndi-ku-fu-na ku-phu-nzi-ra' }
      ],
      grammar: {
        wordOrder: 'Subject-Verb-Object',
        nounClasses: '16 noun classes',
        verbConjugation: 'Tense markers and aspect'
      }
    })

    this.addLanguage('tonga', {
      name: 'Tonga',
      nativeName: 'ChiTonga',
      speakers: 'Approximately 1.5 million',
      regions: ['Southern Province', 'Western Province'],
      status: 'Major indigenous language',
      writingSystem: 'Latin script',
      characteristics: [
        'Bantu language family',
        'Tonal language',
        'Strong oral traditions',
        'Agricultural terminology'
      ],
      culturalSignificance: 'Language of traditional ceremonies, cattle culture',
      commonPhrases: [
        { tonga: 'Mwaboneni', english: 'Good morning', pronunciation: 'mwa-bo-ne-ni' },
        { tonga: 'Twalumba', english: 'Thank you', pronunciation: 'twa-lum-ba' },
        { tonga: 'Muli buyeni?', english: 'How are you?', pronunciation: 'mu-li bu-ye-ni' },
        { tonga: 'Ndiyanda kuyiiya', english: 'I want to learn', pronunciation: 'ndi-ya-nda ku-yi-ya' }
      ],
      grammar: {
        wordOrder: 'Subject-Verb-Object',
        nounClasses: '15 noun classes',
        verbConjugation: 'Complex tense system'
      }
    })

    // Initialize English as official language
    this.addLanguage('english', {
      name: 'English',
      nativeName: 'English',
      speakers: 'Official language, widely spoken',
      regions: ['All provinces'],
      status: 'Official language',
      writingSystem: 'Latin script',
      characteristics: [
        'Germanic language family',
        'Global lingua franca',
        'Language of education and government',
        'Rich vocabulary from multiple sources'
      ],
      culturalSignificance: 'Official communication, education, international relations',
      zambianVariant: {
        description: 'Zambian English with local influences',
        features: [
          'Influence from local languages',
          'Unique expressions and idioms',
          'Local pronunciation patterns',
          'Cultural adaptations'
        ],
        examples: [
          { expression: 'How far?', meaning: 'How are things?', origin: 'Local adaptation' },
          { expression: 'Sharp sharp', meaning: 'Quickly/immediately', origin: 'Local usage' },
          { expression: 'Salaula', meaning: 'Second-hand clothes', origin: 'From Bemba' }
        ]
      }
    })

    console.log('🗣️ Enhanced Language Learning Center initialized')
  }

  addLanguage(languageId, languageData) {
    this.languages.set(languageId, {
      id: languageId,
      ...languageData,
      addedDate: new Date(),
      learners: new Set(),
      completedLessons: new Map()
    })
  }

  createLanguageLesson(languageId, lessonData) {
    const language = this.languages.get(languageId)
    if (!language) {
      throw new Error('Language not found')
    }

    const lesson = {
      id: this.generateLessonId(),
      languageId,
      title: lessonData.title,
      level: lessonData.level, // beginner, intermediate, advanced
      type: lessonData.type, // vocabulary, grammar, conversation, culture
      content: {
        vocabulary: lessonData.vocabulary || [],
        grammar: lessonData.grammar || {},
        dialogues: lessonData.dialogues || [],
        culturalNotes: lessonData.culturalNotes || [],
        exercises: lessonData.exercises || []
      },
      duration: lessonData.duration || 30,
      objectives: lessonData.objectives || [],
      createdDate: new Date()
    }

    this.lessons.set(lesson.id, lesson)

    console.log(`📚 Language lesson "${lesson.title}" created for ${language.name}`)
    return lesson
  }

  generateBasicLessons(languageId) {
    const language = this.languages.get(languageId)
    if (!language) return []

    const basicLessons = []

    // Lesson 1: Greetings
    basicLessons.push(this.createLanguageLesson(languageId, {
      title: 'Basic Greetings',
      level: 'beginner',
      type: 'vocabulary',
      vocabulary: language.commonPhrases || [],
      objectives: [
        'Learn basic greeting phrases',
        'Understand cultural context of greetings',
        'Practice pronunciation'
      ],
      exercises: [
        {
          type: 'matching',
          instruction: 'Match the greeting with its English translation',
          pairs: language.commonPhrases?.slice(0, 4) || []
        },
        {
          type: 'pronunciation',
          instruction: 'Listen and repeat the greetings',
          items: language.commonPhrases?.map(phrase => phrase.pronunciation) || []
        }
      ],
      culturalNotes: [
        'Greetings are very important in Zambian culture',
        'Always greet elders first',
        'Handshakes are common, especially among men',
        'Time of day affects which greeting to use'
      ]
    }))

    // Lesson 2: Numbers
    basicLessons.push(this.createLanguageLesson(languageId, {
      title: 'Numbers 1-10',
      level: 'beginner',
      type: 'vocabulary',
      vocabulary: this.generateNumbers(languageId),
      objectives: [
        'Learn numbers 1-10',
        'Practice counting',
        'Use numbers in simple sentences'
      ],
      exercises: [
        {
          type: 'counting',
          instruction: 'Count from 1 to 10',
          range: { start: 1, end: 10 }
        },
        {
          type: 'number_recognition',
          instruction: 'Identify the spoken number',
          numbers: [1, 3, 5, 7, 9]
        }
      ]
    }))

    // Lesson 3: Family Terms
    basicLessons.push(this.createLanguageLesson(languageId, {
      title: 'Family Members',
      level: 'beginner',
      type: 'vocabulary',
      vocabulary: this.generateFamilyTerms(languageId),
      objectives: [
        'Learn family relationship terms',
        'Understand family structure in culture',
        'Create simple family descriptions'
      ],
      culturalNotes: [
        'Extended family is very important in Zambian culture',
        'Respect for elders is paramount',
        'Family relationships determine social obligations',
        'Traditional naming patterns reflect family connections'
      ]
    }))

    return basicLessons
  }

  generateNumbers(languageId) {
    const numberSystems = {
      bemba: [
        { local: 'imo', english: 'one', number: 1 },
        { local: 'ibili', english: 'two', number: 2 },
        { local: 'itatu', english: 'three', number: 3 },
        { local: 'iine', english: 'four', number: 4 },
        { local: 'isano', english: 'five', number: 5 }
      ],
      nyanja: [
        { local: 'chimodzi', english: 'one', number: 1 },
        { local: 'chiwiri', english: 'two', number: 2 },
        { local: 'chitatu', english: 'three', number: 3 },
        { local: 'chinayi', english: 'four', number: 4 },
        { local: 'chisanu', english: 'five', number: 5 }
      ],
      tonga: [
        { local: 'chimwe', english: 'one', number: 1 },
        { local: 'chibili', english: 'two', number: 2 },
        { local: 'chitatu', english: 'three', number: 3 },
        { local: 'chine', english: 'four', number: 4 },
        { local: 'chisanu', english: 'five', number: 5 }
      ]
    }

    return numberSystems[languageId] || []
  }

  generateFamilyTerms(languageId) {
    const familySystems = {
      bemba: [
        { local: 'bamaayo', english: 'mother', relationship: 'parent' },
        { local: 'bataata', english: 'father', relationship: 'parent' },
        { local: 'umwana', english: 'child', relationship: 'offspring' },
        { local: 'umukaintu', english: 'sister', relationship: 'sibling' },
        { local: 'umulume', english: 'brother', relationship: 'sibling' }
      ],
      nyanja: [
        { local: 'amayi', english: 'mother', relationship: 'parent' },
        { local: 'abambo', english: 'father', relationship: 'parent' },
        { local: 'mwana', english: 'child', relationship: 'offspring' },
        { local: 'mlongo', english: 'sister', relationship: 'sibling' },
        { local: 'mchimwene', english: 'brother', relationship: 'sibling' }
      ],
      tonga: [
        { local: 'banyina', english: 'mother', relationship: 'parent' },
        { local: 'baata', english: 'father', relationship: 'parent' },
        { local: 'mwana', english: 'child', relationship: 'offspring' },
        { local: 'mukaintu', english: 'sister', relationship: 'sibling' },
        { local: 'mulumi', english: 'brother', relationship: 'sibling' }
      ]
    }

    return familySystems[languageId] || []
  }

  startLanguageLearning(studentId, languageId) {
    const language = this.languages.get(languageId)
    if (!language) {
      throw new Error('Language not found')
    }

    language.learners.add(studentId)

    // Initialize student progress
    if (!language.completedLessons.has(studentId)) {
      language.completedLessons.set(studentId, new Set())
    }

    // Generate basic lessons if they don't exist
    const basicLessons = this.generateBasicLessons(languageId)

    console.log(`🎓 Student ${studentId} started learning ${language.name}`)

    return {
      language,
      availableLessons: basicLessons,
      progress: {
        completedLessons: 0,
        totalLessons: basicLessons.length,
        level: 'beginner'
      }
    }
  }

  completeLesson(studentId, lessonId) {
    const lesson = this.lessons.get(lessonId)
    if (!lesson) {
      throw new Error('Lesson not found')
    }

    const language = this.languages.get(lesson.languageId)
    if (!language) {
      throw new Error('Language not found')
    }

    if (!language.completedLessons.has(studentId)) {
      language.completedLessons.set(studentId, new Set())
    }

    language.completedLessons.get(studentId).add(lessonId)

    console.log(`✅ Student ${studentId} completed lesson "${lesson.title}"`)

    return this.getStudentProgress(studentId, lesson.languageId)
  }

  getStudentProgress(studentId, languageId) {
    const language = this.languages.get(languageId)
    if (!language) return null

    const completedLessons = language.completedLessons.get(studentId) || new Set()
    const totalLessons = Array.from(this.lessons.values())
      .filter(lesson => lesson.languageId === languageId).length

    const progressPercentage = totalLessons > 0 ?
      (completedLessons.size / totalLessons) * 100 : 0

    let level = 'beginner'
    if (progressPercentage >= 75) level = 'advanced'
    else if (progressPercentage >= 40) level = 'intermediate'

    return {
      language: language.name,
      completedLessons: completedLessons.size,
      totalLessons,
      progressPercentage: progressPercentage.toFixed(1),
      level,
      nextRecommendations: this.getNextRecommendations(studentId, languageId)
    }
  }

  getNextRecommendations(studentId, languageId) {
    const language = this.languages.get(languageId)
    if (!language) return []

    const completedLessons = language.completedLessons.get(studentId) || new Set()
    const availableLessons = Array.from(this.lessons.values())
      .filter(lesson => lesson.languageId === languageId && !completedLessons.has(lesson.id))

    return availableLessons.slice(0, 3).map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      level: lesson.level,
      duration: lesson.duration
    }))
  }

  createCulturalExchange(exchangeData) {
    const exchange = {
      id: this.generateExchangeId(),
      title: exchangeData.title,
      description: exchangeData.description,
      languages: exchangeData.languages, // Array of language IDs
      participants: new Set(),
      activities: exchangeData.activities || [],
      schedule: exchangeData.schedule,
      culturalFocus: exchangeData.culturalFocus,
      createdDate: new Date(),
      status: 'open'
    }

    this.languageExchanges.set(exchange.id, exchange)

    console.log(`🌍 Cultural exchange "${exchange.title}" created`)
    return exchange
  }

  generateLessonId() {
    return 'lang_lesson_' + Math.random().toString(36).substr(2, 9)
  }

  generateExchangeId() {
    return 'exchange_' + Math.random().toString(36).substr(2, 9)
  }
}
