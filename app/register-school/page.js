'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function RegisterSchoolPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    schoolName: '',
    subdomain: '',
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

  const portalUrlPreview = useMemo(() => {
    const s = normalizeSubdomain(form.subdomain)
    return s ? `${s}.bluepeacktechnologies.com` : 'your-school.bluepeacktechnologies.com'
  }, [form.subdomain])

  const checkSubdomain = async (slug) => {
    const s = normalizeSubdomain(slug)
    if (!s || s.length < 3) {
      setSubdomainAvailable(null)
      return
    }
    try {
      const res = await fetch(`/api/schools/check-subdomain?subdomain=${encodeURIComponent(s)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      setSubdomainAvailable(Boolean(data?.available))
    } catch {
      setSubdomainAvailable(null)
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
      const loginUrl = String(data?.loginUrl || '')
      if (loginUrl) {
        window.location.href = loginUrl
        return
      }
      router.push('/login?welcome=true')
    } catch {
      setError('Registration failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-royalPurple-page flex items-center justify-center p-4">
      <div className="bg-royalPurple-card rounded-2xl p-8 w-full max-w-lg border border-royalPurple-border/40">
        <h1 className="text-2xl font-bold text-royalPurple-text1 mb-2">Register Your School</h1>
        <p className="text-royalPurple-text2 mb-6">Create your school portal and admin account</p>

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
            {subdomainAvailable === true && (
              <p className="text-royalPurple-successTx text-xs mt-1">Available</p>
            )}
            {subdomainAvailable === false && (
              <p className="text-royalPurple-dangerTx text-xs mt-1">Already taken</p>
            )}
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
                onChange={(e) => setForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="text-royalPurple-text2 text-sm">Phone</label>
              <input
                className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 mt-1"
                placeholder="+260..."
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
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

          {error && <p className="text-royalPurple-dangerTx text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || subdomainAvailable === false}
            className="w-full bg-royalPurple-accent text-black font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating your portal...' : 'Create School Portal'}
          </button>
        </form>

        <p className="text-royalPurple-text2 text-xs text-center mt-4">
          Your login will open at {portalUrlPreview}
        </p>
      </div>
    </div>
  )
}
