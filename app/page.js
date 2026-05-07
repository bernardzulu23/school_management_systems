'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { SchoolLogo } from '@/components/SchoolLogo'
import { AlertTriangle, BarChart2, ClipboardList, FileX, Smartphone, Users } from 'lucide-react'
import { AIFeatures } from '@/components/sections/AIFeatures'
import { TimeSavings } from '@/components/sections/TimeSavings'
import { Pricing } from '@/components/sections/Pricing'

export default function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const { school, isLoading: isSchoolLoading } = useSchool()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const [isMarketingSite, setIsMarketingSite] = useState(true)
  const [schoolSearch, setSchoolSearch] = useState('')
  const heroRef = useRef(null)
  const [schoolsDirectory, setSchoolsDirectory] = useState([])
  const [isSchoolDirectoryLoading, setIsSchoolDirectoryLoading] = useState(false)
  const [publicFeedback, setPublicFeedback] = useState([])
  const [isPublicFeedbackLoading, setIsPublicFeedbackLoading] = useState(false)

  const problems = useMemo(
    () => [
      {
        icon: FileX,
        accent: 'var(--color-accent)',
        title: 'Paper registers getting lost',
        body: 'Digital attendance records that cannot be destroyed, lost, or altered. Ministry inspectors can verify anytime.',
      },
      {
        icon: BarChart2,
        accent: 'var(--color-accent)',
        title: 'No visibility on student performance',
        body: 'Spot students at risk of failing before it is too late. Track marks across all subjects in real-time.',
      },
      {
        icon: ClipboardList,
        accent: 'var(--color-accent)',
        title: 'Headteacher reporting burden',
        body: 'Generate MOE-ready reports in one click. No more compiling data from each teacher manually before district visits.',
      },
      {
        icon: Users,
        accent: 'var(--color-accent)',
        title: 'HOD coordination challenges',
        body: 'Department heads manage their subjects, teachers, and performance from a dedicated dashboard — no WhatsApp groups needed.',
      },
      {
        icon: AlertTriangle,
        accent: 'var(--color-accent)',
        title: "Girls' dropout tracking",
        body: 'Identify female students with declining attendance early. Especially critical for rural schools where girls face higher dropout risk.',
      },
      {
        icon: Smartphone,
        accent: 'var(--color-accent)',
        title: 'Works on any device',
        body: 'Phone, tablet, or computer — and works offline when internet is slow. Critical for rural and peri-urban schools across Zambia.',
      },
    ],
    []
  )

  const features = useMemo(
    () => [
      {
        title: 'ECZ Exam Tracking',
        body: 'Record internal assessments, CAs, and mock results. Predict ECZ pass rates before the national examinations.',
      },
      {
        title: 'MOE-aligned reporting',
        body: 'Generate the exact reports district education offices expect. Makes school inspections and EMIS reporting straightforward.',
      },
      {
        title: 'STEM subject performance monitoring',
        body: 'Track performance gaps in Mathematics, Science, and ICT — the subjects where Zambian students need the most intervention.',
      },
      {
        title: 'Class management',
        body: "Built around the Zambian secondary school structure — not imported from another country's curriculum.",
      },
    ],
    []
  )

  const formatRoleLabel = useMemo(() => {
    return (role) => {
      const raw = String(role || '').toLowerCase()
      if (!raw) return 'User'
      if (raw === 'headteacher') return 'Headteacher'
      if (raw === 'teacher') return 'Teacher'
      if (raw === 'hod') return 'HOD'
      if (raw === 'student') return 'Student'
      if (raw === 'admin') return 'Admin'
      return raw.charAt(0).toUpperCase() + raw.slice(1)
    }
  }, [])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hostname = String(window.location.hostname || '')
      .split(':')[0]
      .toLowerCase()

    if (!hostname || hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) {
      setIsMarketingSite(true)
      return
    }

    const parts = hostname.split('.').filter(Boolean)
    if (parts.length < 3) {
      setIsMarketingSite(true)
      return
    }

    if (parts[0] === 'www') {
      setIsMarketingSite(parts.length < 4)
      return
    }

    setIsMarketingSite(false)
  }, [])

  const tenantSchool = isMarketingSite ? null : school
  const registerUrl = tenantSchool ? '/register' : '/register-school'

  useEffect(() => {
    const load = async () => {
      if (!isMarketingSite && school) return
      setIsSchoolDirectoryLoading(true)
      try {
        const res = await fetch('/api/public/schools', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        setSchoolsDirectory(Array.isArray(data?.schools) ? data.schools : [])
      } catch {
        setSchoolsDirectory([])
      } finally {
        setIsSchoolDirectoryLoading(false)
      }
    }
    load()
  }, [isMarketingSite, school])

  useEffect(() => {
    const load = async () => {
      setIsPublicFeedbackLoading(true)
      try {
        const res = await fetch('/api/public/feedback', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        setPublicFeedback(Array.isArray(data?.feedbacks) ? data.feedbacks : [])
      } catch {
        setPublicFeedback([])
      } finally {
        setIsPublicFeedbackLoading(false)
      }
    }
    load()
  }, [])

  const handleSearchSchools = async () => {
    setIsSchoolDirectoryLoading(true)
    try {
      const q = schoolSearch.trim()
      const url = q ? `/api/public/schools?q=${encodeURIComponent(q)}` : '/api/public/schools'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      setSchoolsDirectory(Array.isArray(data?.schools) ? data.schools : [])
    } catch {
      setSchoolsDirectory([])
    } finally {
      setIsSchoolDirectoryLoading(false)
    }
  }

  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      switch (user.role) {
        case 'headteacher':
          router.push('/dashboard/headteacher')
          break
        case 'hod':
          router.push('/dashboard/hod')
          break
        case 'teacher':
          router.push('/dashboard/teacher')
          break
        case 'student':
          router.push('/dashboard/student')
          break
        default:
          router.push('/login')
      }
    }
  }, [isHydrated, isAuthenticated, user, router])

  if (!isHydrated || isSchoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-page">
        <LoadingSpinner size="xl" color="primary" label="Loading" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-page">
        <LoadingSpinner size="xl" color="primary" label="Redirecting" />
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--rp-page)',
        minHeight: '100vh',
        color: 'var(--rp-text1)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .fade-up-1 { animation-delay: 0.1s; opacity: 0; }
        .fade-up-2 { animation-delay: 0.25s; opacity: 0; }
        .fade-up-3 { animation-delay: 0.4s; opacity: 0; }
        .fade-up-4 { animation-delay: 0.55s; opacity: 0; }
        .btn-primary {
          background: var(--color-accent); color: var(--color-white); border: none;
          padding: 12px 20px; border-radius: 8px; font-size: 15px;
          font-weight: 700; cursor: pointer; text-decoration: none;
          display: inline-block; transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.01em;
        }
        .btn-primary:hover { opacity: 0.9; }
        .btn-secondary {
          background: var(--color-white); color: var(--text-primary);
          border: 1px solid var(--border); padding: 12px 20px;
          border-radius: 8px; font-size: 15px; font-weight: 600;
          cursor: pointer; text-decoration: none; display: inline-block;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .btn-secondary:hover { background: var(--surface-alt); border-color: var(--border-hover); }
        .btn-sm {
          padding: 8px 14px; font-size: 13px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--color-white);
          color: var(--text-primary); cursor: pointer; text-decoration: none;
          display: inline-block; transition: background 0.2s;
        }
        .btn-sm:hover { background: var(--surface-alt); }
        .card {
          background: var(--color-white);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }
        .problem-card {
          border-radius: 12px;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          background: var(--color-white);
          border: 1px solid var(--border);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          cursor: default;
        }
        .problem-card:hover { border-color: var(--color-accent); box-shadow: 0 4px 6px -2px var(--border-hover); }
        .accent-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 12px 12px 0 0;
        }
        .icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          position: relative;
        }
        .section-label {
          font-size: 11px; color: var(--color-accent); text-transform: uppercase;
          letter-spacing: 0.12em; font-weight: 700; margin-bottom: 0.75rem;
        }
        .divider { border: none; border-top: 1px solid var(--border); margin: 0; }
        .stat-card {
          background: var(--color-white);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
        }
        .tag {
          display: inline-block; font-size: 11px; padding: 4px 12px;
          border-radius: 999px; border: 1px solid var(--border);
          color: var(--text-secondary); margin: 3px; background: var(--surface-alt);
        }
        .search-input {
          flex: 1; padding: 12px 16px;
          border: 1px solid var(--border); border-radius: 10px;
          background: var(--color-white); color: var(--text-primary); font-size: 14px;
          outline: none; transition: border-color 0.2s;
        }
        .search-input:focus { border-color: var(--color-accent); }
        .search-input::placeholder { color: var(--text-muted); }
        .school-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 0; border-bottom: 1px solid var(--border);
        }
        .school-row:last-child { border-bottom: none; }
        .testimonial-bar { border-left: 3px solid var(--color-accent); padding-left: 1.25rem; }
        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: 999px; padding: 6px 14px; font-size: 13px;
          color: var(--text-secondary); margin: 3px;
        }
        .alert-box {
          background: var(--danger-bg); border: 1px solid var(--danger-color);
          border-radius: 10px; padding: 10px 14px; font-size: 13px;
          color: var(--danger-color);
        }
        nav a { text-decoration: none; }
        @media (max-width: 640px) {
          .hero-buttons { flex-direction: column; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .problems-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          background: 'var(--color-white)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 28, display: 'flex', alignItems: 'center' }}>
            <SchoolLogo
              src={tenantSchool?.logo_url || '/Assets/logo.jpg'}
              alt={tenantSchool?.name || 'ZSMS'}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {tenantSchool?.name || 'ZSMS'}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 99,
              background: 'var(--badge-up-bg)',
              color: 'var(--badge-up-color)',
              border: '1px solid var(--color-kpi-pass)',
              fontWeight: 600,
            }}
          >
            Zambian-built
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tenantSchool ? (
            <>
              <Link href="/login" className="btn-sm">
                Sign in
              </Link>
              <Link
                href={registerUrl}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: 13 }}
              >
                Get started
              </Link>
            </>
          ) : (
            <Link
              href={registerUrl}
              className="btn-primary"
              style={{ padding: '9px 20px', fontSize: 13 }}
            >
              Register free
            </Link>
          )}
        </div>
      </nav>

      <section
        ref={heroRef}
        style={{
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--border)',
          padding: '5rem 0',
        }}
      >
        <div
          style={{
            maxWidth: 896,
            margin: '0 auto',
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          <div
            className="fade-up fade-up-1"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-accent)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            School Management System
          </div>

          <h1
            className="fade-up fade-up-2"
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 24,
              color: 'var(--text-primary)',
            }}
          >
            Built for Zambian schools
          </h1>

          <p
            className="fade-up fade-up-2"
            style={{
              fontSize: 20,
              color: 'var(--text-secondary)',
              maxWidth: 720,
              margin: '0 auto 16px',
              lineHeight: 1.75,
            }}
          >
            Manage attendance, track grades, generate reports, and coordinate teachers. AI tools
            save teachers 14+ hours every month.
          </p>

          <p
            className="fade-up fade-up-2"
            style={{
              fontSize: 18,
              color: 'var(--text-secondary)',
              maxWidth: 720,
              margin: '0 auto 28px',
              fontWeight: 600,
              lineHeight: 1.65,
            }}
          >
            All from one platform. No more paper registers. No more lost records.
          </p>

          <div
            className="fade-up fade-up-3 hero-buttons"
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: 20,
            }}
          >
            <Link href={registerUrl} className="btn-primary">
              Start free trial
            </Link>
            <Link href="#features" className="btn-secondary">
              View features
            </Link>
          </div>

          <p
            className="fade-up fade-up-4"
            style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}
          >
            Free 30-day trial · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      <hr className="divider" />

      <section
        style={{
          padding: '4rem 1.5rem',
          background: 'var(--color-white)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
          <div className="section-label">The real problems ZSMS solves</div>
          <h2
            style={{
              fontSize: 'clamp(22px,3.5vw,30px)',
              fontWeight: 800,
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
            }}
          >
            Built around how Zambian schools actually work
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              marginBottom: '2.5rem',
              maxWidth: 520,
            }}
          >
            Every feature exists because a real Zambian headteacher asked for it.
          </p>
          <div
            className="problems-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}
          >
            {problems.map((p, i) => {
              const Icon = p.icon
              return (
                <div key={i} className="problem-card" style={{ '--card-accent': p.accent }}>
                  <div
                    className="accent-line"
                    style={{
                      background: p.accent,
                    }}
                  />
                  <div
                    className="icon-wrap"
                    style={{ background: 'var(--rp-accentbg)', border: '1px solid var(--border)' }}
                  >
                    {Icon ? (
                      <Icon
                        size={24}
                        color="var(--color-accent)"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 10,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                    }}
                  >
                    {p.title}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {p.body}
                  </p>
                  <div
                    style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <div style={{ width: 20, height: 2, background: p.accent, borderRadius: 99 }} />
                    <span
                      style={{
                        fontSize: 11,
                        color: p.accent,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Solved
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <hr className="divider" />

      <AIFeatures registerUrl={registerUrl} />

      <hr className="divider" />

      <section id="features" style={{ padding: '3.5rem 1.5rem', background: 'var(--color-white)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label">Features built for the Zambian curriculum</div>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 700,
              marginBottom: '2rem',
              color: 'var(--text-primary)',
            }}
          >
            Attendance, grades, reporting, coordination
          </h2>
          <div
            className="features-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}
          >
            <div>
              {features.map((f, i) => (
                <div key={i} style={{ marginBottom: '1.75rem' }}>
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
                    }}
                  >
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card">
                <p style={{ fontSize: 12, color: 'var(--color-accent)', marginBottom: 10 }}>
                  Headteacher dashboard
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="pill">Attendance</span>
                  <span className="pill">Performance</span>
                  <span className="pill">HODs</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Attendance, performance, HODs — all on one screen.
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

      <hr className="divider" />

      <TimeSavings />

      <hr className="divider" />

      <Pricing />

      <hr className="divider" />

      {publicFeedback.length > 0 && (
        <section style={{ padding: '3.5rem 1.5rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="section-label">Recent feedback</div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                marginBottom: '2rem',
                color: 'var(--text-primary)',
              }}
            >
              School administrator feedback
            </h2>
            <div
              className="testimonials-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
            >
              {publicFeedback.map((f) => (
                <div key={f.id} className="card">
                  <div className="testimonial-bar">
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.75,
                        color: 'var(--text-secondary)',
                        marginBottom: 12,
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{f.message}&rdquo;
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatRoleLabel(f.role)}
                    </p>
                    {f.schoolName ? (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.schoolName}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!tenantSchool && (schoolSearch || schoolsDirectory.length > 0) && (
        <>
          <hr className="divider" />

          <section
            id="find-school"
            style={{ padding: '3.5rem 1.5rem', background: 'var(--surface-alt)' }}
          >
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div className="section-label">Find your school</div>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                }}
              >
                Already registered? Access your portal
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '1.5rem' }}>
                Search by school name or district to go directly to your school&apos;s login page.
              </p>
              <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by school name or location..."
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSearchSchools()
                    }
                  }}
                />
                <button
                  className="btn-primary"
                  style={{ whiteSpace: 'nowrap', padding: '12px 20px', fontSize: 13 }}
                  type="button"
                  onClick={handleSearchSchools}
                >
                  Search
                </button>
              </div>

              <div className="card">
                {isSchoolDirectoryLoading ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
                      Loading schools…
                    </p>
                  </div>
                ) : !schoolSearch && schoolsDirectory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
                      Search for your school to open the portal. If it is not listed, register your
                      school.
                    </p>
                    <Link
                      href="/register-school"
                      className="btn-primary"
                      style={{ fontSize: 13, padding: '10px 20px' }}
                    >
                      Register your school free →
                    </Link>
                  </div>
                ) : schoolSearch && schoolsDirectory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
                      School not found in the directory.
                    </p>
                    <Link
                      href="/register-school"
                      className="btn-primary"
                      style={{ fontSize: 13, padding: '10px 20px' }}
                    >
                      Register your school free →
                    </Link>
                  </div>
                ) : (
                  schoolsDirectory.map((s) => (
                    <div key={s.id} className="school-row">
                      <div>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: 3,
                          }}
                        >
                          {s.name}
                        </p>
                      </div>
                      <Link
                        href={`/go/${s.id}`}
                        className="btn-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open portal →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <hr className="divider" />

      <section style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div
            style={{
              color: '#FF3B00',
              border: '1px solid #FF3B00',
              display: 'inline-block',
              padding: '6px 12px',
              marginBottom: 18,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Ready to modernise your school?
          </div>
          <h2
            style={{
              fontSize: 30,
              fontWeight: 800,
              marginBottom: '1rem',
              color: '#111111',
            }}
          >
            Launch your school portal
            <br />
            <span style={{ color: '#111111' }}>Setup takes minutes</span>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              lineHeight: 1.75,
            }}
          >
            Join schools across Zambia already using ZSMS. Government, private, grant-aided, and
            community schools welcome.
          </p>
          <Link
            href={registerUrl}
            style={{
              display: 'inline-block',
              fontSize: 16,
              padding: '16px 36px',
              fontWeight: 800,
              textDecoration: 'none',
              background: '#111111',
              color: '#EFECE5',
              border: '2px solid #111111',
              boxShadow: '6px 6px 0 0 #FF3B00',
            }}
          >
            {tenantSchool ? 'Create account →' : 'Register your school free →'}
          </Link>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: '1.5rem' }}>
            Questions? Call or WhatsApp:{' '}
            <a
              href="tel:0977934996"
              style={{ color: '#FF3B00', fontWeight: 800, textDecoration: 'none' }}
            >
              0977934996
            </a>
            {' · '}
            <a
              href="https://wa.me/260977934996"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#FF3B00', fontWeight: 800, textDecoration: 'none' }}
            >
              WhatsApp
            </a>
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Free trial · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      <hr className="divider" />

      <footer
        style={{
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 22, display: 'flex', alignItems: 'center' }}>
            <SchoolLogo
              src={tenantSchool?.logo_url || '/Assets/logo.jpg'}
              alt={tenantSchool?.name || 'ZSMS'}
              className="h-5 w-auto object-contain"
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Bluepeack Technologies · Lusaka, Zambia
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link
            href="/privacy"
            style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            Terms
          </Link>
          {!tenantSchool && (
            <Link
              href={registerUrl}
              style={{
                fontSize: 12,
                color: '#FF3B00',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Register school
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}
