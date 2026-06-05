export const sanityConfig = {
  projectId: process.env.SANITY_PROJECT_ID || 'stx0qs9w',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
}

export function isSanityConfigured() {
  return Boolean(process.env.SANITY_API_READ_TOKEN && sanityConfig.projectId)
}
