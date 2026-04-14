import { redirect } from 'next/navigation'

export default function RegisterSchoolPage({ searchParams }) {
  const qs = new URLSearchParams()
  Object.entries(searchParams || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    if (Array.isArray(v)) v.forEach((vv) => qs.append(k, String(vv)))
    else qs.set(k, String(v))
  })
  const suffix = qs.toString()
  redirect(suffix ? `/onboarding?${suffix}` : '/onboarding')
}
