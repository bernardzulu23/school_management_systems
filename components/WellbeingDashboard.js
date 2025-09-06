import React, { useState, useEffect } from 'react'
import { WellbeingMonitoringSystem } from '../lib/wellbeingMonitoringSystem'

const WellbeingDashboard = ({ userRole, userId }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [wellbeingProfile, setWellbeingProfile] = useState(null)
  const [currentAssessment, setCurrentAssessment] = useState(null)
  const [interventionPlan, setInterventionPlan] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [assessmentHistory, setAssessmentHistory] = useState([])

  useEffect(() => {
    initializeWellbeingData()
  }, [userId])

  const initializeWellbeingData = () => {
    // Create wellbeing profile
    const profile = WellbeingMonitoringSystem.createWellbeingProfile({
      studentId: userId,
      privacyLevel: 'CONFIDENTIAL',
      consentGiven: true,
      parentalConsent: userRole === 'student',
      emergencyContacts: [
        { name: 'Parent/Guardian', phone: '+1-555-0123', relationship: 'parent' },
        { name: 'School Counselor', phone: '+1-555-0456', relationship: 'counselor' }
      ],
      communicationMethod: 'in_person',
      supportType: 'counseling',
      anonymousReporting: true
    })
    setWellbeingProfile(profile)

    // Create sample assessment
    const assessment = WellbeingMonitoringSystem.assessWellbeing(profile.id, {
      type: 'SELF_REPORT',
      source: 'student',
      responses: {
        assignment_load: 65,
        exam_pressure: 70,
        grade_anxiety: 60,
        time_management: 45,
        peer_interaction: 75,
        group_participation: 80,
        communication_frequency: 70,
        isolation_indicators: 30,
        mood_patterns: 60,
        anxiety_levels: 55,
        motivation: 70,
        self_esteem: 65,
        sleep_patterns: 50,
        energy_levels: 60,
        physical_activity: 40,
        health_complaints: 35,
        attendance: 85,
        punctuality: 90,
        participation: 75,
        behavioral_changes: 40
      },
      confidentialityLevel: 'CONFIDENTIAL'
    })
    setCurrentAssessment(assessment)

    // Create intervention plan if needed
    if (assessment.recommendations.length > 0) {
      const plan = WellbeingMonitoringSystem.createInterventionPlan(
        assessment.id,
        assessment.recommendations
      )
      setInterventionPlan(plan)
    }

    // Generate progress data
    const progress = WellbeingMonitoringSystem.monitorProgress(profile.id, '30_days')
    setProgressData(progress)

    // Create sample alerts
    const sampleAlerts = [
      WellbeingMonitoringSystem.createWellnessAlert({
        profileId: profile.id,
        type: 'RISK_INCREASE',
        severity: 'MEDIUM',
        message: 'Academic stress levels have increased over the past week',
        indicators: ['ACADEMIC_STRESS'],
        recommendedActions: ['schedule_counseling', 'stress_management_workshop'],
        assignedTo: ['school_counselor'],
        escalationLevel: 2,
        privacyLevel: 'CONFIDENTIAL'
      }),
      WellbeingMonitoringSystem.createWellnessAlert({
        profileId: profile.id,
        type: 'IMPROVEMENT',
        severity: 'LOW',
        message: 'Social engagement has shown positive improvement',
        indicators: ['SOCIAL_ENGAGEMENT'],
        recommendedActions: ['continue_current_activities'],
        assignedTo: ['wellbeing_coordinator'],
        escalationLevel: 1,
        privacyLevel: 'CONFIDENTIAL'
      })
    ]
    setAlerts(sampleAlerts)

    // Mock assessment history
    setAssessmentHistory([
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), score: 58, riskLevel: 'MODERATE' },
      { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), score: 62, riskLevel: 'MODERATE' },
      { date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), score: 55, riskLevel: 'MODERATE' },
      { date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), score: 60, riskLevel: 'MODERATE' }
    ])
  }

  const takeNewAssessment = () => {
    // In production, this would open an assessment form
    const newAssessment = WellbeingMonitoringSystem.assessWellbeing(wellbeingProfile.id, {
      type: 'SELF_REPORT',
      source: 'student',
      responses: {
        assignment_load: Math.floor(Math.random() * 100),
        exam_pressure: Math.floor(Math.random() * 100),
        grade_anxiety: Math.floor(Math.random() * 100),
        time_management: Math.floor(Math.random() * 100),
        peer_interaction: Math.floor(Math.random() * 100),
        group_participation: Math.floor(Math.random() * 100),
        communication_frequency: Math.floor(Math.random() * 100),
        isolation_indicators: Math.floor(Math.random() * 100),
        mood_patterns: Math.floor(Math.random() * 100),
        anxiety_levels: Math.floor(Math.random() * 100),
        motivation: Math.floor(Math.random() * 100),
        self_esteem: Math.floor(Math.random() * 100),
        sleep_patterns: Math.floor(Math.random() * 100),
        energy_levels: Math.floor(Math.random() * 100),
        physical_activity: Math.floor(Math.random() * 100),
        health_complaints: Math.floor(Math.random() * 100),
        attendance: Math.floor(Math.random() * 100),
        punctuality: Math.floor(Math.random() * 100),
        participation: Math.floor(Math.random() * 100),
        behavioral_changes: Math.floor(Math.random() * 100)
      }
    })
    setCurrentAssessment(newAssessment)

    // Update history
    setAssessmentHistory(prev => [
      { date: new Date(), score: newAssessment.overallScore, riskLevel: newAssessment.riskLevel },
      ...prev.slice(0, 9)
    ])
  }

  const scheduleIntervention = (interventionId) => {
    // In production, this would schedule the intervention
    console.log('Scheduling intervention:', interventionId)
  }

  const contactSupport = (supportType) => {
    // In production, this would initiate contact with support team
    console.log('Contacting support:', supportType)
  }

  const renderOverview = () => (
    <div className="wellbeing-overview">
      <div className="overview-cards">
        <div className="wellbeing-card overall-score">
          <div className="card-header">
            <h3>Overall Wellbeing</h3>
            <span className={`risk-level ${currentAssessment?.riskLevel?.toLowerCase()}`}>
              {currentAssessment?.riskLevel || 'UNKNOWN'}
            </span>
          </div>
          <div className="score-display">
            <div className="score-circle">
              <span className="score-number">{currentAssessment?.overallScore || 0}</span>
              <span className="score-label">/ 100</span>
            </div>
            <div className="score-trend">
              <span className="trend-indicator">📈 Stable</span>
              <span className="last-updated">Last updated: {currentAssessment?.timestamp?.toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="wellbeing-card quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button onClick={takeNewAssessment} className="action-btn primary">
              📝 Take Assessment
            </button>
            <button onClick={() => contactSupport('counselor')} className="action-btn">
              💬 Talk to Counselor
            </button>
            <button onClick={() => contactSupport('peer')} className="action-btn">
              👥 Peer Support
            </button>
            <button className="action-btn">
              📚 Wellness Resources
            </button>
          </div>
        </div>

        <div className="wellbeing-card alerts-summary">
          <h3>Recent Alerts</h3>
          <div className="alerts-list">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className={`alert-item ${alert.severity.toLowerCase()}`}>
                <div className="alert-content">
                  <span className="alert-type">{alert.type.replace('_', ' ')}</span>
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-time">{alert.timestamp.toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="indicators-grid">
        {Object.entries(currentAssessment?.indicators || {}).map(([key, indicator]) => (
          <div key={key} className="indicator-card">
            <div className="indicator-header">
              <h4>{WellbeingMonitoringSystem.WELLBEING_INDICATORS[key]?.name}</h4>
              <span className={`indicator-score ${this.getScoreClass(indicator.score)}`}>
                {indicator.score}
              </span>
            </div>
            <div className="indicator-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${indicator.score}%` }}
                ></div>
              </div>
            </div>
            <div className="indicator-trend">
              <span className={`trend ${indicator.trend}`}>
                {indicator.trend === 'improving' ? '📈' : indicator.trend === 'declining' ? '📉' : '➡️'}
                {indicator.trend}
              </span>
            </div>
            {indicator.alerts?.length > 0 && (
              <div className="indicator-alerts">
                {indicator.alerts.map((alert, index) => (
                  <span key={index} className="alert-badge">{alert.type}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderAssessments = () => (
    <div className="assessments-section">
      <div className="section-header">
        <h3>Wellbeing Assessments</h3>
        <button onClick={takeNewAssessment} className="take-assessment-btn">
          📝 Take New Assessment
        </button>
      </div>

      <div className="current-assessment">
        <h4>Latest Assessment Results</h4>
        {currentAssessment ? (
          <div className="assessment-details">
            <div className="assessment-summary">
              <div className="summary-item">
                <label>Overall Score:</label>
                <span className="score">{currentAssessment.overallScore}/100</span>
              </div>
              <div className="summary-item">
                <label>Risk Level:</label>
                <span className={`risk-level ${currentAssessment.riskLevel.toLowerCase()}`}>
                  {currentAssessment.riskLevel}
                </span>
              </div>
              <div className="summary-item">
                <label>Assessment Date:</label>
                <span>{currentAssessment.timestamp.toLocaleDateString()}</span>
              </div>
              <div className="summary-item">
                <label>Follow-up Required:</label>
                <span className={currentAssessment.followUpRequired ? 'required' : 'not-required'}>
                  {currentAssessment.followUpRequired ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="recommendations">
              <h5>Recommendations</h5>
              {currentAssessment.recommendations.length > 0 ? (
                <div className="recommendations-list">
                  {currentAssessment.recommendations.map((rec, index) => (
                    <div key={index} className={`recommendation-item ${rec.priority.toLowerCase()}`}>
                      <div className="recommendation-content">
                        <span className="recommendation-type">{rec.type.replace('_', ' ')}</span>
                        <p className="recommendation-description">{rec.description}</p>
                        <div className="recommendation-meta">
                          <span className="priority">Priority: {rec.priority}</span>
                          <span className="timeframe">Timeframe: {rec.timeframe}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => scheduleIntervention(rec.type)}
                        className="schedule-btn"
                      >
                        Schedule
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-recommendations">No specific recommendations at this time. Continue with regular wellness practices.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="no-assessment">
            <p>No assessment data available. Take your first wellbeing assessment to get started.</p>
            <button onClick={takeNewAssessment} className="start-assessment-btn">
              Start Assessment
            </button>
          </div>
        )}
      </div>

      <div className="assessment-history">
        <h4>Assessment History</h4>
        <div className="history-chart">
          <div className="chart-container">
            {assessmentHistory.map((assessment, index) => (
              <div key={index} className="history-point">
                <div
                  className="point"
                  style={{
                    height: `${assessment.score}%`,
                    backgroundColor: this.getRiskColor(assessment.riskLevel)
                  }}
                ></div>
                <span className="date">{assessment.date.toLocaleDateString()}</span>
                <span className="score">{assessment.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderInterventions = () => (
    <div className="interventions-section">
      <div className="section-header">
        <h3>Intervention Plan</h3>
        <span className="plan-status">
          {interventionPlan ? `Status: ${interventionPlan.status}` : 'No active plan'}
        </span>
      </div>

      {interventionPlan ? (
        <div className="intervention-plan">
          <div className="plan-overview">
            <div className="plan-meta">
              <span className="priority">Priority: {interventionPlan.priority}</span>
              <span className="created">Created: {interventionPlan.createdAt.toLocaleDateString()}</span>
              <span className="review">Next Review: {interventionPlan.reviewSchedule.nextReview.toLocaleDateString()}</span>
            </div>
          </div>

          <div className="interventions-list">
            <h4>Active Interventions</h4>
            {interventionPlan.interventions.map(intervention => (
              <div key={intervention.id} className="intervention-item">
                <div className="intervention-header">
                  <h5>{intervention.type.replace('_', ' ')}</h5>
                  <span className={`status ${intervention.status.toLowerCase()}`}>
                    {intervention.status}
                  </span>
                </div>
                <p className="intervention-description">{intervention.description}</p>
                <div className="intervention-details">
                  <span className="assigned-to">Assigned to: {intervention.assignedTo}</span>
                  <span className="due-date">Due: {intervention.dueDate.toLocaleDateString()}</span>
                </div>
                <div className="intervention-progress">
                  <div className="progress-info">
                    <span>Progress: {intervention.progress.started ? 'Started' : 'Not Started'}</span>
                    {intervention.progress.effectiveness && (
                      <span>Effectiveness: {intervention.progress.effectiveness}/10</span>
                    )}
                  </div>
                  <div className="intervention-actions">
                    <button onClick={() => scheduleIntervention(intervention.id)}>
                      Schedule Session
                    </button>
                    <button>View Resources</button>
                    <button>Add Notes</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="support-team">
            <h4>Support Team</h4>
            <div className="team-members">
              {interventionPlan.supportTeam.map((member, index) => (
                <div key={index} className="team-member">
                  <span className="member-role">{member.replace('_', ' ')}</span>
                  <button onClick={() => contactSupport(member)}>Contact</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-intervention-plan">
          <p>No active intervention plan. Based on your current wellbeing assessment, you may not need specific interventions at this time.</p>
          <button onClick={() => contactSupport('counselor')}>
            Speak with Counselor
          </button>
        </div>
      )}
    </div>
  )

  const renderProgress = () => (
    <div className="progress-section">
      <div className="section-header">
        <h3>Progress Monitoring</h3>
        <select className="timeframe-selector">
          <option value="7_days">Last 7 Days</option>
          <option value="30_days" selected>Last 30 Days</option>
          <option value="90_days">Last 90 Days</option>
        </select>
      </div>

      {progressData && (
        <div className="progress-content">
          <div className="progress-metrics">
            <div className="metric-card">
              <h4>Overall Improvement</h4>
              <div className="metric-value">
                <span className="value">{progressData.progressMetrics.overallImprovement.overallChange}%</span>
                <span className="trend">{progressData.progressMetrics.overallImprovement.trendDirection}</span>
              </div>
            </div>

            <div className="metric-card">
              <h4>Risk Level Changes</h4>
              <div className="metric-value">
                <span className="from">{progressData.progressMetrics.riskLevelChanges.initialRisk}</span>
                <span className="arrow">→</span>
                <span className="to">{progressData.progressMetrics.riskLevelChanges.currentRisk}</span>
              </div>
            </div>

            <div className="metric-card">
              <h4>Intervention Effectiveness</h4>
              <div className="metric-value">
                <span className="value">{progressData.progressMetrics.interventionEffectiveness.effectivenessRate}%</span>
                <span className="completed">{progressData.progressMetrics.interventionEffectiveness.completedInterventions} completed</span>
              </div>
            </div>
          </div>

          <div className="insights">
            <div className="positive-factors">
              <h4>Positive Factors</h4>
              <div className="factors-list">
                {progressData.insights.positiveFactors.map((factor, index) => (
                  <span key={index} className="factor positive">{factor.replace('_', ' ')}</span>
                ))}
              </div>
            </div>

            <div className="concern-areas">
              <h4>Areas of Concern</h4>
              <div className="factors-list">
                {progressData.insights.concernAreas.map((area, index) => (
                  <span key={index} className="factor concern">{area.replace('_', ' ')}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="next-steps">
            <h4>Next Steps</h4>
            <div className="steps-list">
              <div className="step-category">
                <h5>Immediate Actions</h5>
                <ul>
                  {progressData.nextSteps.immediateActions.map((action, index) => (
                    <li key={index}>{action.replace('_', ' ')}</li>
                  ))}
                </ul>
              </div>
              <div className="step-category">
                <h5>Short-term Goals</h5>
                <ul>
                  {progressData.nextSteps.shortTermGoals.map((goal, index) => (
                    <li key={index}>{goal.replace('_', ' ')}</li>
                  ))}
                </ul>
              </div>
              <div className="step-category">
                <h5>Long-term Objectives</h5>
                <ul>
                  {progressData.nextSteps.longTermObjectives.map((objective, index) => (
                    <li key={index}>{objective.replace('_', ' ')}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderResources = () => (
    <div className="resources-section">
      <div className="section-header">
        <h3>Wellness Resources</h3>
      </div>

      <div className="resources-grid">
        <div className="resource-category">
          <h4>🧘 Mental Health</h4>
          <div className="resource-items">
            <div className="resource-item">
              <h5>Mindfulness Exercises</h5>
              <p>Guided meditation and breathing exercises</p>
              <button>Access Now</button>
            </div>
            <div className="resource-item">
              <h5>Stress Management</h5>
              <p>Techniques for managing academic stress</p>
              <button>Learn More</button>
            </div>
            <div className="resource-item">
              <h5>Crisis Support</h5>
              <p>24/7 crisis hotline and emergency resources</p>
              <button className="emergency">Emergency Contact</button>
            </div>
          </div>
        </div>

        <div className="resource-category">
          <h4>📚 Academic Support</h4>
          <div className="resource-items">
            <div className="resource-item">
              <h5>Study Skills</h5>
              <p>Time management and study strategies</p>
              <button>View Guide</button>
            </div>
            <div className="resource-item">
              <h5>Tutoring Services</h5>
              <p>One-on-one academic support</p>
              <button>Schedule Session</button>
            </div>
            <div className="resource-item">
              <h5>Test Anxiety</h5>
              <p>Strategies for managing exam stress</p>
              <button>Get Help</button>
            </div>
          </div>
        </div>

        <div className="resource-category">
          <h4>👥 Social Support</h4>
          <div className="resource-items">
            <div className="resource-item">
              <h5>Peer Support Groups</h5>
              <p>Connect with other students</p>
              <button>Join Group</button>
            </div>
            <div className="resource-item">
              <h5>Social Skills</h5>
              <p>Building healthy relationships</p>
              <button>Learn More</button>
            </div>
            <div className="resource-item">
              <h5>Conflict Resolution</h5>
              <p>Managing interpersonal challenges</p>
              <button>Get Support</button>
            </div>
          </div>
        </div>

        <div className="resource-category">
          <h4>💪 Physical Wellness</h4>
          <div className="resource-items">
            <div className="resource-item">
              <h5>Exercise Programs</h5>
              <p>Physical activity for mental health</p>
              <button>View Programs</button>
            </div>
            <div className="resource-item">
              <h5>Nutrition Guide</h5>
              <p>Healthy eating for better mood</p>
              <button>Read Guide</button>
            </div>
            <div className="resource-item">
              <h5>Sleep Hygiene</h5>
              <p>Improving sleep quality</p>
              <button>Learn Tips</button>
            </div>
          </div>
        </div>
      </div>

      <div className="emergency-contacts">
        <h4>Emergency Contacts</h4>
        <div className="contacts-list">
          <div className="contact-item">
            <span className="contact-name">School Counselor</span>
            <span className="contact-info">ext. 1234</span>
            <button>Call Now</button>
          </div>
          <div className="contact-item">
            <span className="contact-name">Crisis Hotline</span>
            <span className="contact-info">1-800-273-8255</span>
            <button className="emergency">Emergency Call</button>
          </div>
          <div className="contact-item">
            <span className="contact-name">Campus Security</span>
            <span className="contact-info">ext. 911</span>
            <button>Contact</button>
          </div>
        </div>
      </div>
    </div>
  )

  // Helper methods
  const getScoreClass = (score) => {
    if (score >= 80) return 'excellent'
    if (score >= 60) return 'good'
    if (score >= 40) return 'fair'
    return 'poor'
  }

  const getRiskColor = (riskLevel) => {
    const colors = {
      'LOW': '#10b981',
      'MODERATE': '#f59e0b',
      'HIGH': '#ef4444',
      'CRITICAL': '#dc2626'
    }
    return colors[riskLevel] || '#6b7280'
  }

  return (
    <div className="wellbeing-dashboard">
      <div className="dashboard-header">
        <h2>🌟 Wellbeing Dashboard</h2>
        <p>Monitor and support your mental health and wellness journey</p>
      </div>

      <div className="dashboard-navigation">
        <button
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`nav-tab ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessments')}
        >
          📝 Assessments
        </button>
        <button
          className={`nav-tab ${activeTab === 'interventions' ? 'active' : ''}`}
          onClick={() => setActiveTab('interventions')}
        >
          🎯 Interventions
        </button>
        <button
          className={`nav-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📈 Progress
        </button>
        <button
          className={`nav-tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          📚 Resources
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'assessments' && renderAssessments()}
        {activeTab === 'interventions' && renderInterventions()}
        {activeTab === 'progress' && renderProgress()}
        {activeTab === 'resources' && renderResources()}
      </div>

      <style jsx>{`
        .wellbeing-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        }

        .nav-tab:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .nav-tab.active {
          background: #3b82f6;
          color: white;
        }

        .wellbeing-overview {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .overview-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }

        .wellbeing-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .wellbeing-card h3 {
          margin: 0 0 15px 0;
          color: #1f2937;
          font-size: 1.2em;
        }

        .overall-score .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .risk-level {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: bold;
          text-transform: uppercase;
        }

        .risk-level.low {
          background: #d1fae5;
          color: #065f46;
        }

        .risk-level.moderate {
          background: #fef3c7;
          color: #92400e;
        }

        .risk-level.high {
          background: #fee2e2;
          color: #991b1b;
        }

        .risk-level.critical {
          background: #fecaca;
          color: #7f1d1d;
        }

        .score-display {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .score-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .score-number {
          font-size: 1.8em;
          font-weight: bold;
        }

        .score-label {
          font-size: 0.8em;
          opacity: 0.8;
        }

        .score-trend {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .trend-indicator {
          font-weight: 500;
          color: #059669;
        }

        .last-updated {
          font-size: 0.9em;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-btn {
          padding: 10px 15px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .action-btn:hover {
          background: #f9fafb;
          border-color: #3b82f6;
        }

        .action-btn.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .action-btn.primary:hover {
          background: #2563eb;
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .alert-item {
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .alert-item.low {
          background: #f0f9ff;
          border-color: #0ea5e9;
        }

        .alert-item.medium {
          background: #fffbeb;
          border-color: #f59e0b;
        }

        .alert-item.high {
          background: #fef2f2;
          border-color: #ef4444;
        }

        .alert-content {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .alert-type {
          font-weight: 500;
          font-size: 0.9em;
          text-transform: uppercase;
        }

        .alert-message {
          margin: 0;
          font-size: 0.9em;
          color: #4b5563;
        }

        .alert-time {
          font-size: 0.8em;
          color: #6b7280;
        }

        .indicators-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .indicator-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .indicator-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .indicator-header h4 {
          margin: 0;
          color: #1f2937;
          font-size: 1em;
        }

        .indicator-score {
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.9em;
        }

        .indicator-score.excellent {
          background: #d1fae5;
          color: #065f46;
        }

        .indicator-score.good {
          background: #dbeafe;
          color: #1e40af;
        }

        .indicator-score.fair {
          background: #fef3c7;
          color: #92400e;
        }

        .indicator-score.poor {
          background: #fee2e2;
          color: #991b1b;
        }

        .indicator-progress {
          margin-bottom: 10px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }

        .indicator-trend {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 10px;
        }

        .trend {
          font-size: 0.9em;
          font-weight: 500;
        }

        .trend.improving {
          color: #059669;
        }

        .trend.declining {
          color: #dc2626;
        }

        .trend.stable {
          color: #6b7280;
        }

        .indicator-alerts {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .alert-badge {
          padding: 2px 8px;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 12px;
          font-size: 0.7em;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .overview-cards {
            grid-template-columns: 1fr;
          }

          .dashboard-navigation {
            flex-wrap: wrap;
          }

          .indicators-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default WellbeingDashboard