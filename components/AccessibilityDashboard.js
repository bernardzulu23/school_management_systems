import React, { useState, useEffect } from 'react'
import { UniversalAccessibilitySystem } from '../lib/universalAccessibilitySystem'

const AccessibilityDashboard = ({ userRole, userId }) => {
  const [activeTab, setActiveTab] = useState('profile')
  const [accessibilityProfile, setAccessibilityProfile] = useState(null)
  const [currentSettings, setCurrentSettings] = useState(null)
  const [accommodationPlan, setAccommodationPlan] = useState(null)
  const [assessmentData, setAssessmentData] = useState(null)
  const [effectivenessData, setEffectivenessData] = useState(null)

  useEffect(() => {
    initializeAccessibilityData()
  }, [userId])

  const initializeAccessibilityData = () => {
    // Create accessibility profile
    const profile = UniversalAccessibilitySystem.createAccessibilityProfile({
      userId: userId,
      profileType: userRole.toUpperCase(),
      accessibilityNeeds: ['visual_impairment', 'motor_difficulties'],
      assistiveTechnology: ['screen_reader', 'voice_control'],
      accommodations: [
        {
          type: 'extended_time',
          description: 'Additional time for assignments and tests',
          implementation: 'automatic_extension',
          timeline: 'immediate'
        },
        {
          type: 'alternative_format',
          description: 'Materials in large print and audio format',
          implementation: 'content_conversion',
          timeline: 'immediate'
        }
      ],
      culturalAdaptations: {
        ...UniversalAccessibilitySystem.CULTURAL_ADAPTATIONS,
        LANGUAGE: {
          primary: 'en',
          secondary: ['es'],
          rtl: false,
          fontFamily: 'OpenDyslexic',
          characterSet: 'latin'
        }
      },
      emergencyContacts: [
        { name: 'Accessibility Coordinator', phone: '+1-555-0789', relationship: 'coordinator' },
        { name: 'Parent/Guardian', phone: '+1-555-0123', relationship: 'parent' }
      ],
      medicalConditions: ['visual_impairment', 'dyslexia'],
      preferredModalities: ['auditory', 'tactile'],
      supportTeam: ['accessibility_coordinator', 'special_education_teacher', 'assistive_technology_specialist']
    })
    setAccessibilityProfile(profile)

    // Apply accessibility settings
    const settings = UniversalAccessibilitySystem.applyAccessibilitySettings(profile.id, {
      VISUAL: {
        highContrast: { enabled: true, level: 'high' },
        fontSize: { enabled: true, scale: 1.5 },
        screenReader: { enabled: true, speed: 'normal', voice: 'default' },
        darkMode: { enabled: true, autoSwitch: false },
        reducedMotion: { enabled: true, level: 'strict' }
      },
      AUDITORY: {
        captions: { enabled: true, language: 'en', fontSize: 'large' },
        audioDescription: { enabled: true, detail: 'detailed' },
        visualAlerts: { enabled: true, type: 'flash', intensity: 'high' }
      },
      MOTOR: {
        keyboardNavigation: { enabled: true, shortcuts: 'enhanced', customKeys: {} },
        voiceControl: { enabled: true, commands: 'advanced', sensitivity: 'high' },
        stickyKeys: { enabled: true, modifier: 'shift', timeout: 5000 },
        touchAssist: { enabled: true, targetSize: 'large', feedback: 'haptic' }
      },
      COGNITIVE: {
        simplifiedInterface: { enabled: true, level: 'intermediate', customization: 'manual' },
        readingAssist: { enabled: true, highlighting: true, pacing: 'user' },
        memoryAids: { enabled: true, reminders: true, visualCues: true },
        focusAssist: { enabled: true, distractionFilter: 'high', timeBlocking: true },
        timeExtensions: { enabled: true, multiplier: 1.5, automatic: true }
      },
      LEARNING: {
        multiModalContent: { enabled: true, formats: ['text', 'audio', 'visual', 'tactile'] },
        adaptivePacing: { enabled: true, algorithm: 'performance', userControl: true },
        alternativeFormats: { enabled: true, braille: false, largeText: true, audio: true },
        personalizedLearning: { enabled: true, style: 'visual_auditory', preferences: {} }
      }
    })
    setCurrentSettings(settings)

    // Create accommodation plan
    const plan = UniversalAccessibilitySystem.createAccommodationPlan(profile.id, [
      {
        type: 'extended_time',
        description: 'Additional time for assignments and tests (1.5x standard time)',
        implementation: 'Automatic extension applied to all timed activities',
        resources: ['timer_system', 'notification_alerts'],
        timeline: 'immediate',
        responsible: 'accessibility_coordinator',
        monitoring: { frequency: 'weekly', metrics: ['completion_rate', 'stress_level'] }
      },
      {
        type: 'alternative_formats',
        description: 'All materials provided in large text and audio formats',
        implementation: 'Automatic conversion of content to accessible formats',
        resources: ['text_to_speech', 'large_print_converter', 'audio_recorder'],
        timeline: 'immediate',
        responsible: 'assistive_technology_specialist',
        monitoring: { frequency: 'bi_weekly', metrics: ['usage_rate', 'comprehension_level'] }
      },
      {
        type: 'assistive_technology',
        description: 'Screen reader and voice control integration',
        implementation: 'Full integration with NVDA and Dragon NaturallySpeaking',
        resources: ['screen_reader_software', 'voice_recognition_system', 'training_materials'],
        timeline: 'immediate',
        responsible: 'assistive_technology_specialist',
        monitoring: { frequency: 'weekly', metrics: ['usage_frequency', 'error_rate', 'efficiency'] }
      }
    ])
    setAccommodationPlan(plan)

    // Create assessment data
    const assessment = UniversalAccessibilitySystem.assessAccessibilityNeeds({
      userId: userId,
      assessor: 'accessibility_specialist',
      assessmentType: 'COMPREHENSIVE',
      visionLevel: 'low_vision',
      colorVision: 'normal',
      hearingLevel: 'normal',
      mobility: 'limited',
      dexterity: 'reduced',
      attention: 'difficulty_focusing',
      memory: 'working_memory_issues',
      processing: 'slower_processing',
      learningStyle: 'visual_auditory',
      processingSpeed: 'below_average'
    })
    setAssessmentData(assessment)

    // Monitor effectiveness
    const effectiveness = UniversalAccessibilitySystem.monitorAccessibilityEffectiveness(profile.id, '30_days')
    setEffectivenessData(effectiveness)
  }

  const updateAccessibilitySetting = (category, feature, value) => {
    setCurrentSettings(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [category]: {
          ...prev.settings[category],
          [feature]: { ...prev.settings[category][feature], ...value }
        }
      }
    }))
  }

  const toggleFeature = (category, feature) => {
    const currentValue = currentSettings?.settings?.[category]?.[feature]?.enabled || false
    updateAccessibilitySetting(category, feature, { enabled: !currentValue })
  }

  const renderProfile = () => (
    <div className="profile-section">
      <div className="section-header">
        <h3>Accessibility Profile</h3>
        <button className="edit-profile-btn">✏️ Edit Profile</button>
      </div>

      {accessibilityProfile && (
        <div className="profile-content">
          <div className="profile-overview">
            <div className="profile-card">
              <h4>Basic Information</h4>
              <div className="profile-details">
                <div className="detail-item">
                  <label>Profile Type:</label>
                  <span>{accessibilityProfile.profileType}</span>
                </div>
                <div className="detail-item">
                  <label>Created:</label>
                  <span>{accessibilityProfile.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Last Updated:</label>
                  <span>{accessibilityProfile.lastUpdated.toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Next Review:</label>
                  <span>{accessibilityProfile.reviewSchedule.nextReview.toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="profile-card">
              <h4>Accessibility Needs</h4>
              <div className="needs-list">
                {accessibilityProfile.accessibilityNeeds.map((need, index) => (
                  <span key={index} className="need-tag">{need.replace('_', ' ')}</span>
                ))}
              </div>
            </div>

            <div className="profile-card">
              <h4>Assistive Technology</h4>
              <div className="tech-list">
                {accessibilityProfile.assistiveTechnology.map((tech, index) => (
                  <div key={index} className="tech-item">
                    <span className="tech-name">{tech.replace('_', ' ')}</span>
                    <span className="tech-status">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="learning-profile">
            <h4>Learning Profile</h4>
            <div className="learning-details">
              <div className="learning-item">
                <label>Preferred Modalities:</label>
                <div className="modalities">
                  {accessibilityProfile.learningProfile.preferredModalities.map((modality, index) => (
                    <span key={index} className="modality-tag">{modality}</span>
                  ))}
                </div>
              </div>
              <div className="learning-item">
                <label>Processing Speed:</label>
                <span className="processing-speed">{accessibilityProfile.learningProfile.processingSpeed}</span>
              </div>
              <div className="learning-item">
                <label>Attention Span:</label>
                <span className="attention-span">{accessibilityProfile.learningProfile.attentionSpan}</span>
              </div>
            </div>
          </div>

          <div className="support-team">
            <h4>Support Team</h4>
            <div className="team-members">
              {accessibilityProfile.supportTeam.map((member, index) => (
                <div key={index} className="team-member">
                  <span className="member-role">{member.replace('_', ' ')}</span>
                  <button className="contact-btn">Contact</button>
                </div>
              ))}
            </div>
          </div>

          <div className="emergency-contacts">
            <h4>Emergency Contacts</h4>
            <div className="contacts-list">
              {accessibilityProfile.emergencyContacts.map((contact, index) => (
                <div key={index} className="contact-item">
                  <div className="contact-info">
                    <span className="contact-name">{contact.name}</span>
                    <span className="contact-relationship">{contact.relationship}</span>
                  </div>
                  <span className="contact-phone">{contact.phone}</span>
                  <button className="contact-btn">Call</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderSettings = () => (
    <div className="settings-section">
      <div className="section-header">
        <h3>Accessibility Settings</h3>
        <button className="reset-settings-btn">🔄 Reset to Defaults</button>
      </div>

      {currentSettings && (
        <div className="settings-content">
          {Object.entries(UniversalAccessibilitySystem.ACCESSIBILITY_FEATURES).map(([categoryKey, category]) => (
            <div key={categoryKey} className="settings-category">
              <h4>{category.name}</h4>
              <div className="features-grid">
                {Object.entries(category.features).map(([featureKey, feature]) => {
                  const currentFeature = currentSettings.settings[categoryKey]?.[featureKey] || feature
                  return (
                    <div key={featureKey} className="feature-setting">
                      <div className="feature-header">
                        <label className="feature-label">{featureKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                        <button
                          className={`toggle-btn ${currentFeature.enabled ? 'enabled' : 'disabled'}`}
                          onClick={() => toggleFeature(categoryKey, featureKey)}
                        >
                          {currentFeature.enabled ? '✓' : '✗'}
                        </button>
                      </div>
                      {currentFeature.enabled && (
                        <div className="feature-controls">
                          {Object.entries(currentFeature).map(([controlKey, controlValue]) => {
                            if (controlKey === 'enabled') return null
                            return (
                              <div key={controlKey} className="control-item">
                                <label>{controlKey.replace(/([A-Z])/g, ' $1')}: </label>
                                {typeof controlValue === 'boolean' ? (
                                  <input
                                    type="checkbox"
                                    checked={controlValue}
                                    onChange={(e) => updateAccessibilitySetting(categoryKey, featureKey, { [controlKey]: e.target.checked })}
                                  />
                                ) : typeof controlValue === 'number' ? (
                                  <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.1"
                                    value={controlValue}
                                    onChange={(e) => updateAccessibilitySetting(categoryKey, featureKey, { [controlKey]: parseFloat(e.target.value) })}
                                  />
                                ) : (
                                  <select
                                    value={controlValue}
                                    onChange={(e) => updateAccessibilitySetting(categoryKey, featureKey, { [controlKey]: e.target.value })}
                                  >
                                    <option value={controlValue}>{controlValue}</option>
                                  </select>
                                )}
                                <span className="control-value">{controlValue}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAccommodations = () => (
    <div className="accommodations-section">
      <div className="section-header">
        <h3>Accommodation Plan</h3>
        <span className="plan-status">
          {accommodationPlan ? `Status: ${accommodationPlan.status}` : 'No active plan'}
        </span>
      </div>

      {accommodationPlan && (
        <div className="accommodations-content">
          <div className="plan-overview">
            <div className="plan-meta">
              <span className="created">Created: {accommodationPlan.createdAt.toLocaleDateString()}</span>
              <span className="review">Next Review: {accommodationPlan.reviewSchedule.nextReview.toLocaleDateString()}</span>
              <span className="frequency">Review Frequency: {accommodationPlan.reviewSchedule.frequency}</span>
            </div>
          </div>

          <div className="accommodations-list">
            <h4>Active Accommodations</h4>
            {accommodationPlan.accommodations.map(accommodation => (
              <div key={accommodation.id} className="accommodation-item">
                <div className="accommodation-header">
                  <h5>{accommodation.type.replace('_', ' ')}</h5>
                  <span className="timeline">{accommodation.timeline}</span>
                </div>
                <p className="accommodation-description">{accommodation.description}</p>
                <div className="accommodation-details">
                  <div className="implementation">
                    <label>Implementation:</label>
                    <span>{accommodation.implementation}</span>
                  </div>
                  <div className="responsible">
                    <label>Responsible:</label>
                    <span>{accommodation.responsible.replace('_', ' ')}</span>
                  </div>
                  <div className="monitoring">
                    <label>Monitoring:</label>
                    <span>{accommodation.monitoring.frequency} reviews</span>
                  </div>
                </div>
                <div className="accommodation-resources">
                  <label>Resources:</label>
                  <div className="resources-list">
                    {accommodation.resources.map((resource, index) => (
                      <span key={index} className="resource-tag">{resource.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
                <div className="accommodation-effectiveness">
                  <label>Effectiveness:</label>
                  <div className="effectiveness-rating">
                    {accommodation.effectiveness.rating ? (
                      <span className="rating">{accommodation.effectiveness.rating}/10</span>
                    ) : (
                      <span className="no-rating">Not yet rated</span>
                    )}
                    <button className="rate-btn">Rate Effectiveness</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="support-team">
            <h4>Support Team</h4>
            <div className="team-grid">
              {accommodationPlan.supportTeam.map((member, index) => (
                <div key={index} className="team-member-card">
                  <span className="member-role">{member.replace('_', ' ')}</span>
                  <div className="member-actions">
                    <button className="contact-btn">Contact</button>
                    <button className="schedule-btn">Schedule Meeting</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAssessment = () => (
    <div className="assessment-section">
      <div className="section-header">
        <h3>Accessibility Assessment</h3>
        <button className="new-assessment-btn">📋 New Assessment</button>
      </div>

      {assessmentData && (
        <div className="assessment-content">
          <div className="assessment-overview">
            <div className="assessment-meta">
              <span className="assessor">Assessor: {assessmentData.assessor.replace('_', ' ')}</span>
              <span className="date">Date: {assessmentData.assessmentDate.toLocaleDateString()}</span>
              <span className="type">Type: {assessmentData.assessmentType}</span>
              <span className="priority">Priority: {assessmentData.priorityLevel}</span>
            </div>
          </div>

          <div className="assessment-findings">
            <h4>Assessment Findings</h4>
            <div className="findings-grid">
              {Object.entries(assessmentData.findings).map(([category, findings]) => (
                <div key={category} className="findings-category">
                  <h5>{category.replace('Needs', '').replace(/([A-Z])/g, ' $1').trim()}</h5>
                  <div className="findings-details">
                    {Object.entries(findings).map(([key, value]) => {
                      if (key === 'recommendations') return null
                      return (
                        <div key={key} className="finding-item">
                          <label>{key.replace(/([A-Z])/g, ' $1')}: </label>
                          <span className={`finding-value ${value.replace('_', '-')}`}>{value.replace('_', ' ')}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="assessment-recommendations">
            <h4>Recommendations</h4>
            <div className="recommendations-list">
              {assessmentData.recommendations.map((rec, index) => (
                <div key={index} className={`recommendation-item ${rec.priority.toLowerCase()}`}>
                  <div className="recommendation-header">
                    <span className="category">{rec.category}</span>
                    <span className="priority">{rec.priority}</span>
                  </div>
                  <p className="recommendation-text">{rec.recommendation}</p>
                  <div className="recommendation-meta">
                    <span className="implementation">Implementation: {rec.implementation}</span>
                  </div>
                  <button className="implement-btn">Implement</button>
                </div>
              ))}
            </div>
          </div>

          <div className="implementation-plan">
            <h4>Implementation Plan</h4>
            <div className="plan-phases">
              {assessmentData.implementationPlan.phases.map((phase, index) => (
                <div key={index} className="phase-item">
                  <div className="phase-header">
                    <span className="phase-number">Phase {phase.phase}</span>
                    <span className="timeline">{phase.timeline}</span>
                  </div>
                  <div className="phase-actions">
                    {phase.actions.map((action, actionIndex) => (
                      <span key={actionIndex} className="action-tag">{action.replace('_', ' ')}</span>
                    ))}
                  </div>
                  <div className="phase-resources">
                    <label>Resources:</label>
                    {phase.resources.map((resource, resourceIndex) => (
                      <span key={resourceIndex} className="resource-tag">{resource.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderEffectiveness = () => (
    <div className="effectiveness-section">
      <div className="section-header">
        <h3>Effectiveness Monitoring</h3>
        <select className="timeframe-selector">
          <option value="7_days">Last 7 Days</option>
          <option value="30_days" selected>Last 30 Days</option>
          <option value="90_days">Last 90 Days</option>
        </select>
      </div>

      {effectivenessData && (
        <div className="effectiveness-content">
          <div className="metrics-overview">
            <div className="metric-card">
              <h4>User Satisfaction</h4>
              <div className="metric-value">
                <span className="value">{effectivenessData.metrics.userSatisfaction.overallSatisfaction}/10</span>
                <span className="label">Overall Rating</span>
              </div>
            </div>

            <div className="metric-card">
              <h4>Performance Impact</h4>
              <div className="metric-value">
                <span className="value">{effectivenessData.metrics.performanceImpact.taskCompletionRate}%</span>
                <span className="label">Task Completion</span>
              </div>
            </div>

            <div className="metric-card">
              <h4>Independence Level</h4>
              <div className="metric-value">
                <span className="value">{effectivenessData.metrics.performanceImpact.independenceLevel}%</span>
                <span className="label">Independence</span>
              </div>
            </div>

            <div className="metric-card">
              <h4>Error Reduction</h4>
              <div className="metric-value">
                <span className="value">{effectivenessData.metrics.performanceImpact.errorReduction}%</span>
                <span className="label">Fewer Errors</span>
              </div>
            </div>
          </div>

          <div className="usage-insights">
            <div className="insights-grid">
              <div className="insight-card">
                <h4>Most Used Features</h4>
                <div className="features-list">
                  {effectivenessData.insights.mostUsedFeatures.map((feature, index) => (
                    <div key={index} className="feature-item">
                      <span className="feature-name">{feature.replace('_', ' ')}</span>
                      <span className="usage-frequency">Daily</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="insight-card">
                <h4>Least Used Features</h4>
                <div className="features-list">
                  {effectivenessData.insights.leastUsedFeatures.map((feature, index) => (
                    <div key={index} className="feature-item">
                      <span className="feature-name">{feature.replace('_', ' ')}</span>
                      <span className="usage-frequency">Rarely</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="insight-card">
                <h4>Improvement Areas</h4>
                <div className="improvements-list">
                  {effectivenessData.insights.improvementAreas.map((area, index) => (
                    <div key={index} className="improvement-item">
                      <span className="area-name">{area.replace('_', ' ')}</span>
                      <button className="improve-btn">Address</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="recommendations">
            <h4>Recommendations</h4>
            <div className="recommendations-grid">
              <div className="recommendation-category">
                <h5>Adjustments</h5>
                <div className="recommendations-list">
                  {effectivenessData.recommendations.adjustments.map((adjustment, index) => (
                    <div key={index} className="recommendation-item">
                      <span className="recommendation-text">{adjustment.replace('_', ' ')}</span>
                      <button className="apply-btn">Apply</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="recommendation-category">
                <h5>New Features</h5>
                <div className="recommendations-list">
                  {effectivenessData.recommendations.newFeatures.map((feature, index) => (
                    <div key={index} className="recommendation-item">
                      <span className="recommendation-text">{feature.replace('_', ' ')}</span>
                      <button className="request-btn">Request</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="recommendation-category">
                <h5>Training Needs</h5>
                <div className="recommendations-list">
                  {effectivenessData.recommendations.training.map((training, index) => (
                    <div key={index} className="recommendation-item">
                      <span className="recommendation-text">{training.replace('_', ' ')}</span>
                      <button className="schedule-training-btn">Schedule</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="accessibility-dashboard">
      <div className="dashboard-header">
        <h2>♿ Accessibility Dashboard</h2>
        <p>Comprehensive accessibility support and customization</p>
      </div>

      <div className="dashboard-navigation">
        <button
          className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
        <button
          className={`nav-tab ${activeTab === 'accommodations' ? 'active' : ''}`}
          onClick={() => setActiveTab('accommodations')}
        >
          📋 Accommodations
        </button>
        <button
          className={`nav-tab ${activeTab === 'assessment' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessment')}
        >
          🔍 Assessment
        </button>
        <button
          className={`nav-tab ${activeTab === 'effectiveness' ? 'active' : ''}`}
          onClick={() => setActiveTab('effectiveness')}
        >
          📊 Effectiveness
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'accommodations' && renderAccommodations()}
        {activeTab === 'assessment' && renderAssessment()}
        {activeTab === 'effectiveness' && renderEffectiveness()}
      </div>

      <style jsx>{`
        .accessibility-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          color: white;
          border-radius: 12px;
        }

        .dashboard-header h2 {
          margin: 0 0 10px 0;
          font-size: 2.5em;
        }

        .dashboard-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1em;
        }

        .dashboard-navigation {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
          flex-wrap: wrap;
        }

        .nav-tab {
          padding: 12px 20px;
          border: none;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 120px;
        }

        .nav-tab:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .nav-tab.active {
          background: #8b5cf6;
          color: white;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }

        .section-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.5em;
        }

        .profile-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .profile-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .profile-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .profile-card h4 {
          margin: 0 0 15px 0;
          color: #1f2937;
          font-size: 1.2em;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .profile-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-item label {
          font-weight: 500;
          color: #6b7280;
        }

        .detail-item span {
          color: #1f2937;
        }

        .needs-list, .modalities {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .need-tag, .modality-tag {
          padding: 4px 12px;
          background: #ddd6fe;
          color: #5b21b6;
          border-radius: 20px;
          font-size: 0.9em;
          font-weight: 500;
        }

        .tech-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tech-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f3f4f6;
          border-radius: 8px;
        }

        .tech-status {
          padding: 2px 8px;
          background: #d1fae5;
          color: #065f46;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: 500;
        }

        .learning-profile {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .learning-details {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .learning-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .learning-item label {
          font-weight: 500;
          color: #6b7280;
        }

        .support-team, .emergency-contacts {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .team-members, .contacts-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .team-member, .contact-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .contact-name {
          font-weight: 500;
          color: #1f2937;
        }

        .contact-relationship {
          font-size: 0.9em;
          color: #6b7280;
        }

        .contact-btn, .edit-profile-btn, .reset-settings-btn, .new-assessment-btn {
          padding: 8px 16px;
          border: 1px solid #8b5cf6;
          background: white;
          color: #8b5cf6;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .contact-btn:hover, .edit-profile-btn:hover, .reset-settings-btn:hover, .new-assessment-btn:hover {
          background: #8b5cf6;
          color: white;
        }

        .settings-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .settings-category {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .settings-category h4 {
          margin: 0 0 20px 0;
          color: #1f2937;
          font-size: 1.3em;
          border-bottom: 2px solid #8b5cf6;
          padding-bottom: 10px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .feature-setting {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          background: #f9fafb;
        }

        .feature-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .feature-label {
          font-weight: 500;
          color: #1f2937;
        }

        .toggle-btn {
          width: 40px;
          height: 24px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .toggle-btn.enabled {
          background: #10b981;
          color: white;
        }

        .toggle-btn.disabled {
          background: #ef4444;
          color: white;
        }

        .feature-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
        }

        .control-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9em;
        }

        .control-item label {
          min-width: 100px;
          color: #6b7280;
        }

        .control-item input, .control-item select {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }

        .control-value {
          min-width: 60px;
          color: #1f2937;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .dashboard-navigation {
            flex-direction: column;
          }

          .nav-tab {
            min-width: auto;
          }

          .profile-overview {
            grid-template-columns: 1fr;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default AccessibilityDashboard
