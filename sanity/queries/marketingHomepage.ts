/** GROQ for the live ZSMS Marketing project (stx0qs9w / production). */
export const MARKETING_HOMEPAGE_QUERY = `
  *[_type == "marketingHomepage"][0]{
    _id,
    eyebrow,
    headline,
    primaryDescription,
    secondaryDescription,
    primaryCta { label, href },
    secondaryCta { label, href },
    trustLine,
    painPoints[]{
      _key,
      title,
      body,
      iconKey
    },
    pricingSection {
      eyebrow,
      headline,
      subheadline,
      footerNote,
      plans[]->{
        _id,
        name,
        planSlug,
        priceLabel,
        billingPeriod,
        summary,
        features,
        emphasis,
        ctaLabel,
        sortOrder
      }
    },
    "seo": {
      "title": coalesce(seoTitle, headline, "ZSMS — ECZ SBA for Zambian Schools"),
      "description": coalesce(seoDescription, primaryDescription, "")
    }
  }
`
