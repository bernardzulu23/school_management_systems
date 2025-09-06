/**
 * Zambian School Dashboard Component
 * Demonstrates integration of all rural-specific features
 * Optimized for low-resource environments
 */

import React, { useState, useEffect } from 'react'
import { zambianSchoolSystem } from '../lib/zambianSchoolSystem.js'
import { offlineSystem } from '../lib/offlineSystem.js'
import { powerManagement } from '../lib/powerManagement.js'
import { languageSystem } from '../lib/languageSystem.js'
import { smsSystem } from '../lib/smsSystem.js'
import { mobileMoneySystem } from '../lib/mobileMoneySystem.js'

const ZambianSchoolDashboard = () => {
  const [systemStatus, setSystemStatus] = useState('initializing')
  const [powerStatus, setPowerStatus] = useState({})
  const [offlineStatus, setOfflineStatus] = useState({})
  const [languageStats, setLanguageStats] = useState({})
  const [smsStats, setSmsStats] = useState({})
  const [moneyStats, setMoneyStats] = useState({})
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [emergencyMode, setEmergencyMode] = useState(false)

  useEffect(() => {
    // Initialize system and setup event listeners
    initializeZambianSystem()
    setupEventListeners()
    
    // Cleanup on unmount
    return () => {
      removeEventListeners()
    }
  }, [])

  const initializeZambianSystem = async () => {
    try {
      // Wait for system initialization
      if (zambianSchoolSystem.isInitialized) {
        updateSystemStatus()
      } else {
        // Listen for initialization complete
        window.addEventListener('zambian-school-system-ready', updateSystemStatus)
      }
    } catch (error) {
      console.error('Failed to initialize Zambian system:', error)
      setSystemStatus('error')
    }
  }

  const setupEventListeners = () => {
    // System events
    window.addEventListener('zambian-school-system-ready', updateSystemStatus)
    window.addEventListener('system-health-check', handleHealthCheck)
    window.addEventListener('emergency-alert', handleEmergencyAlert)
    
    // Power events
    window.addEventListener('power-mode-changed', updatePowerStatus)
    window.addEventListener('power-metrics-updated', updatePowerStatus)
    
    // Offline events
    window.addEventListener('offline-sync-progress', updateOfflineStatus)
    window.addEventListener('offline-data-loaded', updateOfflineStatus)
    
    // Language events
    window.addEventListener('language-changed', updateLanguageStatus)
    
    // Connectivity events
    window.addEventListener('online', handleConnectivityChange)
    window.addEventListener('offline', handleConnectivityChange)
  }

  const removeEventListeners = () => {
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
  }

  const updateSystemStatus = () => {
    const status = zambianSchoolSystem.getSystemStatus()
    setSystemStatus(status.systemStatus)
    setEmergencyMode(status.emergencyMode)
    
    // Update individual system statuses
    updatePowerStatus()
    updateOfflineStatus()
    updateLanguageStatus()
    updateSmsStats()
    updateMoneyStats()
  }

  const updatePowerStatus = () => {
    if (powerManagement) {
      const status = powerManagement.getPowerStatus()
      setPowerStatus(status)
    }
  }

  const updateOfflineStatus = () => {
    if (offlineSystem) {
      const status = offlineSystem.getOfflineStatus()
      setOfflineStatus(status)
    }
  }

  const updateLanguageStatus = () => {
    if (languageSystem) {
      const stats = languageSystem.getLanguageStats()
      setLanguageStats(stats)
      setCurrentLanguage(stats.currentLanguage)
    }
  }

  const updateSmsStats = () => {
    if (smsSystem) {
      const stats = smsSystem.getSMSStats()
      setSmsStats(stats)
    }
  }

  const updateMoneyStats = () => {
    if (mobileMoneySystem) {
      const stats = mobileMoneySystem.getMobileMoneyStats()
      setMoneyStats(stats)
    }
  }

  const handleHealthCheck = (event) => {
    const { detail } = event
    console.log('System health check:', detail)
  }

  const handleEmergencyAlert = (event) => {
    setEmergencyMode(true)
    // Show emergency notification
    showEmergencyNotification(event.detail)
  }

  const handleConnectivityChange = () => {
    updateOfflineStatus()
  }

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
          ${alertData.description}<br>
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
      timestamp: new Date().toISOString()
    }
    
    window.dispatchEvent(new CustomEvent('emergency-alert', { detail: alertData }))
  }

  const testSMSSystem = async () => {
    if (smsSystem) {
      try {
        await smsSystem.sendSMS('+260977123456', 'Test message from Zambian School System', 'test')
        alert('Test SMS sent successfully!')
      } catch (error) {
        alert('Failed to send test SMS: ' + error.message)
      }
    }
  }

  const testMobileMoneyPayment = async () => {
    if (mobileMoneySystem) {
      try {
        const payment = await mobileMoneySystem.processPayment({
          phoneNumber: '+260977123456',
          amount: 100,
          feeType: 'school_fees',
          studentId: 'TEST_STUDENT',
          reference: 'TEST_PAYMENT'
        })
        alert('Test payment processed successfully!')
      } catch (error) {
        alert('Failed to process test payment: ' + error.message)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return '#10b981'
      case 'warning': return '#f59e0b'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getBatteryColor = (level) => {
    if (level > 50) return '#10b981'
    if (level > 20) return '#f59e0b'
    return '#ef4444'
  }

  if (systemStatus === 'initializing') {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🇿🇲</div>
          <h2>Initializing Zambian School System...</h2>
          <p>Setting up offline mode, power management, SMS, and mobile money systems</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      background: emergencyMode ? '#fee2e2' : '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#1f2937' }}>🇿🇲 Zambian School Management</h1>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280' }}>
            Ultra-Low Infrastructure School System
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Language Selector */}
          <select 
            value={currentLanguage} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d1d5db', 
              borderRadius: '5px' 
            }}
          >
            <option value="en">English</option>
            <option value="bem">Ichibemba</option>
            <option value="ton">Chitonga</option>
            <option value="nya">Chinyanja</option>
            <option value="loz">Silozi</option>
          </select>
          
          {/* Emergency Button */}
          <button
            onClick={handleEmergencyButton}
            style={{
              padding: '10px 15px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🚨 EMERGENCY
          </button>
        </div>
      </div>

      {/* System Status Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        
        {/* System Overview */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>📊 System Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: getStatusColor(systemStatus) 
            }}></div>
            <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
              {systemStatus}
            </span>
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
            Emergency Mode: {emergencyMode ? '🚨 ACTIVE' : '✅ Normal'}
          </div>
        </div>

        {/* Power Management */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>🔋 Power Status</h3>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Battery Level:</span>
              <span style={{ 
                color: getBatteryColor(powerStatus.batteryLevel),
                fontWeight: 'bold'
              }}>
                {powerStatus.batteryLevel?.toFixed(1) || 0}%
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: '#e5e7eb', 
              borderRadius: '4px',
              marginTop: '5px'
            }}>
              <div style={{ 
                width: `${powerStatus.batteryLevel || 0}%`, 
                height: '100%', 
                background: getBatteryColor(powerStatus.batteryLevel),
                borderRadius: '4px'
              }}></div>
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Mode: {powerStatus.powerMode || 'Unknown'}<br/>
            Consumption: {powerStatus.powerConsumption || 0}W
          </div>
        </div>

        {/* Offline Status */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>📴 Offline Mode</h3>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                background: offlineStatus.isOnline ? '#10b981' : '#ef4444'
              }}></div>
              <span>{offlineStatus.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Offline Duration: {offlineStatus.offlineDuration || 0} days<br/>
            Sync Queue: {offlineStatus.syncQueueSize || 0} items
          </div>
        </div>

        {/* SMS System */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>📱 SMS System</h3>
          <div style={{ marginBottom: '10px' }}>
            Success Rate: {smsStats.successRate || 0}%<br/>
            Pending: {smsStats.pending || 0}<br/>
            Registered Users: {smsStats.registeredUsers || 0}
          </div>
          <button
            onClick={testSMSSystem}
            style={{
              padding: '8px 12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Test SMS
          </button>
        </div>

        {/* Mobile Money */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>💰 Mobile Money</h3>
          <div style={{ marginBottom: '10px' }}>
            Total Transactions: {moneyStats.totalTransactions || 0}<br/>
            Total Amount: K{moneyStats.totalAmount?.toFixed(2) || '0.00'}<br/>
            Success Rate: {moneyStats.successRate || 0}%
          </div>
          <button
            onClick={testMobileMoneyPayment}
            style={{
              padding: '8px 12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Test Payment
          </button>
        </div>

        {/* Language Support */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>🌍 Languages</h3>
          <div style={{ marginBottom: '10px' }}>
            Current: {languageStats.currentLanguageName || 'English'}<br/>
            Supported: {languageStats.supportedLanguages || 0}<br/>
            Voice Support: {languageStats.speechSynthesisSupported ? '✅' : '❌'}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Translation Keys: {languageStats.translationKeys || 0}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button style={{ 
            padding: '10px 15px', 
            background: '#6366f1', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}>
            📊 View Reports
          </button>
          <button style={{ 
            padding: '10px 15px', 
            background: '#8b5cf6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}>
            👥 Manage Students
          </button>
          <button style={{ 
            padding: '10px 15px', 
            background: '#06b6d4', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}>
            💰 Fee Management
          </button>
          <button style={{ 
            padding: '10px 15px', 
            background: '#84cc16', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}>
            📱 Send SMS
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        marginTop: '30px', 
        textAlign: 'center', 
        color: '#6b7280', 
        fontSize: '14px' 
      }}>
        <p>🇿🇲 Zambian School Management System - Designed for Rural Schools</p>
        <p>Ultra-Low Infrastructure • 7-Day Offline Mode • Solar Powered • Local Languages</p>
      </div>
    </div>
  )
}

export default ZambianSchoolDashboard
