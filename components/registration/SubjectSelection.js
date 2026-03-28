'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { SCHOOL_SUBJECTS, SUBJECT_CATEGORIES, getSubjectsByCategory } from '@/data/subjects'
import { Search, Check, X, BookOpen, Filter } from 'lucide-react'

export default function SubjectSelection({
  selectedSubjects = [],
  onSubjectsChange,
  userRole = 'student',
  maxSelections = null,
  valueType = 'id',
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
      subjects = subjects.filter(
        (subject) =>
          subject.name.toLowerCase().includes(query) || subject.code.toLowerCase().includes(query)
      )
    }

    setFilteredSubjects(subjects)
  }, [searchQuery, selectedCategory])

  const getValue = (subject) => {
    return valueType === 'name' ? subject.name : subject.id
  }

  const isSelectedValue = (value) => {
    return selectedSubjects.includes(value)
  }

  const handleSubjectToggle = (value) => {
    const isSelected = isSelectedValue(value)
    let newSelection

    if (isSelected) {
      // Remove subject
      newSelection = selectedSubjects.filter((v) => v !== value)
    } else {
      // Add subject (check max limit)
      if (maxSelections && selectedSubjects.length >= maxSelections) {
        toast.error(`You can only select up to ${maxSelections} subjects`)
        return
      }
      newSelection = [...selectedSubjects, value]
    }

    onSubjectsChange(newSelection)
  }

  const getSelectedSubjectNames = () => {
    if (valueType === 'name') {
      return selectedSubjects.map((v) => String(v))
    }
    return SCHOOL_SUBJECTS.filter((subject) => selectedSubjects.includes(subject.id)).map(
      (subject) => subject.name
    )
  }

  const getCategoryColor = (category) => {
    const categoryData = SUBJECT_CATEGORIES.find((cat) => cat.id === category)
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
            : 'Choose the subjects you want to work with'}
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
            {SUBJECT_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject Dropdown Selection */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-medium text-gray-900 mb-2">Add Subject to List</label>
        <div className="relative">
          <select
            className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 appearance-none"
            onChange={(e) => {
              if (e.target.value) {
                const value = valueType === 'name' ? String(e.target.value) : Number(e.target.value)
                handleSubjectToggle(value)
                e.target.value = ''
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Select a subject to add...
            </option>
            {filteredSubjects
              .filter((s) => !isSelectedValue(getValue(s)))
              .map((subject) => (
                <option key={subject.id} value={getValue(subject)}>
                  {subject.name} ({subject.category})
                </option>
              ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Select a subject from the dropdown to add it to your list.
        </p>
      </div>

      {/* Selected Subjects List */}
      {selectedSubjects.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Selected Subjects:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedSubjects.map((subjectId) => {
              const subject =
                valueType === 'name'
                  ? SCHOOL_SUBJECTS.find((s) => s.name === String(subjectId))
                  : SCHOOL_SUBJECTS.find((s) => s.id === Number(subjectId))
              if (!subject) return null

              const colorClass = getCategoryColor(subject.category)

              return (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-red-200 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-8 rounded-full bg-${colorClass}-500 mr-3`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{subject.name}</p>
                      <p className="text-xs text-gray-500">{subject.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSubjectToggle(getValue(subject))}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Remove subject"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No subjects selected yet</p>
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
