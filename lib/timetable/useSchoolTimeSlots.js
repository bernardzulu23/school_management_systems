'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  buildTimeSlotsFromConfig,
  normalizeTimetableConfig,
  resolveSchoolTimeSlots,
} from '@/lib/timetable/timeSlotsFromConfig'

/**
 * Loads this school's TimetableConfig and builds the period grid for UI components.
 */
export function useSchoolTimeSlots() {
  const [timeSlots, setTimeSlots] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/timetable/config', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load school timetable hours')
      const normalized = normalizeTimetableConfig(data.config)
      setConfig(normalized)
      const slots = resolveSchoolTimeSlots(
        normalized,
        Array.isArray(data.timeSlots) ? data.timeSlots : []
      )
      setTimeSlots(slots)
      return { config: normalized, timeSlots: slots }
    } catch (e) {
      setError(e?.message || 'Failed to load timetable config')
      setTimeSlots([])
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { timeSlots, config, loading, error, reload }
}
