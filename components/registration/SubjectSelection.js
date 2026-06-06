'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { SCHOOL_SUBJECTS, SUBJECT_CATEGORIES } from '@/data/subjects'
import { Search, Check, X, BookOpen, Filter } from 'lucide-react'

const SUBJECT_ORDER = [
  'mathematics',
  'english',
  'science',
  'biology',
  'geography',
  'home management',
  'religious education',
  'cinyanja',
  'principals of accounts',
  'principles of accounts',
  'commerce',
]

const SUBJECT_ORDER_MAP = (() => {
  const map = new Map()
  SUBJECT_ORDER.forEach((name, index) => {
    if (!map.has(name)) map.set(name, index)
  })
  if (!map.has('mathematics')) map.set('mathematics', 0)
  if (!map.has('mthematics')) map.set('mthematics', map.get('mathematics'))
  if (!map.has('principals of accounts') && map.has('principles of accounts')) {
    map.set('principals of accounts', map.get('principles of accounts'))
  }
  if (!map.has('principles of accounts') && map.has('principals of accounts')) {
    map.set('principles of accounts', map.get('principals of accounts'))
  }
  return map
})()

function normalizeSubjectName(value) {
  const n = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  if (n === 'mthematics') return 'mathematics'
  return n
}

function compareSubjects(a, b) {
  const ra = SUBJECT_ORDER_MAP.has(normalizeSubjectName(a.name))
    ? SUBJECT_ORDER_MAP.get(normalizeSubjectName(a.name))
    : Number.POSITIVE_INFINITY
  const rb = SUBJECT_ORDER_MAP.has(normalizeSubjectName(b.name))
    ? SUBJECT_ORDER_MAP.get(normalizeSubjectName(b.name))
    : Number.POSITIVE_INFINITY

  if (ra !== rb) return ra - rb
  return String(a.name || '').localeCompare(String(b.name || ''))
}

export default function SubjectSelection({
  selectedSubjects = [],
  onSubjectsChange,
  userRole = 'student',
  maxSelections = null,
  minSelections = null,
  valueType = 'id',
  catalogSubjects = null,
  categories = null,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const subjectSource = catalogSubjects || SCHOOL_SUBJECTS
  const categorySource = categories || SUBJECT_CATEGORIES
  const [filteredSubjects, setFilteredSubjects] = useState(subjectSource)

  // Filter subjects based on search and category
  useEffect(() => {
    let subjects = subjectSource

    // Filter by category
    if (selectedCategory !== 'All') {
      subjects = subjects.filter((s) => s.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      subjects = subjects.filter(
        (subject) =>
          subject.name.toLowerCase().includes(query) || subject.code.toLowerCase().includes(query)
      )
    }

    setFilteredSubjects(subjects.slice().sort(compareSubjects))
  }, [searchQuery, selectedCategory, subjectSource])

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
    return subjectSource
      .filter((subject) => selectedSubjects.includes(subject.id))
      .map((subject) => subject.name)
  }

  const getCategoryColor = () => {
    return 'badge-brand'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-royalPurple-text1 mb-2">
          Select Subjects
          {userRole === 'teacher' && ' to Teach'}
          {userRole === 'student' && ' to Study'}
          {userRole === 'hod' && ' to Manage'}
        </h3>
        <p className="text-royalPurple-text2">
          {minSelections && maxSelections
            ? `Choose ${minSelections} to ${maxSelections} subjects`
            : maxSelections
              ? `Choose up to ${maxSelections} subjects`
              : minSelections
                ? `Choose at least ${minSelections} subjects`
                : 'Choose the subjects you want to work with'}
        </p>
        {selectedSubjects.length > 0 && (
          <p className="text-sm text-royalPurple-accentTx mt-2">
            Selected: {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}
          </p>
        )}
        {minSelections && selectedSubjects.length < minSelections && (
          <p className="text-sm text-royalPurple-dangerTx mt-2">
            Select {minSelections - selectedSubjects.length} more subject
            {minSelections - selectedSubjects.length !== 1 ? 's' : ''} to continue
          </p>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 h-4 w-4" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-10 pr-4 py-2"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 h-4 w-4" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="zsms-select pl-10 pr-8 py-2 appearance-none"
          >
            <option value="All">All Categories</option>
            {categorySource.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject Dropdown Selection */}
      <div className="bg-royalPurple-card p-6 rounded-xl border border-royalPurple-border shadow-sm">
        <label className="block text-sm font-medium text-royalPurple-text1 mb-2">
          Add Subject to List
        </label>
        <div className="relative">
          <select
            className="zsms-select p-3 pr-10 appearance-none"
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
              className="w-5 h-5 text-royalPurple-text3"
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
        <p className="text-xs text-royalPurple-text3 mt-2">
          Select a subject from the dropdown to add it to your list.
        </p>
      </div>

      {/* Selected Subjects List */}
      {selectedSubjects.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-royalPurple-text2">Selected Subjects:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedSubjects
              .map((subjectId) => {
                const subject =
                  valueType === 'name'
                    ? SCHOOL_SUBJECTS.find((s) => s.name === String(subjectId))
                    : SCHOOL_SUBJECTS.find((s) => s.id === Number(subjectId))
                if (!subject) return null
                const colorClass = getCategoryColor()

                return (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 bg-royalPurple-card rounded-lg border border-royalPurple-border shadow-sm group hover:border-royalPurple-border transition-colors"
                  >
                    <div className="flex items-center">
                      <div>
                        <p className="font-medium text-royalPurple-text1">{subject.name}</p>
                        <span className={colorClass}>{subject.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSubjectToggle(getValue(subject))}
                      className="p-1.5 rounded-full text-royalPurple-text3 hover:bg-royalPurple-danger hover:text-royalPurple-dangerTx transition-colors"
                      title="Remove subject"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })
              .filter(Boolean)
              .sort(compareSubjects)}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-royalPurple-page rounded-xl border border-dashed border-royalPurple-border">
          <BookOpen className="h-10 w-10 text-royalPurple-text3 mx-auto mb-3" />
          <p className="text-royalPurple-text3">No subjects selected yet</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-royalPurple-text2">
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
