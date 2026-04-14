'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function normalizeSubdomain(input) {
  const raw = String(input || '')
    .trim()
    .toLowerCase()
  const cleaned = raw.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
  const trimmed = cleaned.replace(/^-+/, '').replace(/-+$/, '')
  return trimmed.slice(0, 40)
}

function slugFromSchoolName(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  const cleaned = raw
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return normalizeSubdomain(cleaned)
}

export default function RegisterSchoolClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const RESERVED = useMemo(
    () =>
      new Set([
        'www',
        'admin',
        'api',
        'login',
        'register',
        'dashboard',
        'billing',
        'support',
        'help',
        'demo',
        'test',
        'staging',
        'register-school',
        'superadmin',
        'root',
        'system',
        'null',
        'undefined',
        'mail',
        'smtp',
        'ftp',
        'ssh',
        'vpn',
        'dev',
        'bluepeack',
        'bluepeacktechnologies',
        'zsms',
        'zms',
      ]),
    []
  )
  const [form, setForm] = useState({
    schoolName: '',
    subdomain: '',
    level: 'combined',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    phone: '',
    address: '',
    province: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState(null)
  const [subdomainError, setSubdomainError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordStrengthLabel, setPasswordStrengthLabel] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const strengthLabel = useMemo(
    () => ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'],
    []
  )
  const strengthColor = useMemo(
    () => ['', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#16a34a'],
    []
  )

  const getPasswordStrength = (pwd) => {
    const p = String(pwd || '')
    let score = 0
    if (p.length >= 8) score++
    if (p.length >= 12) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
  }

  const validateZambianPhone = (phone) => {
    const cleaned = String(phone || '').replace(/\s/g, '')
    if (!cleaned) return true
    const zambianRegex = /^(\+260|0)(9[567]\d{7})$/
    return zambianRegex.test(cleaned)
  }

  const portalUrlPreview = useMemo(() => {
    const s = normalizeSubdomain(form.subdomain)
    return s ? `${s}.bluepeacktechnologies.com` : 'your-school.bluepeacktechnologies.com'
  }, [form.subdomain])

  const checkSubdomain = async (slug) => {
    const s = normalizeSubdomain(slug)
    if (!s || s.length < 3) {
      setSubdomainAvailable(null)
      setSubdomainError(s ? 'Too short — minimum 3 characters' : '')
      return
    }
    if (RESERVED.has(s)) {
      setSubdomainAvailable(false)
      setSubdomainError('This name is reserved')
      return
    }
    if (!/^[a-z0-9-]{3,40}$/.test(s)) {
      setSubdomainAvailable(false)
      setSubdomainError('Only lowercase letters, numbers and hyphens allowed')
      return
    }
    try {
      const res = await fetch(`/api/schools/check-subdomain?subdomain=${encodeURIComponent(s)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      setSubdomainAvailable(Boolean(data?.available))
      setSubdomainError(!data?.available ? String(data?.reason || 'Unavailable') : '')
    } catch {
      setSubdomainAvailable(null)
      setSubdomainError('')
    }
  }

  const handleSchoolNameChange = async (e) => {
    const name = e.target.value
    const subdomain = slugFromSchoolName(name)
    setForm((prev) => ({ ...prev, schoolName: name, subdomain }))
    await checkSubdomain(subdomain)
  }

  const handleSubdomainChange = async (e) => {
    const subdomain = normalizeSubdomain(e.target.value)
    setForm((prev) => ({ ...prev, subdomain }))
    await checkSubdomain(subdomain)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const s = normalizeSubdomain(form.subdomain)
      if (!s || s.length < 3) {
        setError('Subdomain must be at least 3 characters')
        setLoading(false)
        return
      }
      if (RESERVED.has(s)) {
        setError('Subdomain is reserved')
        setLoading(false)
        return
      }
      if (!validateZambianPhone(form.phone)) {
        setError('Invalid Zambian phone number')
        setLoading(false)
        return
      }
      const pwdScore = getPasswordStrength(form.adminPassword)
      if (pwdScore < 3) {
        setError('Password is too weak (use uppercase, lowercase, number)')
        setLoading(false)
        return
      }

      const res = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setError(String(data?.error || 'Registration failed'))
        setLoading(false)
        return
      }
      setLoading(false)
      router.push('/register-school?success=check-email')
    } catch {
      setError('Registration failed')
      setLoading(false)
    }
  }

  const success = searchParams?.get('success')

  return (
    <div className="min-h-screen bg-royalPurple-page flex items-center justify-center p-4">
      <div className="bg-royalPurple-card rounded-2xl p-8 w-full max-w-lg border border-royalPurple-border/40">
        <h1 className="text-2xl font-bold text-royalPurple-text1 mb-2">Register Your School</h1>
        <p className="text-royalPurple-text2 mb-6">Create your school portal and admin account</p>

        {success === 'check-email' ? (
          <div className="border border-royalPurple-border bg-royalPurple-deep rounded-lg p-4 mb-6">
            <p className="text-royalPurple-text1 font-semibold">
              Check your email to activate your portal.
            </p>
            <p className="text-royalPurple-text2 text-sm mt-1">
              We sent an activation link to the admin email address. Your portal will go live after
              verification.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-royalPurple-text2 text-sm">School Name</label>
            <input
              className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
              placeholder="Nyimba East Day Secondary School"
              value={form.schoolName}
              onChange={handleSchoolNameChange}
              required
            />
          </div>

          <div>
            <label className="text-royalPurple-text2 text-sm">Your Portal URL</label>
            <div className="flex items-center mt-1 bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3">
              <input
                className="bg-transparent text-royalPurple-accent font-mono flex-1 outline-none"
                value={form.subdomain}
                onChange={handleSubdomainChange}
                required
              />
              <span className="text-royalPurple-text2 text-sm whitespace-nowrap">
                .bluepeacktechnologies.com
              </span>
            </div>
            <p className="text-xs text-royalPurple-text3 mt-1">{portalUrlPreview}</p>
            {subdomainAvailable === true ? (
              <p className="text-royalPurple-successTx text-xs mt-1">Available</p>
            ) : null}
            {subdomainAvailable === false ? (
              <p className="text-royalPurple-dangerTx text-xs mt-1">
                {subdomainError || 'Unavailable'}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-royalPurple-text2 text-sm">School Level</label>
            <select
              className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
              value={form.level}
              onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
              required
            >
              <option value="primary">Primary School Only (Grades 1-7)</option>
              <option value="secondary">Secondary School Only (Grades 8-12)</option>
              <option value="combined">Combined Primary & Secondary</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-royalPurple-text2 text-sm">Admin Full Name</label>
              <input
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
                placeholder="Headteacher Full Name"
                value={form.adminName}
                onChange={(e) => setForm((prev) => ({ ...prev, adminName: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-royalPurple-text2 text-sm">Admin Email</label>
              <input
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
                type="email"
                placeholder="admin@school.com"
                value={form.adminEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-royalPurple-text2 text-sm">Password</label>
              <input
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
                type="password"
                placeholder="Password (min 8 characters)"
                value={form.adminPassword}
                onChange={(e) => {
                  const v = e.target.value
                  const score = getPasswordStrength(v)
                  setPasswordStrength(score)
                  setPasswordStrengthLabel(strengthLabel[score])
                  setForm((prev) => ({ ...prev, adminPassword: v }))
                }}
                minLength={8}
                required
              />
              <div className="mt-2">
                <div className="w-full h-2 bg-royalPurple-border rounded-full overflow-hidden">
                  <div
                    className="h-2"
                    style={{
                      width: `${(passwordStrength / 5) * 100}%`,
                      background: strengthColor[passwordStrength],
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: strengthColor[passwordStrength] }}>
                  {passwordStrengthLabel}
                </p>
              </div>
            </div>
            <div>
              <label className="text-royalPurple-text2 text-sm">Phone</label>
              <input
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
                placeholder="+260..."
                value={form.phone}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((prev) => ({ ...prev, phone: v }))
                  setPhoneError(validateZambianPhone(v) ? '' : 'Invalid Zambian number')
                }}
              />
              {phoneError ? (
                <p className="text-royalPurple-dangerTx text-xs mt-1">{phoneError}</p>
              ) : null}
            </div>
            <div>
              <label className="text-royalPurple-text2 text-sm">Province</label>
              <input
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
                placeholder="Eastern"
                value={form.province}
                onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-royalPurple-text2 text-sm">Address</label>
              <input
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
                placeholder="Town, District"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>

          {error ? <p className="text-royalPurple-dangerTx text-sm">{error}</p> : null}

          <button
            type="submit"
            disabled={
              loading ||
              subdomainAvailable === false ||
              Boolean(subdomainError) ||
              Boolean(phoneError) ||
              passwordStrength < 3
            }
            className="w-full bg-royalPurple-accent text-black font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating your portal...' : 'Create School Portal'}
          </button>
        </form>

        <p className="text-royalPurple-text2 text-xs text-center mt-4">
          Portal URL: {portalUrlPreview}
        </p>
      </div>
    </div>
  )
}
