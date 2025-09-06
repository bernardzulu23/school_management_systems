/**
 * Local Language Support System for Zambian Schools
 * Provides comprehensive support for Bemba, Tonga, Nyanja and other Zambian languages
 * Includes voice-to-text, text-to-speech, and cultural adaptations
 */

export class LanguageSystem {
  constructor() {
    this.currentLanguage = 'en'
    this.supportedLanguages = new Map()
    this.translations = new Map()
    this.voiceProfiles = new Map()
    this.culturalAdaptations = new Map()
    this.phoneticMappings = new Map()
    
    this.initializeLanguages()
    this.loadTranslations()
    this.setupVoiceSupport()
    this.loadCulturalAdaptations()
  }

  /**
   * Initialize supported Zambian languages
   */
  initializeLanguages() {
    // Major Zambian languages with their details
    this.supportedLanguages.set('en', {
      name: 'English',
      nativeName: 'English',
      code: 'en',
      region: 'ZM',
      speakers: 1200000,
      official: true,
      script: 'Latin',
      direction: 'ltr'
    })
    
    this.supportedLanguages.set('bem', {
      name: 'Bemba',
      nativeName: 'Ichibemba',
      code: 'bem',
      region: 'ZM',
      speakers: 4200000,
      official: true,
      script: 'Latin',
      direction: 'ltr',
      regions: ['Northern', 'Luapula', 'Copperbelt']
    })
    
    this.supportedLanguages.set('ton', {
      name: 'Tonga',
      nativeName: 'Chitonga',
      code: 'ton',
      region: 'ZM',
      speakers: 1800000,
      official: true,
      script: 'Latin',
      direction: 'ltr',
      regions: ['Southern', 'Western']
    })
    
    this.supportedLanguages.set('nya', {
      name: 'Nyanja',
      nativeName: 'Chinyanja',
      code: 'nya',
      region: 'ZM',
      speakers: 2500000,
      official: true,
      script: 'Latin',
      direction: 'ltr',
      regions: ['Eastern', 'Lusaka']
    })
    
    this.supportedLanguages.set('loz', {
      name: 'Lozi',
      nativeName: 'Silozi',
      code: 'loz',
      region: 'ZM',
      speakers: 800000,
      official: true,
      script: 'Latin',
      direction: 'ltr',
      regions: ['Western']
    })
    
    this.supportedLanguages.set('lun', {
      name: 'Lunda',
      nativeName: 'Chilunda',
      code: 'lun',
      region: 'ZM',
      speakers: 600000,
      official: false,
      script: 'Latin',
      direction: 'ltr',
      regions: ['North-Western']
    })
    
    this.supportedLanguages.set('luv', {
      name: 'Luvale',
      nativeName: 'Chiluvale',
      code: 'luv',
      region: 'ZM',
      speakers: 500000,
      official: false,
      script: 'Latin',
      direction: 'ltr',
      regions: ['North-Western']
    })
    
    console.log(`🌍 ${this.supportedLanguages.size} Zambian languages initialized`)
  }

  /**
   * Load translations for all supported languages
   */
  loadTranslations() {
    // Common school management terms in different languages
    const commonTerms = {
      // Navigation and UI
      'dashboard': {
        'en': 'Dashboard',
        'bem': 'Ukubomba',
        'ton': 'Chibalo',
        'nya': 'Chiwonetsero',
        'loz': 'Libaka'
      },
      'student': {
        'en': 'Student',
        'bem': 'Umwanakashi',
        'ton': 'Mwanakazi',
        'nya': 'Wophunzira',
        'loz': 'Muithuti'
      },
      'teacher': {
        'en': 'Teacher',
        'bem': 'Umwalimu',
        'ton': 'Mwalimu',
        'nya': 'Aphunzitsi',
        'loz': 'Muithuti'
      },
      'attendance': {
        'en': 'Attendance',
        'bem': 'Ukuya ku sukulu',
        'ton': 'Kuyinka ku sikolo',
        'nya': 'Kupita ku sukulu',
        'loz': 'Kuyenda ku sikolo'
      },
      'grades': {
        'en': 'Grades',
        'bem': 'Amamenso',
        'ton': 'Ziyimo',
        'nya': 'Magiredhi',
        'loz': 'Likolo'
      },
      'assignment': {
        'en': 'Assignment',
        'bem': 'Incito',
        'ton': 'Mulimo',
        'nya': 'Ntchito',
        'loz': 'Musebezi'
      },
      'timetable': {
        'en': 'Timetable',
        'bem': 'Icitabo ca nshita',
        'ton': 'Cibalo ca nshita',
        'nya': 'Ndondomeko ya nthawi',
        'loz': 'Libuka la nako'
      },
      'subject': {
        'en': 'Subject',
        'bem': 'Icisomo',
        'ton': 'Cisomo',
        'nya': 'Phunziro',
        'loz': 'Thuto'
      },
      'class': {
        'en': 'Class',
        'bem': 'Icikilasi',
        'ton': 'Kilasi',
        'nya': 'Kalasi',
        'loz': 'Kilasi'
      },
      'school': {
        'en': 'School',
        'bem': 'Isukulu',
        'ton': 'Sikolo',
        'nya': 'Sukulu',
        'loz': 'Sikolo'
      },
      
      // Academic terms
      'mathematics': {
        'en': 'Mathematics',
        'bem': 'Ubalo',
        'ton': 'Mabalo',
        'nya': 'Masamu',
        'loz': 'Mabalo'
      },
      'english': {
        'en': 'English',
        'bem': 'Icingeleshi',
        'ton': 'Cingeleshi',
        'nya': 'Chingelezi',
        'loz': 'Singeleshi'
      },
      'science': {
        'en': 'Science',
        'bem': 'Sayansi',
        'ton': 'Sayansi',
        'nya': 'Sayansi',
        'loz': 'Sayansi'
      },
      'history': {
        'en': 'History',
        'bem': 'Amatanshi',
        'ton': 'Matanshi',
        'nya': 'Mbiri',
        'loz': 'Matanshi'
      },
      'geography': {
        'en': 'Geography',
        'bem': 'Ukwishiba amalo',
        'ton': 'Kuyiba malo',
        'nya': 'Malo a dziko',
        'loz': 'Libaka la naha'
      },
      
      // Common phrases
      'welcome': {
        'en': 'Welcome',
        'bem': 'Mwaiseni',
        'ton': 'Mwabonwa',
        'nya': 'Muli bwanji',
        'loz': 'Lumela'
      },
      'good_morning': {
        'en': 'Good morning',
        'bem': 'Mwashibukeni',
        'ton': 'Mwabuka buti',
        'nya': 'Mwadzuka bwanji',
        'loz': 'Muzuhile hantle'
      },
      'thank_you': {
        'en': 'Thank you',
        'bem': 'Natotela',
        'ton': 'Twalumba',
        'nya': 'Zikomo',
        'loz': 'Kea leboha'
      },
      'yes': {
        'en': 'Yes',
        'bem': 'Ee',
        'ton': 'Inde',
        'nya': 'Inde',
        'loz': 'Kea'
      },
      'no': {
        'en': 'No',
        'bem': 'Awe',
        'ton': 'Kana',
        'nya': 'Ayi',
        'loz': 'Che'
      },
      
      // Status messages
      'present': {
        'en': 'Present',
        'bem': 'Ali pano',
        'ton': 'Uli apa',
        'nya': 'Ali pano',
        'loz': 'U teng'
      },
      'absent': {
        'en': 'Absent',
        'bem': 'Taali pano',
        'ton': 'Takuli apa',
        'nya': 'Palibe',
        'loz': 'Ha a yo'
      },
      'late': {
        'en': 'Late',
        'bem': 'Wachelela',
        'ton': 'Wanonoka',
        'nya': 'Wachedwa',
        'loz': 'U lieile'
      },
      'excellent': {
        'en': 'Excellent',
        'bem': 'Chabwino kwati',
        'ton': 'Cabwino hahulu',
        'nya': 'Chabwino kwambiri',
        'loz': 'Hantle hahulu'
      },
      'good': {
        'en': 'Good',
        'bem': 'Chabwino',
        'ton': 'Cabwino',
        'nya': 'Chabwino',
        'loz': 'Hantle'
      },
      'needs_improvement': {
        'en': 'Needs improvement',
        'bem': 'Cifunika ukusandula',
        'ton': 'Cifuna kusandula',
        'nya': 'Chifunika kukonza',
        'loz': 'Se hloka ntlafatso'
      }
    }
    
    // Store translations
    for (const [key, translations] of Object.entries(commonTerms)) {
      this.translations.set(key, translations)
    }
    
    console.log(`📚 ${this.translations.size} translation sets loaded`)
  }

  /**
   * Setup voice support for Zambian languages
   */
  setupVoiceSupport() {
    // Voice profiles for different languages
    this.voiceProfiles.set('en', {
      language: 'en-ZM',
      voice: 'en-ZM-Standard-A',
      pitch: 1.0,
      rate: 0.9,
      volume: 1.0
    })
    
    this.voiceProfiles.set('bem', {
      language: 'bem-ZM',
      voice: 'bem-ZM-Standard-A',
      pitch: 1.1,
      rate: 0.8,
      volume: 1.0,
      fallback: 'en-ZM'
    })
    
    this.voiceProfiles.set('ton', {
      language: 'ton-ZM',
      voice: 'ton-ZM-Standard-A',
      pitch: 1.0,
      rate: 0.85,
      volume: 1.0,
      fallback: 'en-ZM'
    })
    
    this.voiceProfiles.set('nya', {
      language: 'nya-ZM',
      voice: 'nya-ZM-Standard-A',
      pitch: 0.9,
      rate: 0.9,
      volume: 1.0,
      fallback: 'en-ZM'
    })
    
    // Setup phonetic mappings for better pronunciation
    this.setupPhoneticMappings()
    
    console.log('🎤 Voice support initialized')
  }

  /**
   * Setup phonetic mappings for accurate pronunciation
   */
  setupPhoneticMappings() {
    // Bemba phonetic rules
    this.phoneticMappings.set('bem', {
      'c': 'ch',
      'ng\'': 'ŋ',
      'ny': 'ɲ',
      'sh': 'ʃ',
      'bw': 'βw',
      'tw': 'tw'
    })
    
    // Tonga phonetic rules
    this.phoneticMappings.set('ton', {
      'c': 'ch',
      'bw': 'βw',
      'zw': 'zw',
      'ng\'': 'ŋ',
      'ny': 'ɲ'
    })
    
    // Nyanja phonetic rules
    this.phoneticMappings.set('nya', {
      'c': 'ch',
      'ng\'': 'ŋ',
      'ny': 'ɲ',
      'dz': 'dz',
      'ts': 'ts'
    })
  }

  /**
   * Load cultural adaptations for different regions
   */
  loadCulturalAdaptations() {
    // Cultural adaptations for different regions
    this.culturalAdaptations.set('bem', {
      greetingStyle: 'formal_respectful',
      timeFormat: '12hour',
      dateFormat: 'dd/mm/yyyy',
      numberFormat: 'decimal_comma',
      culturalColors: ['#1e3a8a', '#fbbf24', '#10b981'], // Blue, gold, green
      traditionalGreetings: ['Mwaiseni', 'Mwashibukeni', 'Mwasweleni'],
      respectTerms: ['Ba', 'Mama', 'Tata'],
      seasonalAdaptations: {
        rainy_season: 'Impula',
        dry_season: 'Cimushi',
        planting_season: 'Ukubija'
      }
    })
    
    this.culturalAdaptations.set('ton', {
      greetingStyle: 'warm_community',
      timeFormat: '12hour',
      dateFormat: 'dd/mm/yyyy',
      numberFormat: 'decimal_point',
      culturalColors: ['#dc2626', '#ffffff', '#000000'], // Red, white, black
      traditionalGreetings: ['Mwabonwa', 'Mwabuka buti', 'Mwaswela buti'],
      respectTerms: ['Mukwai', 'Mama', 'Tata'],
      seasonalAdaptations: {
        rainy_season: 'Mvula',
        dry_season: 'Cindi',
        harvest_season: 'Kukungula'
      }
    })
    
    this.culturalAdaptations.set('nya', {
      greetingStyle: 'friendly_inclusive',
      timeFormat: '12hour',
      dateFormat: 'dd/mm/yyyy',
      numberFormat: 'decimal_point',
      culturalColors: ['#059669', '#fbbf24', '#dc2626'], // Green, gold, red
      traditionalGreetings: ['Muli bwanji', 'Mwadzuka bwanji', 'Mwaswera bwanji'],
      respectTerms: ['Bambo', 'Mayi', 'Agogo'],
      seasonalAdaptations: {
        rainy_season: 'Mvula',
        dry_season: 'Chilimwe',
        farming_season: 'Ulimi'
      }
    })
    
    console.log('🏛️ Cultural adaptations loaded')
  }

  /**
   * Set the current language
   */
  setLanguage(languageCode) {
    if (!this.supportedLanguages.has(languageCode)) {
      console.warn(`Language ${languageCode} not supported`)
      return false
    }
    
    this.currentLanguage = languageCode
    
    // Apply language-specific adaptations
    this.applyCulturalAdaptations(languageCode)
    
    // Update document language
    document.documentElement.lang = languageCode
    
    // Emit language change event
    window.dispatchEvent(new CustomEvent('language-changed', {
      detail: { 
        language: languageCode,
        languageInfo: this.supportedLanguages.get(languageCode)
      }
    }))
    
    console.log(`🌍 Language changed to: ${this.supportedLanguages.get(languageCode).nativeName}`)
    return true
  }

  /**
   * Get translation for a key
   */
  translate(key, languageCode = null) {
    const lang = languageCode || this.currentLanguage
    const translations = this.translations.get(key)
    
    if (!translations) {
      console.warn(`Translation key '${key}' not found`)
      return key
    }
    
    return translations[lang] || translations['en'] || key
  }

  /**
   * Get multiple translations
   */
  translateMultiple(keys, languageCode = null) {
    const result = {}
    keys.forEach(key => {
      result[key] = this.translate(key, languageCode)
    })
    return result
  }

  /**
   * Detect language from text
   */
  detectLanguage(text) {
    // Simple language detection based on common words
    const languageIndicators = {
      'bem': ['mwaiseni', 'umwana', 'isukulu', 'natotela', 'ichibemba'],
      'ton': ['mwabonwa', 'mwana', 'sikolo', 'twalumba', 'chitonga'],
      'nya': ['muli bwanji', 'mwana', 'sukulu', 'zikomo', 'chinyanja'],
      'loz': ['lumela', 'ngwana', 'sikolo', 'kea leboha', 'silozi']
    }
    
    const lowerText = text.toLowerCase()
    
    for (const [lang, indicators] of Object.entries(languageIndicators)) {
      const matches = indicators.filter(indicator => lowerText.includes(indicator))
      if (matches.length > 0) {
        return {
          language: lang,
          confidence: matches.length / indicators.length,
          matches: matches
        }
      }
    }
    
    return { language: 'en', confidence: 0.5, matches: [] }
  }

  /**
   * Text-to-speech for Zambian languages
   */
  async speak(text, languageCode = null) {
    const lang = languageCode || this.currentLanguage
    const voiceProfile = this.voiceProfiles.get(lang)
    
    if (!voiceProfile) {
      console.warn(`Voice profile for ${lang} not found`)
      return false
    }
    
    // Apply phonetic corrections
    const correctedText = this.applyPhoneticCorrections(text, lang)
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(correctedText)
      utterance.lang = voiceProfile.language
      utterance.pitch = voiceProfile.pitch
      utterance.rate = voiceProfile.rate
      utterance.volume = voiceProfile.volume
      
      // Try to find appropriate voice
      const voices = speechSynthesis.getVoices()
      const voice = voices.find(v => v.lang.startsWith(lang)) || 
                   voices.find(v => v.lang.startsWith('en'))
      
      if (voice) {
        utterance.voice = voice
      }
      
      speechSynthesis.speak(utterance)
      return true
    }
    
    return false
  }

  /**
   * Apply phonetic corrections for better pronunciation
   */
  applyPhoneticCorrections(text, languageCode) {
    const mappings = this.phoneticMappings.get(languageCode)
    if (!mappings) return text
    
    let correctedText = text
    for (const [from, to] of Object.entries(mappings)) {
      correctedText = correctedText.replace(new RegExp(from, 'gi'), to)
    }
    
    return correctedText
  }

  /**
   * Voice-to-text for Zambian languages
   */
  async startVoiceRecognition(languageCode = null, callback = null) {
    const lang = languageCode || this.currentLanguage
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported')
      return false
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = this.voiceProfiles.get(lang)?.language || 'en-ZM'
    recognition.continuous = false
    recognition.interimResults = true
    
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      const confidence = event.results[0][0].confidence
      
      if (callback) {
        callback({
          text: result,
          confidence: confidence,
          language: lang,
          final: event.results[0].isFinal
        })
      }
    }
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (callback) {
        callback({ error: event.error })
      }
    }
    
    recognition.start()
    return recognition
  }

  /**
   * Apply cultural adaptations
   */
  applyCulturalAdaptations(languageCode) {
    const adaptations = this.culturalAdaptations.get(languageCode)
    if (!adaptations) return
    
    // Apply cultural colors
    if (adaptations.culturalColors) {
      document.documentElement.style.setProperty('--cultural-primary', adaptations.culturalColors[0])
      document.documentElement.style.setProperty('--cultural-secondary', adaptations.culturalColors[1])
      document.documentElement.style.setProperty('--cultural-accent', adaptations.culturalColors[2])
    }
    
    // Apply text direction
    const langInfo = this.supportedLanguages.get(languageCode)
    if (langInfo) {
      document.documentElement.dir = langInfo.direction
    }
    
    console.log(`🎨 Cultural adaptations applied for ${languageCode}`)
  }

  /**
   * Get appropriate greeting based on time and culture
   */
  getContextualGreeting(languageCode = null) {
    const lang = languageCode || this.currentLanguage
    const hour = new Date().getHours()
    const adaptations = this.culturalAdaptations.get(lang)
    
    let greetingKey
    if (hour < 12) {
      greetingKey = 'good_morning'
    } else if (hour < 17) {
      greetingKey = 'good_afternoon'
    } else {
      greetingKey = 'good_evening'
    }
    
    // Use traditional greeting if available
    if (adaptations?.traditionalGreetings) {
      const timeIndex = hour < 12 ? 0 : hour < 17 ? 1 : 2
      return adaptations.traditionalGreetings[timeIndex] || this.translate(greetingKey, lang)
    }
    
    return this.translate(greetingKey, lang)
  }

  /**
   * Format numbers according to cultural preferences
   */
  formatNumber(number, languageCode = null) {
    const lang = languageCode || this.currentLanguage
    const adaptations = this.culturalAdaptations.get(lang)
    
    if (adaptations?.numberFormat === 'decimal_comma') {
      return number.toLocaleString('de-DE') // Uses comma as decimal separator
    }
    
    return number.toLocaleString('en-ZM')
  }

  /**
   * Format date according to cultural preferences
   */
  formatDate(date, languageCode = null) {
    const lang = languageCode || this.currentLanguage
    const adaptations = this.culturalAdaptations.get(lang)
    
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    
    // Use appropriate locale
    const locale = `${lang}-ZM`
    
    try {
      return date.toLocaleDateString(locale, options)
    } catch (error) {
      return date.toLocaleDateString('en-ZM', options)
    }
  }

  /**
   * Get language statistics
   */
  getLanguageStats() {
    return {
      supportedLanguages: this.supportedLanguages.size,
      currentLanguage: this.currentLanguage,
      currentLanguageName: this.supportedLanguages.get(this.currentLanguage)?.nativeName,
      translationKeys: this.translations.size,
      voiceProfilesAvailable: this.voiceProfiles.size,
      culturalAdaptations: this.culturalAdaptations.size,
      speechSynthesisSupported: 'speechSynthesis' in window,
      speechRecognitionSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    }
  }

  /**
   * Get language recommendations based on user location
   */
  getLanguageRecommendations(province = null) {
    const recommendations = {
      'Northern': ['bem', 'en'],
      'Luapula': ['bem', 'en'],
      'Copperbelt': ['bem', 'en'],
      'Central': ['bem', 'nya', 'en'],
      'Eastern': ['nya', 'en'],
      'Lusaka': ['nya', 'bem', 'en'],
      'Southern': ['ton', 'en'],
      'Western': ['ton', 'loz', 'en'],
      'North-Western': ['lun', 'luv', 'en']
    }
    
    if (province && recommendations[province]) {
      return recommendations[province].map(code => ({
        code,
        ...this.supportedLanguages.get(code)
      }))
    }
    
    // Default recommendations
    return ['bem', 'nya', 'ton', 'en'].map(code => ({
      code,
      ...this.supportedLanguages.get(code)
    }))
  }

  /**
   * Export language data for offline use
   */
  exportLanguageData() {
    return {
      languages: Object.fromEntries(this.supportedLanguages),
      translations: Object.fromEntries(this.translations),
      voiceProfiles: Object.fromEntries(this.voiceProfiles),
      culturalAdaptations: Object.fromEntries(this.culturalAdaptations),
      phoneticMappings: Object.fromEntries(this.phoneticMappings),
      currentLanguage: this.currentLanguage,
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * Import language data for offline use
   */
  importLanguageData(data) {
    try {
      if (data.languages) {
        this.supportedLanguages = new Map(Object.entries(data.languages))
      }
      if (data.translations) {
        this.translations = new Map(Object.entries(data.translations))
      }
      if (data.voiceProfiles) {
        this.voiceProfiles = new Map(Object.entries(data.voiceProfiles))
      }
      if (data.culturalAdaptations) {
        this.culturalAdaptations = new Map(Object.entries(data.culturalAdaptations))
      }
      if (data.phoneticMappings) {
        this.phoneticMappings = new Map(Object.entries(data.phoneticMappings))
      }
      if (data.currentLanguage) {
        this.setLanguage(data.currentLanguage)
      }
      
      console.log('📥 Language data imported successfully')
      return true
    } catch (error) {
      console.error('Failed to import language data:', error)
      return false
    }
  }
}

// Export singleton instance
export const languageSystem = new LanguageSystem()
