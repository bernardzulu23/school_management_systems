import React, { useState, useEffect } from 'react'
import { WellbeingMonitoringSystem } from '../lib/wellbeingMonitoringSystem'

const MentalHealthSupportInterface = ({ userRole, userId }) => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [wellbeingProfile, setWellbeingProfile] = useState(null)
  const [currentAssessment, setCurrentAssessment] = useState(null)
  const [interventionPlans, setInterventionPlans] = useState([])
  const [supportResources, setSupportResources] = useState([])
  const [crisisProtocols, setCrisisProtocols] = useState(null)
  const [progressData, setProgressData] = useState(null)

  useEffect(() => {
    initializeMentalHealthData()
  }, [userId])

  const initializeMentalHealthData = () => {
    // Create wellbeing profile
    const profile = WellbeingMonitoringSystem.createWellbeingProfile({
      userId: userId,
      profileType: userRole.toUpperCase(),
      consentLevel: 'CONFIDENTIAL',
      emergencyContacts: [
        { name: 'School Counselor', phone: '+1-555-0123', relationship: 'counselor' },
        { name: 'Parent/Guardian', phone: '+1-555-0456', relationship: 'parent' },
        { name: 'Crisis Hotline', phone: '988', relationship: 'crisis_support' }
      ],
      supportTeam: ['school_counselor', 'mental_health_specialist', 'teacher', 'parent'],
      riskFactors: ['academic_stress', 'social_anxiety'],
      protectiveFactors: ['family_support', 'peer_relationships', 'extracurricular_activities'],
      previousHistory: {
        mentalHealthServices: false,
        medications: false,
        hospitalizations: false,
        traumaHistory: false
      },
      culturalConsiderations: {
        language: 'en',
        culturalBackground: 'diverse',
        religiousBeliefs: 'respectful_approach',
        familyDynamics: 'supportive'
      }
    })
    setWellbeingProfile(profile)

    // Create current assessment
    const assessment = WellbeingMonitoringSystem.assessWellbeing(profile.id, {
      type: 'SELF_REPORT',
      source: 'student',
      responses: {
        academicStress: 6,
        socialEngagement: 7,
        emotionalWellbeing: 5,
        physicalHealth: 8,
        behavioralPatterns: 6
      },
      confidentialityLevel: 'CONFIDENTIAL'
    })
    setCurrentAssessment(assessment)

    // Create intervention plans
    const plans = [
      WellbeingMonitoringSystem.createInterventionPlan(profile.id, {
        triggerAssessment: assessment.id,
        interventionType: 'PREVENTIVE',
        targetIndicators: ['academic_stress', 'emotional_wellbeing'],
        strategies: [
          {
            type: 'stress_management',
            description: 'Daily mindfulness and relaxation techniques',
            frequency: 'daily',
            duration: '15_minutes',
            resources: ['mindfulness_app', 'breathing_exercises', 'guided_meditation']
          },
          {
            type: 'academic_support',
            description: 'Study skills and time management training',
            frequency: 'weekly',
            duration: '1_hour',
            resources: ['study_planner', 'time_management_tools', 'academic_coach']
          }
        ],
        timeline: 'short_term',
        assignedTo: ['school_counselor', 'academic_support_specialist'],
        monitoringSchedule: 'weekly'
      })
    ]
    setInterventionPlans(plans)

    // Set support resources
    setSupportResources([
      {
        category: 'crisis_support',
        name: 'Crisis Hotline',
        description: '24/7 crisis support and intervention',
        contact: '988',
        availability: '24/7',
        type: 'phone'
      },
      {
        category: 'counseling',
        name: 'School Counseling Services',
        description: 'Individual and group counseling sessions',
        contact: 'counselor@school.edu',
        availability: 'school_hours',
        type: 'in_person'
      },
      {
        category: 'peer_support',
        name: 'Peer Support Groups',
        description: 'Student-led support groups for various topics',
        contact: 'peer.support@school.edu',
        availability: 'scheduled',
        type: 'group'
      },
      {
        category: 'family_support',
        name: 'Family Counseling',
        description: 'Family therapy and support services',
        contact: 'family.services@school.edu',
        availability: 'by_appointment',
        type: 'family'
      },
      {
        category: 'online_resources',
        name: 'Mental Health Apps',
        description: 'Curated mental health and wellness apps',
        contact: 'apps.mentalhealth.org',
        availability: '24/7',
        type: 'digital'
      }
    ])

    // Set crisis protocols
    setCrisisProtocols({
      riskLevels: {
        LOW: {
          actions: ['self_care_reminders', 'check_in_scheduling', 'resource_sharing'],
          timeline: 'within_week',
          personnel: ['teacher', 'peer_support']
        },
        MODERATE: {
          actions: ['counselor_referral', 'parent_notification', 'safety_planning'],
          timeline: 'within_24_hours',
          personnel: ['school_counselor', 'mental_health_specialist']
        },
        HIGH: {
          actions: ['immediate_intervention', 'crisis_team_activation', 'safety_assessment'],
          timeline: 'immediate',
          personnel: ['crisis_team', 'mental_health_professional', 'administration']
        },
        CRITICAL: {
          actions: ['emergency_services', 'hospitalization_assessment', 'family_notification'],
          timeline: 'immediate',
          personnel: ['emergency_services', 'crisis_team', 'medical_professional']
        }
      },
      escalationProcedures: [
        'assess_immediate_safety',
        'contact_crisis_team',
        'notify_emergency_contacts',
        'document_incident',
        'follow_up_planning'
      ],
      emergencyContacts: profile.emergencyContacts
    })

    // Monitor progress
    const progress = WellbeingMonitoringSystem.monitorProgress(profile.id, '30_days')
    setProgressData(progress)
  }

  const handleEmergencyAlert = () => {
    alert('Emergency protocols activated. Crisis team has been notified.')
  }

  const renderDashboard = () => (
    <div className="mental-health-dashboard">
      <div className="dashboard-overview">
        <div className="wellbeing-summary">
          <div className="summary-card overall-wellbeing">
            <h3>Overall Wellbeing</h3>
            <div className="wellbeing-score">
              <span className="score">{currentAssessment?.overallScore || 0}</span>
              <span className="max-score">/100</span>
            </div>
            <div className={`risk-indicator ${currentAssessment?.riskLevel?.toLowerCase()}`}>
              {currentAssessment?.riskLevel || 'UNKNOWN'} Risk
            </div>
          </div>

          <div className="summary-card recent-assessment">
            <h3>Recent Assessment</h3>
            <div className="assessment-date">
              {currentAssessment?.timestamp?.toLocaleDateString() || 'No recent assessment'}
            </div>
            <div className="assessment-type">
              {currentAssessment?.type?.replace('_', ' ') || 'N/A'}
            </div>
            <button className="new-assessment-btn">Take New Assessment</button>
          </div>

          <div className="summary-card active-interventions">
            <h3>Active Interventions</h3>
            <div className="intervention-count">
              {interventionPlans.length} Active Plan{interventionPlans.length !== 1 ? 's' : ''}
            </div>
            <div className="intervention-progress">
              Progress: 65%
            </div>
            <button className="view-plans-btn">View Plans</button>
          </div>

          <div className="summary-card emergency-access">
            <h3>Emergency Support</h3>
            <button className="crisis-btn" onClick={handleEmergencyAlert}>
              🚨 Crisis Support
            </button>
            <div className="crisis-contact">
              Crisis Hotline: 988
            </div>
            <div className="immediate-help">
              Available 24/7
            </div>
          </div>
        </div>

        <div className="wellbeing-indicators">
          <h3>Wellbeing Indicators</h3>
          <div className="indicators-grid">
            {currentAssessment?.indicators && Object.entries(currentAssessment.indicators).map(([indicator, data]) => (
              <div key={indicator} className="indicator-card">
                <div className="indicator-header">
                  <span className="indicator-name">{indicator.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  <span className={`indicator-score ${data.level?.toLowerCase()}`}>{data.score}/10</span>
                </div>
                <div className="indicator-trend">
                  <span className={`trend ${data.trend}`}>
                    {data.trend === 'improving' ? '↗️' : data.trend === 'declining' ? '↘️' : '➡️'}
                    {data.trend}
                  </span>
                </div>
                <div className="indicator-notes">
                  {data.notes || 'No additional notes'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            <button className="action-btn mood-check">
              😊 Mood Check-in
            </button>
            <button className="action-btn stress-relief">
              🧘 Stress Relief
            </button>
            <button className="action-btn peer-support">
              👥 Peer Support
            </button>
            <button className="action-btn counselor-chat">
              💬 Talk to Counselor
            </button>
            <button className="action-btn wellness-tips">
              💡 Wellness Tips
            </button>
            <button className="action-btn progress-review">
              📊 Progress Review
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAssessments = () => (
    <div className="assessments-section">
      <div className="section-header">
        <h3>Wellbeing Assessments</h3>
        <button className="new-assessment-btn">📝 New Assessment</button>
      </div>

      <div className="assessment-tools">
        <div className="tool-card self-assessment">
          <h4>Self-Assessment</h4>
          <p>Quick daily check-in on your mental and emotional state</p>
          <div className="tool-features">
            <span className="feature">5 minutes</span>
            <span className="feature">Anonymous option</span>
            <span className="feature">Immediate feedback</span>
          </div>
          <button className="start-assessment-btn">Start Assessment</button>
        </div>

        <div className="tool-card comprehensive-evaluation">
          <h4>Comprehensive Evaluation</h4>
          <p>Detailed assessment covering all aspects of wellbeing</p>
          <div className="tool-features">
            <span className="feature">20 minutes</span>
            <span className="feature">Professional review</span>
            <span className="feature">Detailed report</span>
          </div>
          <button className="start-assessment-btn">Schedule Evaluation</button>
        </div>

        <div className="tool-card peer-feedback">
          <h4>Peer Feedback</h4>
          <p>Anonymous feedback from classmates and friends</p>
          <div className="tool-features">
            <span className="feature">Optional</span>
            <span className="feature">Anonymous</span>
            <span className="feature">Social insights</span>
          </div>
          <button className="start-assessment-btn">Request Feedback</button>
        </div>

        <div className="tool-card teacher-observation">
          <h4>Teacher Observation</h4>
          <p>Professional observation and assessment by educators</p>
          <div className="tool-features">
            <span className="feature">Professional</span>
            <span className="feature">Behavioral focus</span>
            <span className="feature">Academic correlation</span>
          </div>
          <button className="start-assessment-btn">Request Observation</button>
        </div>
      </div>

      {currentAssessment && (
        <div className="current-assessment">
          <h4>Current Assessment Results</h4>
          <div className="assessment-summary">
            <div className="assessment-meta">
              <span className="date">Date: {currentAssessment.timestamp.toLocaleDateString()}</span>
              <span className="type">Type: {currentAssessment.type.replace('_', ' ')}</span>
              <span className="source">Source: {currentAssessment.source}</span>
            </div>
            
            <div className="assessment-scores">
              {Object.entries(currentAssessment.indicators).map(([indicator, data]) => (
                <div key={indicator} className="score-item">
                  <label>{indicator.replace(/([A-Z])/g, ' $1')}: </label>
                  <div className="score-bar">
                    <div 
                      className="score-fill" 
                      style={{ width: `${(data.score / 10) * 100}%` }}
                    ></div>
                    <span className="score-text">{data.score}/10</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="assessment-recommendations">
              <h5>Recommendations</h5>
              <ul>
                {currentAssessment.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderInterventions = () => (
    <div className="interventions-section">
      <div className="section-header">
        <h3>Intervention Plans</h3>
        <span className="plans-count">{interventionPlans.length} Active Plan{interventionPlans.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="intervention-plans">
        {interventionPlans.map(plan => (
          <div key={plan.id} className="intervention-plan">
            <div className="plan-header">
              <h4>{plan.interventionType.replace('_', ' ')} Intervention</h4>
              <span className={`plan-status ${plan.status.toLowerCase()}`}>{plan.status}</span>
            </div>

            <div className="plan-details">
              <div className="target-indicators">
                <label>Target Areas:</label>
                <div className="indicators-list">
                  {plan.targetIndicators.map((indicator, index) => (
                    <span key={index} className="indicator-tag">{indicator.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>

              <div className="plan-timeline">
                <label>Timeline:</label>
                <span className="timeline">{plan.timeline.replace('_', ' ')}</span>
              </div>

              <div className="assigned-team">
                <label>Support Team:</label>
                <div className="team-list">
                  {plan.assignedTo.map((member, index) => (
                    <span key={index} className="team-member">{member.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="intervention-strategies">
              <h5>Strategies</h5>
              <div className="strategies-list">
                {plan.strategies.map((strategy, index) => (
                  <div key={index} className="strategy-item">
                    <div className="strategy-header">
                      <span className="strategy-type">{strategy.type.replace('_', ' ')}</span>
                      <span className="strategy-frequency">{strategy.frequency}</span>
                    </div>
                    <p className="strategy-description">{strategy.description}</p>
                    <div className="strategy-resources">
                      <label>Resources:</label>
                      {strategy.resources.map((resource, resourceIndex) => (
                        <span key={resourceIndex} className="resource-tag">{resource.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="plan-progress">
              <div className="progress-header">
                <h5>Progress</h5>
                <span className="progress-percentage">65%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '65%' }}></div>
              </div>
              <div className="next-review">
                Next Review: {plan.nextReview?.toLocaleDateString() || 'Not scheduled'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderResources = () => (
    <div className="resources-section">
      <div className="section-header">
        <h3>Mental Health Resources</h3>
        <button className="emergency-btn" onClick={handleEmergencyAlert}>🚨 Emergency Help</button>
      </div>

      <div className="resources-grid">
        {supportResources.map((resource, index) => (
          <div key={index} className={`resource-card ${resource.category}`}>
            <div className="resource-header">
              <h4>{resource.name}</h4>
              <span className={`availability ${resource.availability.replace('_', '-')}`}>
                {resource.availability.replace('_', ' ')}
              </span>
            </div>
            <p className="resource-description">{resource.description}</p>
            <div className="resource-contact">
              <label>Contact:</label>
              <span className="contact-info">{resource.contact}</span>
            </div>
            <div className="resource-type">
              <span className="type-tag">{resource.type.replace('_', ' ')}</span>
            </div>
            <button className="access-resource-btn">Access Resource</button>
          </div>
        ))}
      </div>

      <div className="emergency-protocols">
        <h4>Crisis Support Protocols</h4>
        {crisisProtocols && (
          <div className="protocols-grid">
            {Object.entries(crisisProtocols.riskLevels).map(([level, protocol]) => (
              <div key={level} className={`protocol-card ${level.toLowerCase()}`}>
                <h5>{level} Risk Level</h5>
                <div className="protocol-timeline">
                  Response Time: {protocol.timeline.replace('_', ' ')}
                </div>
                <div className="protocol-actions">
                  <label>Actions:</label>
                  <ul>
                    {protocol.actions.map((action, index) => (
                      <li key={index}>{action.replace('_', ' ')}</li>
                    ))}
                  </ul>
                </div>
                <div className="protocol-personnel">
                  <label>Personnel:</label>
                  <div className="personnel-list">
                    {protocol.personnel.map((person, index) => (
                      <span key={index} className="personnel-tag">{person.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="self-help-tools">
        <h4>Self-Help Tools</h4>
        <div className="tools-grid">
          <div className="tool-card breathing">
            <h5>🫁 Breathing Exercises</h5>
            <p>Guided breathing techniques for stress relief</p>
            <button className="tool-btn">Start Breathing Exercise</button>
          </div>
          <div className="tool-card meditation">
            <h5>🧘 Meditation</h5>
            <p>Mindfulness and meditation sessions</p>
            <button className="tool-btn">Begin Meditation</button>
          </div>
          <div className="tool-card journaling">
            <h5>📝 Mood Journaling</h5>
            <p>Track your thoughts and feelings</p>
            <button className="tool-btn">Open Journal</button>
          </div>
          <div className="tool-card grounding">
            <h5>🌱 Grounding Techniques</h5>
            <p>5-4-3-2-1 and other grounding exercises</p>
            <button className="tool-btn">Practice Grounding</button>
          </div>
        </div>
      </div>
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
          <div className="progress-overview">
            <div className="metric-card overall-improvement">
              <h4>Overall Improvement</h4>
              <div className="metric-value">
                <span className="value">{progressData.overallImprovement}%</span>
                <span className="trend positive">↗️ Improving</span>
              </div>
            </div>

            <div className="metric-card risk-reduction">
              <h4>Risk Level Changes</h4>
              <div className="risk-timeline">
                <div className="risk-change">
                  <span className="from-risk moderate">Moderate</span>
                  <span className="arrow">→</span>
                  <span className="to-risk low">Low</span>
                </div>
              </div>
            </div>

            <div className="metric-card intervention-effectiveness">
              <h4>Intervention Effectiveness</h4>
              <div className="effectiveness-score">
                <span className="score">85%</span>
                <span className="label">Effective</span>
              </div>
            </div>

            <div className="metric-card engagement-level">
              <h4>Engagement Level</h4>
              <div className="engagement-score">
                <span className="score">92%</span>
                <span className="label">Highly Engaged</span>
              </div>
            </div>
          </div>

          <div className="progress-indicators">
            <h4>Indicator Progress</h4>
            <div className="indicators-progress">
              {progressData.indicatorProgress && Object.entries(progressData.indicatorProgress).map(([indicator, progress]) => (
                <div key={indicator} className="indicator-progress">
                  <div className="indicator-header">
                    <span className="indicator-name">{indicator.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="progress-value">{progress.improvement}% improvement</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.abs(progress.improvement)}%` }}
                    ></div>
                  </div>
                  <div className="progress-details">
                    <span className="baseline">Baseline: {progress.baseline}</span>
                    <span className="current">Current: {progress.current}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="milestones">
            <h4>Milestones & Achievements</h4>
            <div className="milestones-list">
              <div className="milestone achieved">
                <span className="milestone-icon">🎯</span>
                <div className="milestone-content">
                  <h5>Stress Management Goal</h5>
                  <p>Successfully reduced academic stress levels by 30%</p>
                  <span className="achievement-date">Achieved 2 weeks ago</span>
                </div>
              </div>
              <div className="milestone in-progress">
                <span className="milestone-icon">🏃</span>
                <div className="milestone-content">
                  <h5>Social Engagement</h5>
                  <p>Increase participation in group activities</p>
                  <span className="progress-indicator">75% complete</span>
                </div>
              </div>
              <div className="milestone upcoming">
                <span className="milestone-icon">🎪</span>
                <div className="milestone-content">
                  <h5>Emotional Regulation</h5>
                  <p>Develop consistent emotional coping strategies</p>
                  <span className="target-date">Target: Next month</span>
                </div>
              </div>
            </div>
          </div>

          <div className="recommendations">
            <h4>Progress-Based Recommendations</h4>
            <div className="recommendations-list">
              <div className="recommendation positive">
                <span className="rec-icon">✅</span>
                <div className="rec-content">
                  <h5>Continue Current Strategies</h5>
                  <p>Your stress management techniques are working well. Keep practicing daily mindfulness.</p>
                </div>
              </div>
              <div className="recommendation adjustment">
                <span className="rec-icon">⚡</span>
                <div className="rec-content">
                  <h5>Increase Social Activities</h5>
                  <p>Consider joining one additional extracurricular activity to boost social engagement.</p>
                </div>
              </div>
              <div className="recommendation new">
                <span className="rec-icon">🆕</span>
                <div className="rec-content">
                  <h5>Add Physical Wellness</h5>
                  <p>Incorporate regular physical exercise to support overall mental health improvement.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="mental-health-interface">
      <div className="interface-header">
        <h2>🧠 Mental Health & Wellbeing Support</h2>
        <p>Comprehensive mental health monitoring and support system</p>
        <div className="privacy-notice">
          <span className="privacy-icon">🔒</span>
          <span className="privacy-text">Your privacy is protected. All data is confidential.</span>
        </div>
      </div>

      <div className="interface-navigation">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          🏠 Dashboard
        </button>
        <button
          className={`nav-tab ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessments')}
        >
          📊 Assessments
        </button>
        <button
          className={`nav-tab ${activeTab === 'interventions' ? 'active' : ''}`}
          onClick={() => setActiveTab('interventions')}
        >
          🎯 Interventions
        </button>
        <button
          className={`nav-tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          📚 Resources
        </button>
        <button
          className={`nav-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📈 Progress
        </button>
      </div>

      <div className="interface-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'assessments' && renderAssessments()}
        {activeTab === 'interventions' && renderInterventions()}
        {activeTab === 'resources' && renderResources()}
        {activeTab === 'progress' && renderProgress()}
      </div>

      <style jsx>{`
        .mental-health-interface {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .interface-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 25px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 12px;
        }

        .interface-header h2 {
          margin: 0 0 10px 0;
          font-size: 2.5em;
        }

        .interface-header p {
          margin: 0 0 15px 0;
          opacity: 0.9;
          font-size: 1.1em;
        }

        .privacy-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9em;
        }

        .interface-navigation {
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
          background: #10b981;
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

        .dashboard-overview {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .wellbeing-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .summary-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .summary-card h3 {
          margin: 0 0 15px 0;
          color: #1f2937;
          font-size: 1.1em;
        }

        .wellbeing-score {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-bottom: 10px;
        }

        .wellbeing-score .score {
          font-size: 2.5em;
          font-weight: bold;
          color: #10b981;
        }

        .wellbeing-score .max-score {
          font-size: 1.2em;
          color: #6b7280;
        }

        .risk-indicator {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.9em;
          font-weight: 500;
          text-transform: uppercase;
        }

        .risk-indicator.low {
          background: #d1fae5;
          color: #065f46;
        }

        .risk-indicator.moderate {
          background: #fef3c7;
          color: #92400e;
        }

        .risk-indicator.high {
          background: #fee2e2;
          color: #991b1b;
        }

        .risk-indicator.critical {
          background: #fecaca;
          color: #7f1d1d;
        }

        .crisis-btn {
          width: 100%;
          padding: 12px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          font-size: 1.1em;
          margin-bottom: 10px;
        }

        .crisis-btn:hover {
          background: #dc2626;
        }

        .indicators-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .indicator-card {
          background: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .indicator-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .indicator-name {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.9em;
        }

        .indicator-score {
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8em;
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

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .action-btn {
          padding: 15px;
          border: 1px solid #10b981;
          background: white;
          color: #10b981;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          text-align: center;
        }

        .action-btn:hover {
          background: #10b981;
          color: white;
        }

        .new-assessment-btn, .emergency-btn {
          padding: 8px 16px;
          border: 1px solid #10b981;
          background: white;
          color: #10b981;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .new-assessment-btn:hover, .emergency-btn:hover {
          background: #10b981;
          color: white;
        }

        .emergency-btn {
          border-color: #ef4444;
          color: #ef4444;
        }

        .emergency-btn:hover {
          background: #ef4444;
          color: white;
        }

        @media (max-width: 768px) {
          .interface-navigation {
            flex-direction: column;
          }

          .nav-tab {
            min-width: auto;
          }

          .wellbeing-summary {
            grid-template-columns: 1fr;
          }

          .indicators-grid {
            grid-template-columns: 1fr;
          }

          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  )
}

export default MentalHealthSupportInterface
