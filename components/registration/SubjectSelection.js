'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { SCHOOL_SUBJECTS, SUBJECT_CATEGORIES, getSubjectsByCategory } from '@/data/subjects'
import { Search, Check, X, BookOpen, Filter } from 'lucide-react'

export default function SubjectSelection({ 
  selectedSubjects = [], 
  onSubjectsChange, 
  userRole = 'student',
  maxSelections = null 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filteredSubjects, setFilteredSubjects] = useState(SCHOOL_SUBJECTS)

  // Filter subjects based on search and category
  useEffect(() => {
    let subjects = SCHOOL_SUBJECTS

    // Filter by category
    if (selectedCategory !== 'All') {
      subjects = getSubjectsByCategory(selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      subjects = subjects.filter(subject => 
        subject.name.toLowerCase().includes(query) ||
        subject.code.toLowerCase().includes(query)
      )
    }

    setFilteredSubjects(subjects)
  }, [searchQuery, selectedCategory])

  const handleSubjectToggle = (subjectId) => {
    const isSelected = selectedSubjects.includes(subjectId)
    let newSelection

    if (isSelected) {
      // Remove subject
      newSelection = selectedSubjects.filter(id => id !== subjectId)
    } else {
      // Add subject (check max limit)
      if (maxSelections && selectedSubjects.length >= maxSelections) {
        alert(`You can only select up to ${maxSelections} subjects`)
        return
      }
      newSelection = [...selectedSubjects, subjectId]
    }

    onSubjectsChange(newSelection)
  }

  const getSelectedSubjectNames = () => {
    return SCHOOL_SUBJECTS
      .filter(subject => selectedSubjects.includes(subject.id))
      .map(subject => subject.name)
  }

  const getCategoryColor = (category) => {
    const categoryData = SUBJECT_CATEGORIES.find(cat => cat.id === category)
    return categoryData ? categoryData.color : 'gray'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Select Subjects
          {userRole === 'teacher' && ' to Teach'}
          {userRole === 'student' && ' to Study'}
          {userRole === 'hod' && ' to Manage'}
        </h3>
        <p className="text-gray-600">
          {maxSelections 
            ? `Choose up to ${maxSelections} subjects` 
            : 'Choose the subjects you want to work with'
          }
        </p>
        {selectedSubjects.length > 0 && (
          <p className="text-sm text-blue-600 mt-2">
            Selected: {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="All">All Categories</option>
            {SUBJECT_CATEGORIES.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Subjects Summary */}
      {selectedSubjects.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center">
              <Check className="h-5 w-5 mr-2" />
              Selected Subjects ({selectedSubjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getSelectedSubjectNames().map(name => (
                <span 
                  key={name}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.map(subject => {
          const isSelected = selectedSubjects.includes(subject.id)
          const colorClass = getCategoryColor(subject.category)
          
          return (
            <Card 
              key={subject.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                  : 'hover:border-gray-400'
              }`}
              onClick={() => handleSubjectToggle(subject.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <BookOpen className={`h-5 w-5 mr-2 text-${colorClass}-600`} />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${colorClass}-100 text-${colorClass}-800`}>
                      {subject.category}
                    </span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-1">{subject.name}</h4>
                <p className="text-xs text-gray-600 mb-2">Code: {subject.code}</p>
                <p className="text-sm text-gray-600">{subject.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No subjects found matching your criteria</p>
          <Button 
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('All')
            }}
            variant="outline"
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600">
          {maxSelections && (
            <span>
              {selectedSubjects.length} of {maxSelections} subjects selected
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => onSubjectsChange([])}
            variant="outline"
            disabled={selectedSubjects.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  )
}
