import { isSanityConfigured, sanityConfig } from '@/lib/sanity/config'

const MARKETING_HOMEPAGE_QUERY = `*[_type == "marketingHomepage"][0]{
  eyebrow,
  headline,
  primaryDescription,
  secondaryDescription,
  primaryCta,
  secondaryCta,
  trustLine,
  painPoints[]{
    _key,
    title,
    body,
    iconKey
  },
  seoTitle,
  seoDescription
}`

export async function fetchMarketingHomepage() {
  if (!isSanityConfigured()) {
    return null
  }

  const { projectId, dataset, apiVersion } = sanityConfig
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
    },
    body: JSON.stringify({ query: MARKETING_HOMEPAGE_QUERY }),
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    return null
  }

  const payload = await res.json().catch(() => null)
  return payload?.result || null
}
