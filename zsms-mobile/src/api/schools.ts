import { api } from './client'
import type { SchoolSummary } from '@/types'

export interface PublicSchoolRow {
  id: string
  name: string
  subdomain: string
  logo_url?: string | null
}

/** Search publicly listed schools by name */
export async function searchSchools(query: string): Promise<SchoolSummary[]> {
  const q = encodeURIComponent(query.trim())
  const data = await api<{ schools: PublicSchoolRow[] }>(`/api/public/schools?q=${q}`, {
    skipAuth: true,
  })
  return (data.schools || []).map((s) => ({
    id: s.id,
    name: s.name,
    subdomain: s.subdomain,
    logoUrl: s.logo_url ?? null,
  }))
}

/** Validate subdomain before login */
export async function validateSubdomain(subdomain: string): Promise<SchoolSummary> {
  const data = await api<{ valid: boolean; school: SchoolSummary }>(
    `/api/mobile/school/lookup?subdomain=${encodeURIComponent(subdomain.trim())}`,
    { skipAuth: true }
  )
  return data.school
}
