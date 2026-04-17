'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function SchoolRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  const [formData, setFormData] = useState({
    // School Info
    name: '',
    subdomain: '',
    domain: '',
    email: '',
    phone: '',
    address: '',
    timezone: 'Africa/Lusaka',
    currency: 'ZMW',
    academicYear: '',

    // Admin Info
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create school')
      }

      setSuccess(
        `School created successfully! URL: https://${data.school.subdomain}.bluepeacktechnologies.com`
      )

      // Reset form
      setFormData({
        name: '',
        subdomain: '',
        domain: '',
        email: '',
        phone: '',
        address: '',
        timezone: 'Africa/Lusaka',
        currency: 'ZMW',
        academicYear: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Auto-generate subdomain from school name
    if (name === 'name') {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setFormData((prev) => ({ ...prev, subdomain }))
    }
  }

  return (
    <div className="min-h-screen bg-royalPurple-page py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-royalPurple-card shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-royalPurple-text1 mb-2">Register New School</h1>
          <p className="text-royalPurple-text2 mb-8">
            Create a new school instance with admin account
          </p>

          {error && (
            <div className="mb-6 p-4 bg-royalPurple-danger border border-royalPurple-border rounded-md">
              <p className="text-royalPurple-dangerTx">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-royalPurple-success border border-royalPurple-border rounded-md">
              <p className="text-royalPurple-successTx">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* School Information */}
            <div>
              <h2 className="text-xl font-semibold text-royalPurple-text1 mb-4">
                School Information
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Zambian High School"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Subdomain *
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleChange}
                      required
                      pattern="[a-z0-9-]+"
                      className="flex-1 px-4 py-2 border border-royalPurple-border rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="zambian-high-school"
                    />
                    <span className="px-4 py-2 bg-royalPurple-card2 border border-l-0 border-royalPurple-border rounded-r-md text-royalPurple-text2">
                      .bluepeacktechnologies.com
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-royalPurple-text3">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Custom Domain (Optional)
                  </label>
                  <input
                    type="text"
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., school.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    School Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="info@school.edu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+260 xxx xxx xxx"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Africa/Lusaka">Africa/Lusaka</option>
                    <option value="Africa/Nairobi">Africa/Nairobi</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                    <option value="Africa/Lagos">Africa/Lagos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ZMW">ZMW (Zambian Kwacha)</option>
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="ZAR">ZAR (South African Rand)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 2024/2025"
                  />
                </div>
              </div>
            </div>

            {/* Admin Account */}
            <div className="border-t pt-8">
              <h2 className="text-xl font-semibold text-royalPurple-text1 mb-4">
                Administrator Account
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Admin Name *
                  </label>
                  <input
                    type="text"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full Name"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Admin Email *
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@school.edu"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                    Admin Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      name="adminPassword"
                      value={formData.adminPassword}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="w-full px-4 py-2 border border-royalPurple-border rounded-md pr-10 focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
                      aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-royalPurple-accent text-royalPurple-text1 py-3 px-6 rounded-md font-medium hover:bg-royalPurple-accent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-royalPurple-card2 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating School...' : 'Create School'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
