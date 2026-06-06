import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

/**
 * Load level-filtered subjects grouped by category for the current school.
 */
export function useSubjects({ gradeLevel } = {}) {
  const [subjects, setSubjects] = useState([])
  const [subjectsByCategory, setSubjectsByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    async function loadSubjects() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (gradeLevel) params.set('gradeLevel', gradeLevel)
        const qs = params.toString()
        const response = await fetch(`/api/v1/subjects/by-category${qs ? `?${qs}` : ''}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          const categoryData = data.data || {}
          setSubjectsByCategory(categoryData)
          setMeta(data.meta || null)

          const allSubjects = Object.values(categoryData).flat()
          setSubjects(allSubjects)
        } else {
          toast.error('Failed to load subjects')
        }
      } catch (error) {
        console.error('Error loading subjects:', error)
        toast.error('Error loading subjects')
      } finally {
        setLoading(false)
      }
    }

    loadSubjects()
  }, [gradeLevel])

  return { subjects, subjectsByCategory, loading, meta }
}
