'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { SchoolLogo } from '@/components/SchoolLogo'

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

  const getPortalUrl = useMemo(() => {
    if (typeof window === 'undefined')
      return (subdomain) => `https://${subdomain}.bluepeacktechnologies.com/login`
    const host = String(window.location.hostname || '')
      .split(':')[0]
      .toLowerCase()
    const parts = host.split('.').filter(Boolean)
    const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : 'bluepeacktechnologies.com'
    return (subdomain) => `https://${subdomain}.${baseDomain}/login`
  }, [])

  const problems = useMemo(
    () => [
      {
        icon: '📋',
        color: '#3b0a0a',
        title: 'Paper registers getting lost',
        body: 'Digital attendance records that cannot be destroyed, lost, or altered. Ministry inspectors can verify anytime.',
      },
      {
        icon: '📊',
        color: '#2d1f0a',
        title: 'No visibility on student performance',
        body: 'Spot students at risk of failing before it is too late. Track marks across all subjects in real-time.',
      },
      {
        icon: '👩‍🏫',
        color: '#0f2318',
        title: 'Headteacher reporting burden',
        body: 'Generate MOE-ready reports in one click. No more compiling data from each teacher manually before district visits.',
      },
      {
        icon: '🏫',
        color: '#0c1e33',
        title: 'HOD coordination challenges',
        body: 'Department heads manage their subjects, teachers, and performance from a dedicated dashboard — no WhatsApp groups needed.',
      },
      {
        icon: '👧',
        color: '#3b0a0a',
        title: "Girls' dropout tracking",
        body: 'Identify female students with declining attendance early. Especially critical for rural schools where girls face higher dropout risk.',
      },
      {
        icon: '📱',
        color: '#1e1033',
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

  const testimonials = useMemo(
    () => [
      {
        quote:
          'Before ZSMS, we were compiling attendance from many teachers every week manually. Now it takes minutes.',
        name: 'Headteacher, Ndake Day Secondary School',
        location: 'Eastern Province',
      },
      {
        quote:
          'The HOD dashboard helped us identify girls whose attendance was dropping. We intervened early and they stayed in school.',
        name: 'Head of Department, Sciences',
        location: 'Lusaka Province',
      },
    ],
    []
  )

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
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-deep">
        <LoadingSpinner size="xl" color="white" label="Loading" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-deep">
        <LoadingSpinner size="xl" color="white" label="Redirecting" />
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#170d28',
        minHeight: '100vh',
        color: '#ede9fe',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
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
          background: #f59e0b; color: #170d28; border: none;
          padding: 14px 28px; border-radius: 10px; font-size: 15px;
          font-weight: 700; cursor: pointer; text-decoration: none;
          display: inline-block; transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.01em;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-secondary {
          background: transparent; color: #ede9fe;
          border: 1px solid #3b2a66; padding: 13px 28px;
          border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; text-decoration: none; display: inline-block;
          transition: background 0.2s, border-color 0.2s;
        }
        .btn-secondary:hover { background: #2d1f4e; border-color: #6d28d9; }
        .btn-sm {
          padding: 8px 18px; font-size: 13px; border-radius: 8px;
          border: 1px solid #3b2a66; background: transparent;
          color: #a78bfa; cursor: pointer; text-decoration: none;
          display: inline-block; transition: background 0.2s;
        }
        .btn-sm:hover { background: #2d1f4e; }
        .card {
          background: #2d1f4e; border: 1px solid #3b2a66;
          border-radius: 14px; padding: 1.5rem;
        }
        .problem-card {
          border-radius: 14px; padding: 1.25rem;
          border: 1px solid #3b2a66; transition: border-color 0.2s, transform 0.2s;
        }
        .problem-card:hover { border-color: #7c3aed; transform: translateY(-2px); }
        .section-label {
          font-size: 11px; color: #6d28d9; text-transform: uppercase;
          letter-spacing: 0.12em; font-weight: 700; margin-bottom: 0.75rem;
        }
        .divider { border: none; border-top: 1px solid #3b2a66; margin: 0; }
        .stat-card {
          background: #261843; border: 1px solid #3b2a66;
          border-radius: 12px; padding: 1.25rem; text-align: center;
        }
        .tag {
          display: inline-block; font-size: 11px; padding: 4px 12px;
          border-radius: 99px; border: 1px solid #3b2a66;
          color: #a78bfa; margin: 3px; background: #261843;
        }
        .search-input {
          flex: 1; padding: 12px 16px;
          border: 1px solid #3b2a66; border-radius: 10px;
          background: #261843; color: #ede9fe; font-size: 14px;
          outline: none; transition: border-color 0.2s;
        }
        .search-input:focus { border-color: #7c3aed; }
        .search-input::placeholder { color: #6d28d9; }
        .school-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 0; border-bottom: 1px solid #3b2a66;
        }
        .school-row:last-child { border-bottom: none; }
        .testimonial-bar { border-left: 3px solid #f59e0b; padding-left: 1.25rem; }
        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: #261843; border: 1px solid #3b2a66;
          border-radius: 99px; padding: 6px 14px; font-size: 13px;
          color: #a78bfa; margin: 3px;
        }
        .alert-box {
          background: #3b0a0a; border: 1px solid #7f1d1d;
          border-radius: 10px; padding: 10px 14px; font-size: 13px;
          color: #fca5a5;
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
          borderBottom: '1px solid #3b2a66',
          position: 'sticky',
          top: 0,
          background: '#170d28',
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
          <span style={{ fontWeight: 700, fontSize: 16, color: '#ede9fe' }}>
            {tenantSchool?.name || 'ZSMS'}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 99,
              background: '#0f2318',
              color: '#86efac',
              border: '1px solid #166534',
              fontWeight: 600,
            }}
          >
            Zambian-built
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!tenantSchool && (
            <Link href="#find-school" className="btn-sm">
              Find my school
            </Link>
          )}
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
          padding: '4rem 1.5rem 3rem',
          textAlign: 'center',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        <div className="fade-up fade-up-1" style={{ marginBottom: '1.25rem' }}>
          <span className="tag">Secondary schools</span>
          <span className="tag">Government schools</span>
          <span className="tag">Grant-aided schools</span>
          <span className="tag">Private schools</span>
          <span className="tag">Community schools</span>
        </div>

        <div
          className="fade-up fade-up-1"
          style={{
            background: '#261843',
            border: '1px solid #7c3aed',
            borderRadius: 10,
            padding: '10px 20px',
            display: 'inline-block',
            marginBottom: '1.5rem',
            fontSize: 13,
            color: '#a78bfa',
          }}
        >
          For Headteachers &amp; School Administrators across Zambia — manage your entire school
          from one place, online.
        </div>

        <h1
          className="fade-up fade-up-2"
          style={{
            fontSize: 'clamp(28px, 5vw, 46px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.25rem',
            color: '#ede9fe',
          }}
        >
          The school management system
          <br />
          <span style={{ color: '#f59e0b' }}>built for Zambia</span>
        </h1>

        <p
          className="fade-up fade-up-2"
          style={{
            fontSize: 17,
            color: '#a78bfa',
            maxWidth: 560,
            margin: '0 auto 2rem',
            lineHeight: 1.75,
          }}
        >
          Track attendance, manage ECZ results, coordinate teachers — all through your school&apos;s
          own portal. No more paper registers. No more lost records.
        </p>

        <div
          className="fade-up fade-up-3 hero-buttons"
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '3rem',
          }}
        >
          <Link href={registerUrl} className="btn-primary">
            {tenantSchool ? 'Create an account →' : 'Register your school free →'}
          </Link>
          <Link href="#features" className="btn-secondary">
            See all features
          </Link>
        </div>

        <div
          className="fade-up fade-up-4 stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(1, 1fr)',
            gap: 12,
            maxWidth: 240,
            margin: '0 auto',
          }}
        >
          <div className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ede9fe' }}>K300</div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '3.5rem 1.5rem', background: '#1e1033' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label">The real problems ZSMS solves</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: '2rem', color: '#ede9fe' }}>
            Built around how Zambian schools actually work
          </h2>
          <div
            className="problems-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}
          >
            {problems.map((p, i) => (
              <div key={i} className="problem-card" style={{ background: p.color }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{p.icon}</div>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#ede9fe' }}>
                  {p.title}
                </p>
                <p style={{ fontSize: 13, color: '#a78bfa', lineHeight: 1.65 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section id="features" style={{ padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label">Features built for the Zambian curriculum</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: '2rem', color: '#ede9fe' }}>
            Everything your school needs, nothing it doesn&apos;t
          </h2>
          <div
            className="features-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}
          >
            <div>
              {features.map((f, i) => (
                <div key={i} style={{ marginBottom: '1.75rem' }}>
                  <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#ede9fe' }}>
                    <span style={{ color: '#f59e0b', marginRight: 8 }}>✓</span>
                    {f.title}
                  </p>
                  <p style={{ fontSize: 13, color: '#a78bfa', lineHeight: 1.65, paddingLeft: 22 }}>
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card">
                <p style={{ fontSize: 12, color: '#6d28d9', marginBottom: 10 }}>
                  Headteacher dashboard
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="pill">Attendance</span>
                  <span className="pill">Performance</span>
                  <span className="pill">HODs</span>
                </div>
                <p style={{ fontSize: 12, color: '#6d28d9' }}>
                  Attendance, performance, HODs — all on one screen.
                </p>
              </div>
              <div className="card">
                <p style={{ fontSize: 12, color: '#6d28d9', marginBottom: 6 }}>
                  Works on MTN, Airtel &amp; Zamtel networks
                </p>
                <p style={{ fontSize: 13, color: '#a78bfa', lineHeight: 1.65 }}>
                  Designed for Zambian internet speeds. No data-heavy downloads required. Works
                  offline too.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '3.5rem 1.5rem', background: '#1e1033' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-label">Simple pricing in Zambian Kwacha</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: '0.5rem', color: '#ede9fe' }}>
            One plan. Everything included.
          </h2>
          <p style={{ color: '#a78bfa', fontSize: 14, marginBottom: '2.5rem' }}>
            Pay via Airtel Money, MTN Mobile Money, or bank transfer. No international card needed.
          </p>

          <div
            style={{
              background: '#2d1f4e',
              border: '2px solid #f59e0b',
              borderRadius: 18,
              padding: '2.5rem 2rem',
              position: 'relative',
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                K300
              </span>
            </div>

            <Link
              href={registerUrl}
              className="btn-primary"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: 15,
                padding: '15px 24px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              Get started →
            </Link>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label">What Zambian educators are saying</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: '2rem', color: '#ede9fe' }}>
            Trusted by schools across the Eastern Province
          </h2>
          <div
            className="testimonials-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
          >
            {testimonials.map((t, i) => (
              <div key={i} className="card">
                <div className="testimonial-bar">
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.75,
                      color: '#a78bfa',
                      marginBottom: 12,
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#ede9fe' }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#6d28d9' }}>{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!tenantSchool && (
        <>
          <hr className="divider" />

          <section id="find-school" style={{ padding: '3.5rem 1.5rem', background: '#1e1033' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div className="section-label">Find your school</div>
              <h2
                style={{ fontSize: 26, fontWeight: 700, marginBottom: '0.5rem', color: '#ede9fe' }}
              >
                Already registered? Access your portal
              </h2>
              <p style={{ color: '#a78bfa', fontSize: 14, marginBottom: '1.5rem' }}>
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
                    <p style={{ color: '#a78bfa', fontSize: 14, marginBottom: 8 }}>
                      Loading schools…
                    </p>
                  </div>
                ) : schoolSearch && schoolsDirectory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <p style={{ color: '#a78bfa', fontSize: 14, marginBottom: 8 }}>
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
                  schoolsDirectory.map((s, i) => (
                    <div key={i} className="school-row">
                      <div>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#ede9fe',
                            marginBottom: 3,
                          }}
                        >
                          {s.name}
                        </p>
                        {s.address ? (
                          <p style={{ fontSize: 12, color: '#6d28d9' }}>{s.address}</p>
                        ) : null}
                      </div>
                      <a
                        href={getPortalUrl(s.subdomain)}
                        className="btn-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open portal →
                      </a>
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
          <div className="section-label">Ready to modernise your school?</div>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: '1rem', color: '#ede9fe' }}>
            Your school&apos;s portal is ready
            <br />
            <span style={{ color: '#f59e0b' }}>in minutes</span>
          </h2>
          <p style={{ fontSize: 16, color: '#a78bfa', marginBottom: '2rem', lineHeight: 1.75 }}>
            Join schools across Zambia already using ZSMS. Government, private, grant-aided, and
            community schools welcome.
          </p>
          <Link
            href={registerUrl}
            className="btn-primary"
            style={{ fontSize: 16, padding: '16px 36px' }}
          >
            {tenantSchool ? 'Create account →' : 'Register your school free →'}
          </Link>
          <p style={{ fontSize: 13, color: '#6d28d9', marginTop: '1.5rem' }}>
            Questions? Call or WhatsApp:{' '}
            <a
              href="tel:0977934996"
              style={{ color: '#a78bfa', fontWeight: 800, textDecoration: 'none' }}
            >
              0977934996
            </a>
            {' · '}
            <a
              href="https://wa.me/260977934996"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#a78bfa', fontWeight: 800, textDecoration: 'none' }}
            >
              WhatsApp
            </a>
          </p>
          <p style={{ fontSize: 12, color: '#3b2a66', marginTop: '0.5rem' }}>
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
          <p style={{ fontSize: 12, color: '#6d28d9' }}>
            © Bluepeack Technologies · Lusaka, Zambia
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/privacy" style={{ fontSize: 12, color: '#6d28d9', textDecoration: 'none' }}>
            Privacy
          </Link>
          <Link href="/terms" style={{ fontSize: 12, color: '#6d28d9', textDecoration: 'none' }}>
            Terms
          </Link>
          {!tenantSchool && (
            <Link
              href={registerUrl}
              style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}
            >
              Register school
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}
