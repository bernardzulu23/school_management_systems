'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Settings, Shield, Save, Camera, Eye, EyeOff, Info, Bell } from 'lucide-react'
import { AppVersionLabel } from '@/components/dashboard/AppVersionLabel'
import { useAuth } from '@/lib/auth'
import ProfilePictureUpload from '@/components/ui/ProfilePictureUpload'
import { getPasswordFormError } from '@/lib/security/passwordValidate'
import PasswordRequirements from '@/components/ui/PasswordRequirements'
import { evaluatePassword } from '@/lib/security/passwordValidate'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPicture, setSavingPicture] = useState(false)

  const role = String(user?.role || '').toLowerCase()

  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get('tab')
      if (tab === 'notifications' || tab === 'account' || tab === 'about') {
        setActiveTab(tab)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const handleChangePassword = async () => {
    const passwordError = getPasswordFormError(newPassword)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update password')
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      toast.error(e.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleUploadPicture = async (file) => {
    setSavingPicture(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/account/profile-picture', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to upload profile picture')
      if (json?.user) updateUser(json.user)
      toast.success('Profile picture updated')
    } catch (e) {
      toast.error(e.message || 'Failed to upload profile picture')
    } finally {
      setSavingPicture(false)
    }
  }

  const tabs = [
    { id: 'account', name: 'Account', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'about', name: 'About', icon: Info },
  ]

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-royalPurple-text2" />
          <h1 className="text-2xl font-bold text-royalPurple-text1">Settings</h1>
        </div>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={activeTab === t.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(t.id)}
            >
              <t.icon className="h-4 w-4 mr-2" />
              {t.name}
            </Button>
          ))}
        </div>

        {activeTab === 'notifications' && <NotificationPreferences />}

        {activeTab === 'about' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                About this system
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AppVersionLabel />
              <p className="text-sm text-royalPurple-text2 mt-4">
                You are running the release shown above. After an upgrade, refresh the page if the
                version does not update.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProfilePictureUpload
                  currentImage={user?.profile_picture_url || null}
                  role={role || 'teacher'}
                  disabled={savingPicture}
                  onImageSelect={handleUploadPicture}
                  onImageRemove={async () => {
                    toast.error('Remove not supported yet')
                  }}
                />
                <div className="text-sm text-royalPurple-text2">
                  Assigned classes and subjects are managed by Admin and cannot be changed here.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-2 border border-royalPurple-border rounded-md pr-10 focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2 border border-royalPurple-border rounded-md pr-10 focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <PasswordRequirements password={newPassword} />
                  <div>
                    <label className="block text-sm font-medium text-royalPurple-text2 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2 border border-royalPurple-border rounded-md pr-10 focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleChangePassword}
                    disabled={
                      savingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      !evaluatePassword(newPassword).isValid
                    }
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
