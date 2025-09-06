import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C+'
  if (percentage >= 40) return 'C'
  if (percentage >= 30) return 'D'
  return 'F'
}

export function getGradeColor(grade) {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-green-600 bg-green-100'
    case 'B+':
    case 'B':
      return 'text-blue-600 bg-blue-100'
    case 'C+':
    case 'C':
      return 'text-yellow-600 bg-yellow-100'
    case 'D':
      return 'text-orange-600 bg-orange-100'
    case 'F':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function getRoleColor(role) {
  switch (role) {
    case 'headteacher':
      return 'text-purple-600 bg-purple-100'
    case 'hod':
      return 'text-indigo-600 bg-indigo-100'
    case 'teacher':
      return 'text-blue-600 bg-blue-100'
    case 'student':
      return 'text-green-600 bg-green-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-100'
    case 'inactive':
      return 'text-gray-600 bg-gray-100'
    case 'suspended':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function debounce(func, wait) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
