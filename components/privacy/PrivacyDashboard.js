'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  Shield, Eye, Cookie, Mail, Share2, Download, Trash2, 
  FileText, Lock, AlertTriangle, CheckCircle, Settings,
  User, Clock, Database, Key, Bell, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PrivacyDashboard() {
  const { user } = useAuth()
  const [privacySettings, setPrivacySettings] = useState({
    allow_marketing_emails: false,
    allow_analytics_tracking: true,
    allow_performance_cookies: true,
    allow_functional_cookies: true,
    allow_directory_listing: false,
    allow_photo_usage: false,
    allow_academic_sharing: true
  })
  const [dataRequests, setDataRequests] = useState([])
  const [consentHistory, setConsentHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPrivacyData()
  }, [])

  const loadPrivacyData = async () => {
    try {
      // Mock data - replace with actual API calls
      setPrivacySettings({
        allow_marketing_emails: false,
        allow_analytics_tracking: true,
        allow_performance_cookies: true,
        allow_functional_cookies: true,
        allow_directory_listing: false,
        allow_photo_usage: false,
        allow_academic_sharing: true
      })
      
      setDataRequests([])
      setConsentHistory([])
    } catch (error) {
      toast.error('Failed to load privacy settings')
    }
  }

  const updatePrivacySetting = async (setting, value) => {
    try {
      setPrivacySettings(prev => ({ ...prev, [setting]: value }))
      // Mock API call - replace with actual endpoint
      toast.success('Privacy setting updated')
    } catch (error) {
      toast.error('Failed to update privacy setting')
    }
  }

  const requestDataExport = async () => {
    setLoading(true)
    try {
      // Mock API call for data export request
      toast.success('Data export request submitted. You will receive an email when ready.')
    } catch (error) {
      toast.error('Failed to request data export')
    } finally {
      setLoading(false)
    }
  }

  const requestDataDeletion = async () => {
    if (!confirm('Are you sure you want to request deletion of your data? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      // Mock API call for data deletion request
      toast.success('Data deletion request submitted. You will be contacted within 30 days.')
    } catch (error) {
      toast.error('Failed to request data deletion')
    } finally {
      setLoading(false)
    }
  }

  const withdrawConsent = async (consentType) => {
    try {
      // Mock API call to withdraw consent
      toast.success('Consent withdrawn successfully')
    } catch (error) {
      toast.error('Failed to withdraw consent')
    }
  }

  const privacyControls = [
    {
      id: 'allow_marketing_emails',
      title: 'Marketing Emails',
      description: 'Receive promotional emails about school events and programs',
      icon: Mail,
      category: 'Communication'
    },
    {
      id: 'allow_analytics_tracking',
      title: 'Analytics Tracking',
      description: 'Help improve our services by allowing anonymous usage analytics',
      icon: Eye,
      category: 'Analytics'
    },
    {
      id: 'allow_performance_cookies',
      title: 'Performance Cookies',
      description: 'Allow cookies that help us understand how you use our website',
      icon: Cookie,
      category: 'Cookies'
    },
    {
      id: 'allow_functional_cookies',
      title: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization',
      icon: Settings,
      category: 'Cookies'
    },
    {
      id: 'allow_directory_listing',
      title: 'Directory Listing',
      description: 'Include your information in school directory (name and class only)',
      icon: User,
      category: 'Sharing'
    },
    {
      id: 'allow_photo_usage',
      title: 'Photo Usage',
      description: 'Allow use of your photos in school publications and website',
      icon: Share2,
      category: 'Media'
    },
    {
      id: 'allow_academic_sharing',
      title: 'Academic Data Sharing',
      description: 'Share academic progress with authorized educational partners',
      icon: Database,
      category: 'Academic'
    }
  ]

  const dataRights = [
    {
      title: 'Export My Data',
      description: 'Download a copy of all your personal data we have stored',
      icon: Download,
      action: requestDataExport,
      buttonText: 'Request Export'
    },
    {
      title: 'Delete My Data',
      description: 'Request permanent deletion of your personal data',
      icon: Trash2,
      action: requestDataDeletion,
      buttonText: 'Request Deletion',
      dangerous: true
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Dashboard</h1>
        <p className="text-gray-600">Manage your privacy settings and data rights</p>
      </div>

      {/* Privacy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Privacy Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">Compliant</div>
              <div className="text-sm text-gray-600">GDPR & COPPA</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Lock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">Encrypted</div>
              <div className="text-sm text-gray-600">Data Protection</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">7 Years</div>
              <div className="text-sm text-gray-600">Retention Period</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Privacy Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {privacyControls.map((control) => {
              const IconComponent = control.icon
              return (
                <div key={control.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{control.title}</h4>
                      <p className="text-sm text-gray-600">{control.description}</p>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        {control.category}
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacySettings[control.id]}
                      onChange={(e) => updatePrivacySetting(control.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Your Data Rights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataRights.map((right, index) => {
              const IconComponent = right.icon
              return (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <IconComponent className={`h-6 w-6 mr-3 ${right.dangerous ? 'text-red-600' : 'text-blue-600'}`} />
                    <h4 className="font-medium text-gray-900">{right.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{right.description}</p>
                  <Button
                    onClick={right.action}
                    disabled={loading}
                    variant={right.dangerous ? "destructive" : "default"}
                    size="sm"
                    className="w-full"
                  >
                    {right.buttonText}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Privacy Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Data Protection Officer</h4>
            <p className="text-sm text-gray-600 mb-2">
              For any privacy concerns or questions about your data:
            </p>
            <div className="space-y-1 text-sm">
              <div>Email: <a href="mailto:dpo@school.edu" className="text-blue-600 hover:underline">dpo@school.edu</a></div>
              <div>Phone: +1 (555) 123-4567</div>
              <div>Office Hours: Monday-Friday, 9:00 AM - 5:00 PM</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Legal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Privacy Policy</h4>
              <p className="text-sm text-gray-600 mb-2">
                Last updated: January 2024
              </p>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Policy
              </Button>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Terms of Service</h4>
              <p className="text-sm text-gray-600 mb-2">
                Last updated: January 2024
              </p>
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                View Terms
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
