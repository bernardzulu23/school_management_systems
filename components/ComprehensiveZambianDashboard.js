import React, { useState, useEffect } from 'react'
import { zambianSchoolMasterSystem } from '../lib/zambianSchoolSystem.js'

// Sub-components
import DashboardHeader from './dashboard/comprehensive/DashboardHeader'
import DashboardNavigation from './dashboard/comprehensive/DashboardNavigation'
import PhaseOverview from './dashboard/comprehensive/PhaseOverview'
import SystemAlerts from './dashboard/comprehensive/SystemAlerts'
import QuickActions from './dashboard/comprehensive/QuickActions'
import PhaseContent from './dashboard/comprehensive/PhaseContent'

/**
 * Comprehensive Zambian School Management Dashboard
 * Demonstrates all 5 phases working together with real-time monitoring
 */
const ComprehensiveZambianDashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null)
  const [activePhase, setActivePhase] = useState('overview')
  const [realTimeData, setRealTimeData] = useState({})
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeDashboard()
    const interval = setInterval(updateRealTimeData, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const initializeDashboard = async () => {
    try {
      setIsLoading(true)
      
      // Initialize master system
      await zambianSchoolMasterSystem.initializeIntegration()
      
      // Get initial system status
      const status = zambianSchoolMasterSystem.getComprehensiveSystemStatus()
      setSystemStatus(status)
      
      // Get initial real-time data
      await updateRealTimeData()
      
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
      setIsLoading(false)
    }
  }

  const updateRealTimeData = async () => {
    try {
      const stats = zambianSchoolMasterSystem.generateComprehensiveStats()
      setRealTimeData(stats)
      
      // Update system status
      const status = zambianSchoolMasterSystem.getComprehensiveSystemStatus()
      setSystemStatus(status)
      
      // Check for new alerts
      checkForAlerts(stats)
    } catch (error) {
      console.error('Failed to update real-time data:', error)
    }
  }

  const checkForAlerts = (stats) => {
    const newAlerts = []
    
    // Check system health
    if (stats.system_overview.overall_performance < 70) {
      newAlerts.push({
        id: Date.now(),
        type: 'warning',
        message: `System performance at ${stats.system_overview.overall_performance}%`,
        timestamp: new Date()
      })
    }
    
    // Check power status
    if (stats.phase1_stats.power_system === 'operational') {
      // Simulate power alert
      if (Math.random() < 0.1) {
        newAlerts.push({
          id: Date.now() + 1,
          type: 'info',
          message: 'Solar power generation optimal',
          timestamp: new Date()
        })
      }
    }
    
    setAlerts(prev => [...newAlerts, ...prev.slice(0, 4)]) // Keep last 5 alerts
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing Zambian School Management System...</p>
          <p className="text-sm text-gray-500">Loading all 5 phases...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader systemStatus={systemStatus} />
      <DashboardNavigation activePhase={activePhase} setActivePhase={setActivePhase} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePhase === 'overview' ? (
          <div className="space-y-8">
            <PhaseOverview realTimeData={realTimeData} systemStatus={systemStatus} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SystemAlerts alerts={alerts} />
              <QuickActions />
            </div>
          </div>
        ) : (
          <PhaseContent activePhase={activePhase} />
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <p>
              🌍 Designed for Zambian Rural Schools - Ultra-Low Infrastructure Compatible
            </p>
            <p>
              Last Updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComprehensiveZambianDashboard
