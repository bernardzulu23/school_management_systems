'use client'

import { createContext, useContext } from 'react'

const SchoolFeaturesContext = createContext(null)

/**
 * Optional provider for feature flags (usually supplied via SchoolContext + useSchoolCapabilities).
 */
export function SchoolFeaturesProvider({ features, children }) {
  return (
    <SchoolFeaturesContext.Provider value={features}>{children}</SchoolFeaturesContext.Provider>
  )
}

/**
 * Access school feature flags in client components.
 * Falls back to useSchoolCapabilities when used inside SchoolProvider.
 */
export function useSchoolFeatures() {
  const ctx = useContext(SchoolFeaturesContext)
  if (!ctx) {
    throw new Error(
      'useSchoolFeatures must be used inside SchoolFeaturesProvider or use useSchoolCapabilities()'
    )
  }
  return ctx
}
