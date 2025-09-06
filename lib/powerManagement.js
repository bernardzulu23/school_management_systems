/**
 * Solar Power & Battery Management System for Rural Zambian Schools
 * Optimizes power consumption and manages solar energy resources
 * Designed for schools with unreliable electricity infrastructure
 */

export class PowerManagementSystem {
  constructor() {
    this.batteryLevel = 100
    this.solarPanelWattage = 0
    this.powerConsumption = 0
    this.powerMode = 'normal' // normal, eco, ultra-low
    this.solarData = new Map()
    this.powerSchedule = new Map()
    this.deviceRegistry = new Map()
    this.weatherData = null
    
    this.initializePowerMonitoring()
    this.setupSolarCalculations()
    this.startPowerOptimization()
    this.loadPowerSchedule()
  }

  /**
   * Initialize power monitoring capabilities
   */
  initializePowerMonitoring() {
    // Monitor device battery if available
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        this.deviceBattery = battery
        this.batteryLevel = battery.level * 100
        
        // Listen for battery events
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level * 100
          this.handleBatteryLevelChange()
        })
        
        battery.addEventListener('chargingchange', () => {
          this.handleChargingStateChange(battery.charging)
        })
        
        console.log(`🔋 Battery monitoring initialized: ${this.batteryLevel.toFixed(1)}%`)
      })
    }
    
    // Monitor power consumption
    this.startPowerConsumptionMonitoring()
    
    // Setup power saving features
    this.setupPowerSavingFeatures()
  }

  /**
   * Setup solar energy calculations
   */
  setupSolarCalculations() {
    // Zambian solar data (average values)
    this.solarConstants = {
      peakSunHours: {
        dry_season: 8.5,    // May - October
        rainy_season: 6.0   // November - April
      },
      solarIrradiance: 5.5, // kWh/m²/day average
      panelEfficiency: 0.18, // 18% efficiency for affordable panels
      systemEfficiency: 0.85, // Account for inverter losses, etc.
      batteryEfficiency: 0.90 // Lead-acid battery efficiency
    }
    
    // Default solar panel configuration for rural schools
    this.solarConfig = {
      panelWattage: 300,     // 300W panels
      numberOfPanels: 4,     // 1200W total
      batteryCapacity: 200,  // 200Ah battery bank
      batteryVoltage: 12,    // 12V system
      maxDailyConsumption: 8 // 8 kWh per day target
    }
    
    console.log('☀️ Solar calculations initialized')
  }

  /**
   * Calculate solar energy generation potential
   */
  calculateSolarGeneration(date = new Date()) {
    const month = date.getMonth() + 1
    const isDrySeason = month >= 5 && month <= 10
    
    const peakSunHours = isDrySeason ? 
      this.solarConstants.peakSunHours.dry_season : 
      this.solarConstants.peakSunHours.rainy_season
    
    const totalPanelWattage = this.solarConfig.panelWattage * this.solarConfig.numberOfPanels
    const dailyGeneration = (totalPanelWattage * peakSunHours * this.solarConstants.systemEfficiency) / 1000
    
    return {
      dailyGeneration: dailyGeneration.toFixed(2), // kWh
      peakSunHours: peakSunHours,
      season: isDrySeason ? 'dry' : 'rainy',
      panelOutput: totalPanelWattage,
      efficiency: this.solarConstants.systemEfficiency
    }
  }

  /**
   * Calculate battery capacity and runtime
   */
  calculateBatteryRuntime(currentLoad = null) {
    const load = currentLoad || this.getCurrentPowerConsumption()
    const batteryCapacityWh = this.solarConfig.batteryCapacity * this.solarConfig.batteryVoltage
    const usableCapacity = batteryCapacityWh * 0.5 // Only use 50% for lead-acid longevity
    
    const runtimeHours = (usableCapacity * this.batteryLevel / 100) / load
    
    return {
      runtimeHours: runtimeHours.toFixed(1),
      batteryCapacityWh: batteryCapacityWh,
      usableCapacityWh: usableCapacity,
      currentLoad: load,
      batteryLevel: this.batteryLevel
    }
  }

  /**
   * Optimize power consumption based on available energy
   */
  optimizePowerConsumption() {
    const solarGen = this.calculateSolarGeneration()
    const batteryRuntime = this.calculateBatteryRuntime()
    
    // Determine optimal power mode
    if (this.batteryLevel < 20) {
      this.setPowerMode('ultra-low')
    } else if (this.batteryLevel < 50) {
      this.setPowerMode('eco')
    } else if (parseFloat(solarGen.dailyGeneration) > this.solarConfig.maxDailyConsumption) {
      this.setPowerMode('normal')
    } else {
      this.setPowerMode('eco')
    }
    
    // Schedule power-intensive tasks during peak solar hours
    this.schedulePowerIntensiveTasks()
    
    return {
      recommendedMode: this.powerMode,
      solarGeneration: solarGen,
      batteryRuntime: batteryRuntime,
      powerSavings: this.calculatePowerSavings()
    }
  }

  /**
   * Set power mode and apply optimizations
   */
  setPowerMode(mode) {
    if (this.powerMode === mode) return
    
    this.powerMode = mode
    console.log(`⚡ Power mode changed to: ${mode}`)
    
    switch (mode) {
      case 'ultra-low':
        this.applyUltraLowPowerMode()
        break
      case 'eco':
        this.applyEcoPowerMode()
        break
      case 'normal':
        this.applyNormalPowerMode()
        break
    }
    
    // Emit power mode change event
    window.dispatchEvent(new CustomEvent('power-mode-changed', {
      detail: { mode, batteryLevel: this.batteryLevel }
    }))
  }

  /**
   * Apply ultra-low power mode settings
   */
  applyUltraLowPowerMode() {
    // Reduce screen brightness to minimum
    this.setScreenBrightness(0.3)
    
    // Disable animations and transitions
    this.disableAnimations()
    
    // Reduce CPU usage
    this.reduceCPUUsage()
    
    // Disable non-essential features
    this.disableNonEssentialFeatures()
    
    // Set aggressive power saving
    this.setUpdateInterval(300000) // 5 minutes
    
    console.log('🔋 Ultra-low power mode activated')
  }

  /**
   * Apply eco power mode settings
   */
  applyEcoPowerMode() {
    // Reduce screen brightness
    this.setScreenBrightness(0.6)
    
    // Limit animations
    this.limitAnimations()
    
    // Reduce update frequency
    this.setUpdateInterval(60000) // 1 minute
    
    // Optimize background processes
    this.optimizeBackgroundProcesses()
    
    console.log('🌱 Eco power mode activated')
  }

  /**
   * Apply normal power mode settings
   */
  applyNormalPowerMode() {
    // Restore normal brightness
    this.setScreenBrightness(1.0)
    
    // Enable all animations
    this.enableAnimations()
    
    // Normal update frequency
    this.setUpdateInterval(30000) // 30 seconds
    
    // Enable all features
    this.enableAllFeatures()
    
    console.log('⚡ Normal power mode activated')
  }

  /**
   * Schedule power-intensive tasks during peak solar hours
   */
  schedulePowerIntensiveTasks() {
    const now = new Date()
    const currentHour = now.getHours()
    
    // Peak solar hours in Zambia: 10 AM - 3 PM
    const isPeakSolar = currentHour >= 10 && currentHour <= 15
    
    if (isPeakSolar) {
      // Schedule data synchronization
      this.scheduleTask('data_sync', 'high_priority')
      
      // Schedule system updates
      this.scheduleTask('system_updates', 'normal_priority')
      
      // Schedule backup operations
      this.scheduleTask('data_backup', 'low_priority')
    } else {
      // Defer non-critical tasks
      this.deferNonCriticalTasks()
    }
  }

  /**
   * Monitor power consumption of different components
   */
  startPowerConsumptionMonitoring() {
    // Estimate power consumption based on active features
    setInterval(() => {
      this.powerConsumption = this.calculateCurrentConsumption()
      this.updatePowerMetrics()
    }, 10000) // Update every 10 seconds
  }

  /**
   * Calculate current power consumption
   */
  calculateCurrentConsumption() {
    let consumption = 0
    
    // Base system consumption
    consumption += 50 // 50W base load
    
    // Screen consumption based on brightness
    const screenBrightness = this.getScreenBrightness()
    consumption += 30 * screenBrightness // Up to 30W for screen
    
    // Network activity
    if (navigator.onLine) {
      consumption += 15 // 15W for WiFi/data
    }
    
    // Active features
    this.deviceRegistry.forEach((device, id) => {
      if (device.active) {
        consumption += device.powerConsumption || 5
      }
    })
    
    return consumption
  }

  /**
   * Get current power consumption
   */
  getCurrentPowerConsumption() {
    return this.powerConsumption
  }

  /**
   * Register a device/component for power monitoring
   */
  registerDevice(deviceId, deviceInfo) {
    this.deviceRegistry.set(deviceId, {
      ...deviceInfo,
      registeredAt: new Date().toISOString(),
      active: false,
      powerConsumption: deviceInfo.powerConsumption || 5
    })
  }

  /**
   * Set device active state
   */
  setDeviceActive(deviceId, active) {
    const device = this.deviceRegistry.get(deviceId)
    if (device) {
      device.active = active
      device.lastStateChange = new Date().toISOString()
    }
  }

  /**
   * Calculate power savings from optimizations
   */
  calculatePowerSavings() {
    const normalConsumption = 100 // Baseline 100W
    const currentConsumption = this.powerConsumption
    
    const savings = normalConsumption - currentConsumption
    const savingsPercentage = (savings / normalConsumption) * 100
    
    return {
      absoluteSavings: Math.max(0, savings),
      percentageSavings: Math.max(0, savingsPercentage.toFixed(1)),
      currentConsumption: currentConsumption,
      normalConsumption: normalConsumption
    }
  }

  /**
   * Get solar panel recommendations for school
   */
  getSolarRecommendations(dailyEnergyNeed = 8) {
    const solarGen = this.calculateSolarGeneration()
    const requiredPanelWattage = (dailyEnergyNeed * 1000) / (solarGen.peakSunHours * this.solarConstants.systemEfficiency)
    const recommendedPanels = Math.ceil(requiredPanelWattage / this.solarConfig.panelWattage)
    
    const cost = this.calculateSolarSystemCost(recommendedPanels)
    
    return {
      dailyEnergyNeed: dailyEnergyNeed,
      requiredWattage: requiredPanelWattage.toFixed(0),
      recommendedPanels: recommendedPanels,
      totalSystemWattage: recommendedPanels * this.solarConfig.panelWattage,
      estimatedCost: cost,
      paybackPeriod: this.calculatePaybackPeriod(cost, dailyEnergyNeed),
      co2Savings: this.calculateCO2Savings(dailyEnergyNeed)
    }
  }

  /**
   * Calculate solar system cost in Zambian Kwacha
   */
  calculateSolarSystemCost(numberOfPanels) {
    const panelCost = numberOfPanels * 2500 // K2,500 per 300W panel
    const batteryCost = 3000 // K3,000 for 200Ah battery
    const inverterCost = 2000 // K2,000 for inverter
    const installationCost = 1500 // K1,500 installation
    const miscCost = 1000 // K1,000 for wiring, etc.
    
    const totalCost = panelCost + batteryCost + inverterCost + installationCost + miscCost
    
    return {
      panels: panelCost,
      battery: batteryCost,
      inverter: inverterCost,
      installation: installationCost,
      miscellaneous: miscCost,
      total: totalCost,
      currency: 'ZMW'
    }
  }

  /**
   * Calculate payback period for solar investment
   */
  calculatePaybackPeriod(systemCost, dailyEnergyNeed) {
    const monthlyGridCost = dailyEnergyNeed * 30 * 2.5 // K2.50 per kWh grid electricity
    const monthlyMaintenance = 50 // K50 monthly maintenance
    const monthlySavings = monthlyGridCost - monthlyMaintenance
    
    const paybackMonths = systemCost.total / monthlySavings
    
    return {
      paybackMonths: paybackMonths.toFixed(1),
      paybackYears: (paybackMonths / 12).toFixed(1),
      monthlySavings: monthlySavings.toFixed(2),
      monthlyGridCost: monthlyGridCost.toFixed(2)
    }
  }

  /**
   * Calculate CO2 emissions savings
   */
  calculateCO2Savings(dailyEnergyNeed) {
    // Zambian grid CO2 intensity: ~0.8 kg CO2/kWh (coal-heavy)
    const gridCO2Intensity = 0.8
    const annualEnergyNeed = dailyEnergyNeed * 365
    const annualCO2Savings = annualEnergyNeed * gridCO2Intensity
    
    return {
      annualSavings: annualCO2Savings.toFixed(0),
      unit: 'kg CO2',
      equivalentTrees: Math.round(annualCO2Savings / 22) // 1 tree absorbs ~22kg CO2/year
    }
  }

  /**
   * Handle battery level changes
   */
  handleBatteryLevelChange() {
    console.log(`🔋 Battery level: ${this.batteryLevel.toFixed(1)}%`)
    
    // Trigger power optimization
    this.optimizePowerConsumption()
    
    // Show warnings for low battery
    if (this.batteryLevel < 20) {
      this.showLowBatteryWarning()
    } else if (this.batteryLevel < 10) {
      this.showCriticalBatteryWarning()
    }
  }

  /**
   * Handle charging state changes
   */
  handleChargingStateChange(isCharging) {
    console.log(`🔌 Charging state: ${isCharging ? 'charging' : 'not charging'}`)
    
    if (isCharging) {
      // Solar panels are generating power
      this.setPowerMode('normal')
    } else {
      // Running on battery
      this.optimizePowerConsumption()
    }
  }

  /**
   * Show low battery warning
   */
  showLowBatteryWarning() {
    const warning = document.createElement('div')
    warning.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff9500;
        color: white;
        padding: 15px;
        border-radius: 5px;
        max-width: 300px;
        z-index: 10000;
      ">
        🔋 <strong>Low Battery (${this.batteryLevel.toFixed(1)}%)</strong><br>
        Power saving mode activated
        <button onclick="this.parentElement.remove()" style="
          float: right;
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        ">×</button>
      </div>
    `
    
    document.body.appendChild(warning)
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove()
      }
    }, 10000)
  }

  /**
   * Show critical battery warning
   */
  showCriticalBatteryWarning() {
    const warning = document.createElement('div')
    warning.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #dc3545;
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 10001;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      ">
        ⚠️ <strong>CRITICAL BATTERY LEVEL</strong><br>
        ${this.batteryLevel.toFixed(1)}% remaining<br>
        <small>Save your work immediately</small>
      </div>
    `
    
    document.body.appendChild(warning)
    
    // Keep warning visible longer for critical level
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove()
      }
    }, 30000)
  }

  /**
   * Get comprehensive power status
   */
  getPowerStatus() {
    const solarGen = this.calculateSolarGeneration()
    const batteryRuntime = this.calculateBatteryRuntime()
    const powerSavings = this.calculatePowerSavings()
    
    return {
      batteryLevel: this.batteryLevel,
      powerMode: this.powerMode,
      powerConsumption: this.powerConsumption,
      solarGeneration: solarGen,
      batteryRuntime: batteryRuntime,
      powerSavings: powerSavings,
      isCharging: this.deviceBattery?.charging || false,
      deviceCount: this.deviceRegistry.size,
      lastUpdated: new Date().toISOString()
    }
  }

  // Helper methods for power optimization
  setScreenBrightness(level) {
    document.documentElement.style.setProperty('--screen-brightness', level)
    if (document.body.style) {
      document.body.style.filter = `brightness(${level})`
    }
  }

  getScreenBrightness() {
    const brightness = document.documentElement.style.getPropertyValue('--screen-brightness')
    return parseFloat(brightness) || 1.0
  }

  disableAnimations() {
    const style = document.createElement('style')
    style.id = 'power-save-animations'
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
    document.head.appendChild(style)
  }

  enableAnimations() {
    const style = document.getElementById('power-save-animations')
    if (style) {
      style.remove()
    }
  }

  limitAnimations() {
    const style = document.createElement('style')
    style.id = 'power-limit-animations'
    style.innerHTML = `
      * {
        animation-duration: 0.2s !important;
        transition-duration: 0.2s !important;
      }
    `
    document.head.appendChild(style)
  }

  reduceCPUUsage() {
    // Reduce JavaScript execution frequency
    this.setUpdateInterval(300000) // 5 minutes
  }

  setUpdateInterval(interval) {
    this.updateInterval = interval
    // Emit event for components to adjust their update frequency
    window.dispatchEvent(new CustomEvent('update-interval-changed', {
      detail: { interval }
    }))
  }

  disableNonEssentialFeatures() {
    // Disable features that consume power
    window.dispatchEvent(new CustomEvent('disable-non-essential-features'))
  }

  enableAllFeatures() {
    // Re-enable all features
    window.dispatchEvent(new CustomEvent('enable-all-features'))
  }

  optimizeBackgroundProcesses() {
    // Reduce background activity
    window.dispatchEvent(new CustomEvent('optimize-background-processes'))
  }

  scheduleTask(taskType, priority) {
    // Schedule tasks for optimal power usage
    console.log(`📅 Scheduled ${taskType} with ${priority} priority`)
  }

  deferNonCriticalTasks() {
    // Defer tasks until peak solar hours
    console.log('⏰ Non-critical tasks deferred to peak solar hours')
  }

  updatePowerMetrics() {
    // Update power consumption metrics
    window.dispatchEvent(new CustomEvent('power-metrics-updated', {
      detail: this.getPowerStatus()
    }))
  }

  loadPowerSchedule() {
    // Load power schedule from storage
    try {
      const saved = localStorage.getItem('power_schedule')
      if (saved) {
        const schedule = JSON.parse(saved)
        this.powerSchedule = new Map(Object.entries(schedule))
      }
    } catch (error) {
      console.error('Failed to load power schedule:', error)
    }
  }

  startPowerOptimization() {
    // Start continuous power optimization
    setInterval(() => {
      this.optimizePowerConsumption()
    }, 60000) // Every minute
  }
}

// Export singleton instance
export const powerManagement = new PowerManagementSystem()
