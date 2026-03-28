'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Settings, Shield, Save, Camera } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import ProfilePictureUpload from '@/components/ui/ProfilePictureUpload'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPicture, setSavingPicture] = useState(false)

  const role = String(user?.role || '').toLowerCase()

  const handleChangePassword = async () => {
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

  const tabs = [{ id: 'account', name: 'Account', icon: Shield }]

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
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
                <div className="text-sm text-gray-600">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleChangePassword}
                    disabled={
                      savingPassword || !currentPassword || !newPassword || !confirmPassword
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
