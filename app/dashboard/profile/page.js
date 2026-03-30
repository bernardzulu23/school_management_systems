'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import ProfilePictureDisplay from '@/components/ui/ProfilePictureDisplay'
import { useAuth } from '@/lib/auth'
import { User, KeyRound, Upload } from 'lucide-react'

const MAX_BYTES = 10 * 1024 * 1024

export default function ProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isAuthenticated])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (active) setMe(data?.user || null)
      } catch {}
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const details = useMemo(() => {
    const u = me || user
    if (!u) return []

    const role = String(u.role || '').toLowerCase()
    const teacher = u.teacherProfile || null
    const student = u.studentProfile || null
    const hod = u.hodProfile || null

    const rows = [
      { label: 'Name', value: u.name || 'N/A' },
      { label: 'Email', value: u.email || 'N/A' },
      { label: 'Role', value: role || 'N/A' },
      {
        label: 'Department',
        value:
          u.department ||
          hod?.departmentRef?.name ||
          hod?.department ||
          teacher?.department ||
          'N/A',
      },
      { label: 'Employee ID', value: u.employeeId || 'N/A' },
      { label: 'Contact Number', value: u.contact_number || 'N/A' },
    ]

    if (role === 'teacher' && teacher) {
      rows.push(
        { label: 'TS Number', value: teacher.ts_number || 'N/A' },
        { label: 'Specialization', value: teacher.specialization || 'N/A' },
        { label: 'Qualifications', value: teacher.qualifications || 'N/A' }
      )
    }

    if (role === 'student' && student) {
      rows.push(
        { label: 'Class', value: student.class || 'N/A' },
        { label: 'Exam Number', value: student.exam_number || 'N/A' }
      )
    }

    if (role === 'hod' && hod) {
      rows.push(
        { label: 'HOD Department', value: hod.departmentRef?.name || hod.department || 'N/A' },
        { label: 'Department ID', value: hod.departmentId || hod.departmentRef?.id || 'N/A' }
      )
    }

    return rows
  }, [me, user])

  const currentPicture = (me || user)?.profile_picture_url || user?.profile_picture_url || ''

  const uploadPicture = async (file) => {
    if (!file) return

    if (file.size > MAX_BYTES) {
      toast.error('Profile picture must be 10MB or less')
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/profile/picture', {
        method: 'PUT',
        body: fd,
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Upload failed')

      const nextUrl = data?.profile_picture_url
      if (nextUrl) {
        updateUser({ ...(user || {}), profile_picture_url: nextUrl })
        setMe((prev) => (prev ? { ...prev, profile_picture_url: nextUrl } : prev))
      }
      toast.success('Profile picture updated')
    } catch (e) {
      toast.error(e?.message || 'Failed to update profile picture')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Enter current password and new password')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Password update failed')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password updated')
    } catch (e) {
      toast.error(e?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Profile">
      <div className="space-y-6">
        <header className="bg-royalPurple-card border border-royalPurple-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-royalPurple-card2 border border-royalPurple-border rounded-xl p-3">
              <User className="h-6 w-6 text-royalPurple-text2" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1">My Profile</h1>
              <p className="text-royalPurple-text2 text-sm">
                View your details and manage your account
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-royalPurple-card border border-royalPurple-border rounded-2xl overflow-hidden">
            <CardHeader className="bg-royalPurple-card2 border-b border-royalPurple-border">
              <CardTitle className="text-royalPurple-text1">Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="bg-royalPurple-card p-6">
              <div className="flex items-center gap-4">
                <ProfilePictureDisplay
                  src={currentPicture}
                  alt={(me || user)?.name || 'Profile picture'}
                  name={(me || user)?.name || ''}
                  role={String((me || user)?.role || 'student').toLowerCase()}
                  size="large"
                />
                <div className="flex-1">
                  <div className="text-sm text-royalPurple-text2 mb-2">
                    Max size: 10MB (JPG/PNG/WEBP)
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={loading}
                      onChange={(e) => uploadPicture(e.target.files?.[0])}
                    />
                    <span className="inline-flex items-center gap-2 bg-royalPurple-accent text-royalPurple-deep font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                      <Upload className="h-4 w-4" />
                      Upload New
                    </span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-royalPurple-card border border-royalPurple-border rounded-2xl overflow-hidden lg:col-span-2">
            <CardHeader className="bg-royalPurple-card2 border-b border-royalPurple-border">
              <CardTitle className="text-royalPurple-text1">User Details</CardTitle>
            </CardHeader>
            <CardContent className="bg-royalPurple-card p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.map((row) => (
                  <div
                    key={row.label}
                    className="bg-royalPurple-card2 border border-royalPurple-border rounded-xl p-4"
                  >
                    <div className="text-xs text-royalPurple-text3">{row.label}</div>
                    <div className="text-royalPurple-text1 font-semibold mt-1 break-words">
                      {String(row.value || 'N/A')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-royalPurple-card border border-royalPurple-border rounded-2xl overflow-hidden">
          <CardHeader className="bg-royalPurple-card2 border-b border-royalPurple-border">
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-royalPurple-text2" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-royalPurple-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  className="input"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="input"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  className="input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={changePassword}
                disabled={loading}
                className="bg-royalPurple-accent text-royalPurple-deep font-semibold hover:opacity-90 transition-opacity"
              >
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
