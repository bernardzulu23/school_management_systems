/**
 * Advanced Search Engine - Powerful search and filtering without external APIs
 * Implements fuzzy search, autocomplete, and intelligent filtering
 */

/**
 * Fuzzy Search Implementation
 * Provides intelligent search with typo tolerance and relevance scoring
 */
export class FuzzySearch {
  static calculateLevenshteinDistance(str1, str2) {
    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    return matrix[len1][len2]
  }

  static calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.calculateLevenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  static search(query, items, options = {}) {
    const {
      keys = ['name'], // Fields to search in
      threshold = 0.3, // Minimum similarity score
      limit = 50,      // Maximum results
      caseSensitive = false
    } = options

    if (!query || query.trim().length === 0) {
      return items.slice(0, limit)
    }

    const searchQuery = caseSensitive ? query : query.toLowerCase()
    const results = []

    items.forEach(item => {
      let maxScore = 0
      let matchedField = null
      let matchedValue = null

      keys.forEach(key => {
        const value = this.getNestedValue(item, key)
        if (value) {
          const searchValue = caseSensitive ? value : value.toLowerCase()
          
          // Exact match gets highest score
          if (searchValue.includes(searchQuery)) {
            const score = searchQuery.length / searchValue.length
            if (score > maxScore) {
              maxScore = Math.min(score * 2, 1) // Boost exact matches
              matchedField = key
              matchedValue = value
            }
          }
          
          // Fuzzy match
          const similarity = this.calculateSimilarity(searchQuery, searchValue)
          if (similarity > maxScore && similarity >= threshold) {
            maxScore = similarity
            matchedField = key
            matchedValue = value
          }
        }
      })

      if (maxScore >= threshold) {
        results.push({
          item,
          score: maxScore,
          matchedField,
          matchedValue,
          highlights: this.generateHighlights(searchQuery, matchedValue, caseSensitive)
        })
      }
    })

    // Sort by score (descending) and return limited results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? String(current[key]) : null
    }, obj)
  }

  static generateHighlights(query, text, caseSensitive = false) {
    if (!text || !query) return []
    
    const searchText = caseSensitive ? text : text.toLowerCase()
    const searchQuery = caseSensitive ? query : query.toLowerCase()
    const highlights = []
    
    let index = searchText.indexOf(searchQuery)
    while (index !== -1) {
      highlights.push({
        start: index,
        end: index + query.length,
        text: text.substring(index, index + query.length)
      })
      index = searchText.indexOf(searchQuery, index + 1)
    }
    
    return highlights
  }
}

/**
 * Advanced Filter Engine
 * Provides complex filtering with multiple criteria and operators
 */
export class FilterEngine {
  static OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    STARTS_WITH: 'starts_with',
    ENDS_WITH: 'ends_with',
    GREATER_THAN: 'greater_than',
    LESS_THAN: 'less_than',
    GREATER_EQUAL: 'greater_equal',
    LESS_EQUAL: 'less_equal',
    BETWEEN: 'between',
    IN: 'in',
    NOT_IN: 'not_in',
    IS_EMPTY: 'is_empty',
    IS_NOT_EMPTY: 'is_not_empty',
    REGEX: 'regex'
  }

  static applyFilters(items, filters) {
    if (!filters || filters.length === 0) {
      return items
    }

    return items.filter(item => {
      return filters.every(filter => this.evaluateFilter(item, filter))
    })
  }

  static evaluateFilter(item, filter) {
    const { field, operator, value, caseSensitive = false } = filter
    const itemValue = this.getFieldValue(item, field)
    
    if (itemValue === null || itemValue === undefined) {
      return operator === this.OPERATORS.IS_EMPTY
    }

    const normalizedItemValue = caseSensitive ? String(itemValue) : String(itemValue).toLowerCase()
    const normalizedFilterValue = caseSensitive ? String(value) : String(value).toLowerCase()

    switch (operator) {
      case this.OPERATORS.EQUALS:
        return normalizedItemValue === normalizedFilterValue

      case this.OPERATORS.NOT_EQUALS:
        return normalizedItemValue !== normalizedFilterValue

      case this.OPERATORS.CONTAINS:
        return normalizedItemValue.includes(normalizedFilterValue)

      case this.OPERATORS.NOT_CONTAINS:
        return !normalizedItemValue.includes(normalizedFilterValue)

      case this.OPERATORS.STARTS_WITH:
        return normalizedItemValue.startsWith(normalizedFilterValue)

      case this.OPERATORS.ENDS_WITH:
        return normalizedItemValue.endsWith(normalizedFilterValue)

      case this.OPERATORS.GREATER_THAN:
        return Number(itemValue) > Number(value)

      case this.OPERATORS.LESS_THAN:
        return Number(itemValue) < Number(value)

      case this.OPERATORS.GREATER_EQUAL:
        return Number(itemValue) >= Number(value)

      case this.OPERATORS.LESS_EQUAL:
        return Number(itemValue) <= Number(value)

      case this.OPERATORS.BETWEEN:
        const [min, max] = Array.isArray(value) ? value : [value.min, value.max]
        const numValue = Number(itemValue)
        return numValue >= Number(min) && numValue <= Number(max)

      case this.OPERATORS.IN:
        const inValues = Array.isArray(value) ? value : [value]
        return inValues.some(v => 
          caseSensitive ? String(itemValue) === String(v) : 
          String(itemValue).toLowerCase() === String(v).toLowerCase()
        )

      case this.OPERATORS.NOT_IN:
        const notInValues = Array.isArray(value) ? value : [value]
        return !notInValues.some(v => 
          caseSensitive ? String(itemValue) === String(v) : 
          String(itemValue).toLowerCase() === String(v).toLowerCase()
        )

      case this.OPERATORS.IS_EMPTY:
        return !itemValue || String(itemValue).trim() === ''

      case this.OPERATORS.IS_NOT_EMPTY:
        return itemValue && String(itemValue).trim() !== ''

      case this.OPERATORS.REGEX:
        try {
          const regex = new RegExp(value, caseSensitive ? 'g' : 'gi')
          return regex.test(String(itemValue))
        } catch (error) {
          console.error('Invalid regex pattern:', value)
          return false
        }

      default:
        return true
    }
  }

  static getFieldValue(item, field) {
    return field.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null
    }, item)
  }

  static generateFilterSuggestions(items, field) {
    const values = new Set()
    
    items.forEach(item => {
      const value = this.getFieldValue(item, field)
      if (value !== null && value !== undefined) {
        values.add(String(value))
      }
    })

    return Array.from(values).sort()
  }
}

/**
 * Autocomplete Engine
 * Provides intelligent autocomplete suggestions
 */
export class AutocompleteEngine {
  constructor(items, options = {}) {
    this.items = items
    this.options = {
      fields: ['name'],
      minLength: 1,
      maxSuggestions: 10,
      caseSensitive: false,
      ...options
    }
    this.index = this.buildIndex()
  }

  buildIndex() {
    const index = new Map()
    
    this.items.forEach((item, itemIndex) => {
      this.options.fields.forEach(field => {
        const value = FilterEngine.getFieldValue(item, field)
        if (value) {
          const words = String(value).split(/\s+/)
          words.forEach(word => {
            const key = this.options.caseSensitive ? word : word.toLowerCase()
            if (!index.has(key)) {
              index.set(key, [])
            }
            index.get(key).push({ item, field, itemIndex, word: value })
          })
        }
      })
    })

    return index
  }

  getSuggestions(query) {
    if (!query || query.length < this.options.minLength) {
      return []
    }

    const searchQuery = this.options.caseSensitive ? query : query.toLowerCase()
    const suggestions = new Map()

    // Exact matches first
    this.index.forEach((entries, key) => {
      if (key.startsWith(searchQuery)) {
        entries.forEach(entry => {
          const suggestionKey = `${entry.field}:${entry.word}`
          if (!suggestions.has(suggestionKey)) {
            suggestions.set(suggestionKey, {
              text: entry.word,
              field: entry.field,
              count: 0,
              score: key === searchQuery ? 2 : 1 // Exact match gets higher score
            })
          }
          suggestions.get(suggestionKey).count++
        })
      }
    })

    // Fuzzy matches if not enough exact matches
    if (suggestions.size < this.options.maxSuggestions) {
      this.index.forEach((entries, key) => {
        if (!key.startsWith(searchQuery)) {
          const similarity = FuzzySearch.calculateSimilarity(searchQuery, key)
          if (similarity > 0.6) {
            entries.forEach(entry => {
              const suggestionKey = `${entry.field}:${entry.word}`
              if (!suggestions.has(suggestionKey)) {
                suggestions.set(suggestionKey, {
                  text: entry.word,
                  field: entry.field,
                  count: 0,
                  score: similarity
                })
              }
              suggestions.get(suggestionKey).count++
            })
          }
        }
      })
    }

    // Sort by score and count, return top suggestions
    return Array.from(suggestions.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return b.count - a.count
      })
      .slice(0, this.options.maxSuggestions)
  }

  updateItems(newItems) {
    this.items = newItems
    this.index = this.buildIndex()
  }
}

/**
 * Smart Search Engine
 * Combines fuzzy search, filtering, and autocomplete
 */
export class SmartSearchEngine {
  constructor(items, options = {}) {
    this.items = items
    this.options = {
      searchFields: ['name'],
      filterableFields: [],
      autocompleteFields: ['name'],
      fuzzyThreshold: 0.3,
      maxResults: 100,
      caseSensitive: false,
      ...options
    }
    
    this.autocomplete = new AutocompleteEngine(items, {
      fields: this.options.autocompleteFields,
      caseSensitive: this.options.caseSensitive
    })
  }

  search(query, filters = [], sortBy = null) {
    let results = this.items

    // Apply filters first
    if (filters.length > 0) {
      results = FilterEngine.applyFilters(results, filters)
    }

    // Apply search query
    if (query && query.trim().length > 0) {
      const searchResults = FuzzySearch.search(query, results, {
        keys: this.options.searchFields,
        threshold: this.options.fuzzyThreshold,
        limit: this.options.maxResults,
        caseSensitive: this.options.caseSensitive
      })
      results = searchResults.map(result => result.item)
    }

    // Apply sorting
    if (sortBy) {
      results = this.sortResults(results, sortBy)
    }

    return {
      results: results.slice(0, this.options.maxResults),
      total: results.length,
      hasMore: results.length > this.options.maxResults
    }
  }

  getSuggestions(query) {
    return this.autocomplete.getSuggestions(query)
  }

  getFilterSuggestions(field) {
    return FilterEngine.generateFilterSuggestions(this.items, field)
  }

  sortResults(results, sortBy) {
    const { field, direction = 'asc' } = sortBy
    
    return results.sort((a, b) => {
      const valueA = FilterEngine.getFieldValue(a, field)
      const valueB = FilterEngine.getFieldValue(b, field)
      
      // Handle null/undefined values
      if (valueA === null || valueA === undefined) return 1
      if (valueB === null || valueB === undefined) return -1
      
      // Numeric comparison
      if (!isNaN(valueA) && !isNaN(valueB)) {
        const comparison = Number(valueA) - Number(valueB)
        return direction === 'asc' ? comparison : -comparison
      }
      
      // String comparison
      const comparison = String(valueA).localeCompare(String(valueB))
      return direction === 'asc' ? comparison : -comparison
    })
  }

  updateItems(newItems) {
    this.items = newItems
    this.autocomplete.updateItems(newItems)
  }

  addItem(item) {
    this.items.push(item)
    this.autocomplete.updateItems(this.items)
  }

  removeItem(predicate) {
    this.items = this.items.filter(item => !predicate(item))
    this.autocomplete.updateItems(this.items)
  }

  getStats() {
    return {
      totalItems: this.items.length,
      searchFields: this.options.searchFields,
      filterableFields: this.options.filterableFields,
      autocompleteFields: this.options.autocompleteFields
    }
  }
}
