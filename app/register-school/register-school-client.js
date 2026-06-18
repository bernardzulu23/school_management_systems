'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { ProvinceDistrictFields } from '@/components/onboarding/ProvinceDistrictFields'
import { evaluatePassword } from '@/lib/security/passwordValidate'

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
  const [showAdminPassword, setShowAdminPassword] = useState(false)
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
    district: '',
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
  const strengthClass = useMemo(() => {
    if (passwordStrength <= 0) return 'kpi-zero'
    if (passwordStrength <= 2) return 'kpi-fail'
    if (passwordStrength === 3) return 'kpi-warn'
    return 'kpi-pass'
  }, [passwordStrength])

  const getPasswordStrength = (pwd) => {
    const { requirements } = evaluatePassword(pwd)
    return Object.values(requirements).filter(Boolean).length
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
      if (!form.province.trim() || !form.district.trim()) {
        setError('Province and district are required')
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
    <div className="form-page flex items-center justify-center p-4">
      <div className="form-card rounded-2xl p-8 w-full max-w-lg border border-royalPurple-border/40">
        <h1 className="text-2xl font-bold dash-text mb-2">Register Your School</h1>
        <p className="dash-subtext mb-6">Create your school portal and admin account</p>

        {success === 'check-email' ? (
          <div className="border border-royalPurple-border bg-royalPurple-deep rounded-lg p-4 mb-6">
            <p className="dash-text font-semibold">Check your email to activate your portal.</p>
            <p className="dash-subtext text-sm mt-1">
              We sent an activation link to the admin email address. Your portal will go live after
              verification.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">School Name</label>
            <input
              className="form-input mt-1"
              placeholder="Nyimba East Day Secondary School"
              value={form.schoolName}
              onChange={handleSchoolNameChange}
              required
            />
          </div>

          <div>
            <label className="form-label">Your Portal URL</label>
            <div className="flex items-center mt-1 form-input">
              <input
                className="bg-transparent dash-text font-mono flex-1 outline-none"
                value={form.subdomain}
                onChange={handleSubdomainChange}
                required
              />
              <span className="dash-subtext text-sm whitespace-nowrap">
                .bluepeacktechnologies.com
              </span>
            </div>
            <p className="text-xs dash-subtext mt-1">{portalUrlPreview}</p>
            {subdomainAvailable === true ? (
              <p className="status-active text-xs mt-1">Available</p>
            ) : null}
            {subdomainAvailable === false ? (
              <p className="text-royalPurple-dangerTx text-xs mt-1">
                {subdomainError || 'Unavailable'}
              </p>
            ) : null}
          </div>

          <div>
            <label className="form-label">School Level</label>
            <select
              className="zsms-select mt-1"
              value={form.level}
              onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
              required
            >
              <option value="primary">Primary School (ECE – Grade 7)</option>
              <option value="secondary">Secondary School Only (Grades 8-12)</option>
              <option value="combined">Combined Primary & Secondary</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="form-label">Admin Full Name</label>
              <input
                className="form-input mt-1"
                placeholder="Headteacher Full Name"
                value={form.adminName}
                onChange={(e) => setForm((prev) => ({ ...prev, adminName: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Admin Email</label>
              <input
                className="form-input mt-1"
                type="email"
                placeholder="admin@school.com"
                value={form.adminEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Password</label>
              <div className="relative mt-1">
                <input
                  className="form-input pr-10"
                  type={showAdminPassword ? 'text' : 'password'}
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
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 dash-subtext hover:dash-text transition-colors"
                  aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                >
                  {showAdminPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-2">
                <div className="progress-track overflow-hidden">
                  <div
                    className={`progress-fill progress-fill-semantic ${strengthClass}`}
                    style={{
                      width: `${(passwordStrength / 5) * 100}%`,
                    }}
                  />
                </div>
                <p className={`text-xs mt-1 ${strengthClass}`}>{passwordStrengthLabel}</p>
              </div>
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                className="form-input mt-1"
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
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <ProvinceDistrictFields
                province={form.province}
                district={form.district}
                onProvinceChange={(v) =>
                  setForm((prev) => ({ ...prev, province: v, district: '' }))
                }
                onDistrictChange={(v) => setForm((prev) => ({ ...prev, district: v }))}
                provinceClassName="zsms-select mt-1 w-full"
                districtClassName="zsms-select mt-1 w-full"
                labelClassName="form-label"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Address</label>
              <input
                className="form-input mt-1"
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
              !evaluatePassword(form.adminPassword).isValid ||
              !form.province.trim() ||
              !form.district.trim()
            }
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {loading ? 'Creating your portal...' : 'Create School Portal'}
          </button>
        </form>

        <p className="dash-subtext text-xs text-center mt-4">Portal URL: {portalUrlPreview}</p>
      </div>
    </div>
  )
}
