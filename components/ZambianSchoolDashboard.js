/**
 * Zambian School Dashboard Component
 * Demonstrates integration of all rural-specific features
 * Optimized for low-resource environments
 */

import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { zambianSchoolSystem } from '../lib/zambianSchoolSystem.js'
import { offlineSystem } from '../lib/offlineSystem.js'
import { powerManagement } from '../lib/powerManagement.js'
import { languageSystem } from '../lib/languageSystem.js'
import { smsSystem } from '../lib/smsSystem.js'
import { mobileMoneySystem } from '../lib/mobileMoneySystem.js'
import { escapeHtml } from '../lib/security.js'

// Sub-components
import SystemStatusCard from './dashboard/zambian/SystemStatusCard'
import PowerStatusCard from './dashboard/zambian/PowerStatusCard'
import OfflineStatusCard from './dashboard/zambian/OfflineStatusCard'
import SMSSystemCard from './dashboard/zambian/SMSSystemCard'
import MobileMoneyCard from './dashboard/zambian/MobileMoneyCard'
import LanguageSupportCard from './dashboard/zambian/LanguageSupportCard'
import QuickActions from './dashboard/zambian/QuickActions'
import DashboardHeader from './dashboard/zambian/DashboardHeader'

const ZambianSchoolDashboard = () => {
  const [systemStatus, setSystemStatus] = useState('initializing')
  const [powerStatus, setPowerStatus] = useState({})
  const [offlineStatus, setOfflineStatus] = useState({})
  const [languageStats, setLanguageStats] = useState({})
  const [smsStats, setSmsStats] = useState({})
  const [moneyStats, setMoneyStats] = useState({})
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [emergencyAlert, setEmergencyAlert] = useState(null)

  const updatePowerStatus = useCallback(() => {
    if (powerManagement) {
      const status = powerManagement.getPowerStatus()
      setPowerStatus(status)
    }
  }, [])

  const updateOfflineStatus = useCallback(() => {
    if (offlineSystem) {
      const status = offlineSystem.getOfflineStatus()
      setOfflineStatus(status)
    }
  }, [])

  const updateLanguageStatus = useCallback(() => {
    if (languageSystem) {
      const stats = languageSystem.getLanguageStats()
      setLanguageStats(stats)
      setCurrentLanguage(stats.currentLanguage)
    }
  }, [])

  const updateSmsStats = useCallback(() => {
    if (smsSystem) {
      const stats = smsSystem.getSMSStats()
      setSmsStats(stats)
    }
  }, [])

  const updateMoneyStats = useCallback(() => {
    if (mobileMoneySystem) {
      const stats = mobileMoneySystem.getMobileMoneyStats()
      setMoneyStats(stats)
    }
  }, [])

  const handleHealthCheck = useCallback((event) => {
    const { detail } = event
    console.log('System health check:', detail)
  }, [])

  const handleEmergencyAlert = useCallback((event) => {
    setEmergencyMode(true)
    setEmergencyAlert(event.detail)
  }, [])

  const handleConnectivityChange = useCallback(() => {
    updateOfflineStatus()
  }, [updateOfflineStatus])

  const updateSystemStatus = useCallback(() => {
    const status = zambianSchoolSystem.getSystemStatus()
    setSystemStatus(status.systemStatus)
    setEmergencyMode(status.emergencyMode)

    updatePowerStatus()
    updateOfflineStatus()
    updateLanguageStatus()
    updateSmsStats()
    updateMoneyStats()
  }, [
    updateLanguageStatus,
    updateMoneyStats,
    updateOfflineStatus,
    updatePowerStatus,
    updateSmsStats,
  ])

  const initializeZambianSystem = useCallback(async () => {
    try {
      if (zambianSchoolSystem.isInitialized) {
        updateSystemStatus()
      } else {
        window.addEventListener('zambian-school-system-ready', updateSystemStatus)
      }
    } catch (error) {
      console.error('Failed to initialize Zambian system:', error)
      setSystemStatus('error')
    }
  }, [updateSystemStatus])

  const setupEventListeners = useCallback(() => {
    window.addEventListener('zambian-school-system-ready', updateSystemStatus)
    window.addEventListener('system-health-check', handleHealthCheck)
    window.addEventListener('emergency-alert', handleEmergencyAlert)
    window.addEventListener('power-mode-changed', updatePowerStatus)
    window.addEventListener('power-metrics-updated', updatePowerStatus)
    window.addEventListener('offline-sync-progress', updateOfflineStatus)
    window.addEventListener('offline-data-loaded', updateOfflineStatus)
    window.addEventListener('language-changed', updateLanguageStatus)
    window.addEventListener('online', handleConnectivityChange)
    window.addEventListener('offline', handleConnectivityChange)
  }, [
    handleConnectivityChange,
    handleEmergencyAlert,
    handleHealthCheck,
    updateLanguageStatus,
    updateOfflineStatus,
    updatePowerStatus,
    updateSystemStatus,
  ])

  const removeEventListeners = useCallback(() => {
    window.removeEventListener('zambian-school-system-ready', updateSystemStatus)
    window.removeEventListener('system-health-check', handleHealthCheck)
    window.removeEventListener('emergency-alert', handleEmergencyAlert)
    window.removeEventListener('power-mode-changed', updatePowerStatus)
    window.removeEventListener('power-metrics-updated', updatePowerStatus)
    window.removeEventListener('offline-sync-progress', updateOfflineStatus)
    window.removeEventListener('offline-data-loaded', updateOfflineStatus)
    window.removeEventListener('language-changed', updateLanguageStatus)
    window.removeEventListener('online', handleConnectivityChange)
    window.removeEventListener('offline', handleConnectivityChange)
  }, [
    handleConnectivityChange,
    handleEmergencyAlert,
    handleHealthCheck,
    updateLanguageStatus,
    updateOfflineStatus,
    updatePowerStatus,
    updateSystemStatus,
  ])

  useEffect(() => {
    initializeZambianSystem()
    setupEventListeners()
    return () => {
      removeEventListeners()
    }
  }, [initializeZambianSystem, removeEventListeners, setupEventListeners])

  const showEmergencyNotification = (alertData) => {
    // Create emergency notification
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(220, 53, 69, 0.95);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-size: 24px;
        text-align: center;
      ">
        <div>
          🚨 <strong>EMERGENCY ALERT</strong><br>
          ${escapeHtml(String(alertData.description || ''))}<br>
          <small>Emergency services have been notified</small><br>
          <button onclick="this.parentElement.parentElement.remove()" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: white;
            color: #dc3545;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          ">Acknowledge</button>
        </div>
      </div>
    `

    document.body.appendChild(notification)
  }

  const handleLanguageChange = (languageCode) => {
    if (languageSystem) {
      languageSystem.setLanguage(languageCode)
    }
  }

  const handleEmergencyButton = () => {
    const alertData = {
      type: 'manual',
      description: 'Emergency button pressed',
      location: 'School Dashboard',
      timestamp: new Date().toISOString(),
    }

    window.dispatchEvent(new CustomEvent('emergency-alert', { detail: alertData }))
  }

  const testSMSSystem = async () => {
    if (smsSystem) {
      try {
        await smsSystem.sendSMS('+260977123456', 'Test message from Zambian School System', 'test')
        toast.success('Test SMS sent successfully!')
      } catch (error) {
        toast.error('Failed to send test SMS: ' + error.message)
      }
    }
  }

  const testMobileMoneyPayment = async (provider = null) => {
    if (mobileMoneySystem) {
      try {
        const payment = await mobileMoneySystem.processPayment({
          phoneNumber: '+260977123456',
          amount: 100,
          feeType: 'school_fees',
          studentId: 'TEST_STUDENT',
          reference: 'TEST_PAYMENT',
          provider,
        })
        toast.success('Test payment processed successfully!')
      } catch (error) {
        toast.error('Failed to process test payment: ' + error.message)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return '#10b981'
      case 'warning':
        return '#f59e0b'
      case 'error':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getBatteryColor = (level) => {
    if (level > 50) return '#10b981'
    if (level > 20) return '#f59e0b'
    return '#ef4444'
  }

  if (systemStatus === 'initializing') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#f3f4f6',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🇿🇲</div>
          <h2>Initializing Zambian School System...</h2>
          <p>Setting up offline mode, power management, SMS, and mobile money systems</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '20px',
        background: emergencyMode ? '#fee2e2' : '#f9fafb',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <DashboardHeader
        currentLanguage={currentLanguage}
        handleLanguageChange={handleLanguageChange}
        handleEmergencyButton={handleEmergencyButton}
      />

      {/* System Status Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '30px',
        }}
      >
        <SystemStatusCard
          systemStatus={systemStatus}
          emergencyMode={emergencyMode}
          getStatusColor={getStatusColor}
        />

        <PowerStatusCard powerStatus={powerStatus} getBatteryColor={getBatteryColor} />

        <OfflineStatusCard offlineStatus={offlineStatus} />

        <SMSSystemCard smsStats={smsStats} testSMSSystem={testSMSSystem} />

        <MobileMoneyCard moneyStats={moneyStats} testMobileMoneyPayment={testMobileMoneyPayment} />

        <LanguageSupportCard languageStats={languageStats} />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Footer */}
      <div
        style={{
          marginTop: '30px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
        }}
      >
        <p>🇿🇲 Zambian School Management System - Designed for Rural Schools</p>
        <p>Ultra-Low Infrastructure • 7-Day Offline Mode • Solar Powered • Local Languages</p>
      </div>
    </div>
  )
}

export default ZambianSchoolDashboard
