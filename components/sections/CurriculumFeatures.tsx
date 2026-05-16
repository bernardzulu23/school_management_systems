'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CURRICULUM_FEATURE_CATALOG,
  HEADTEACHER_PREVIEW_PILLS,
} from '@/lib/marketing/featureCatalog'

export function CurriculumFeatures({ loginUrl = '/login' }) {
  const [features, setFeatures] = useState(CURRICULUM_FEATURE_CATALOG)
  const [stats, setStats] = useState<{ activeSchools?: number } | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/public/features').then((r) => r.json()),
      fetch('/api/public/platform-stats').then((r) => r.json()),
    ])
      .then(([featRes, statsRes]) => {
        if (!active) return
        if (featRes?.curriculumFeatures?.length) setFeatures(featRes.curriculumFeatures)
        if (statsRes?.stats) setStats(statsRes.stats)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <section id="features" style={{ padding: '3.5rem 1.5rem', background: 'var(--color-white)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="section-label">Platform features</div>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
          }}
        >
          Features built for the Zambian curriculum
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Attendance, grades, reporting, coordination
          {stats?.activeSchools != null && stats.activeSchools > 0 && (
            <span> · {stats.activeSchools} schools on the platform</span>
          )}
        </p>

        <div
          className="features-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}
        >
          <div>
            {features.map((f) => (
              <div key={f.id} style={{ marginBottom: '1.75rem' }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 8,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ color: 'var(--color-accent)', marginRight: 8 }}>•</span>
                  {f.title}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65,
                    paddingLeft: 22,
                    marginBottom: 8,
                  }}
                >
                  {f.body}
                </p>
                <Link
                  href={`${loginUrl}?from=${f.id}`}
                  style={{ fontSize: 12, color: 'var(--color-accent)', paddingLeft: 22 }}
                >
                  Available after sign-in →
                </Link>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <p style={{ fontSize: 12, color: 'var(--color-accent)', marginBottom: 10 }}>
                Headteacher Dashboard
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 12, gap: 6 }}>
                {HEADTEACHER_PREVIEW_PILLS.map((pill) => (
                  <span key={pill.label} className="pill">
                    {pill.label}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Live attendance %, performance analytics, and HOD oversight in one hub.
              </p>
            </div>

            <div className="card">
              <p style={{ fontSize: 12, color: 'var(--color-accent)', marginBottom: 6 }}>
                Works on MTN, Airtel &amp; Zamtel networks
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Designed for Zambian internet speeds. No data-heavy downloads required. Works
                offline too.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
