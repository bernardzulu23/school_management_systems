import React, { useState, useEffect, useRef } from 'react'
import { AdvancedAssessmentSystem } from '../lib/advancedAssessmentSystem'
import { EmergingTechnologySystem } from '../lib/emergingTechnologySystem'
import { InnovationLabSystem } from '../lib/innovationLabSystem'

const AdvancedInnovationDashboard = ({ userRole, userId }) => {
  const [activeTab, setActiveTab] = useState('assessment')
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('inactive')
  const [assessments, setAssessments] = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [projects, setProjects] = useState([])
  const [challenges, setChallenges] = useState([])
  const [technologies, setTechnologies] = useState({})
  const voiceRecognition = useRef(null)

  useEffect(() => {
    initializeDashboard()
    checkTechnologySupport()
    setupVoiceInterface()
  }, [])

  const initializeDashboard = () => {
    // Load user's assessments, portfolios, and projects
    loadAssessments()
    loadPortfolios()
    loadProjects()
    loadChallenges()
  }

  const checkTechnologySupport = () => {
    const availableTech = EmergingTechnologySystem.getAvailableTechnologies()
    setTechnologies(availableTech)
  }

  const setupVoiceInterface = () => {
    if (technologies.voiceInterface) {
      voiceRecognition.current = EmergingTechnologySystem.initializeVoiceInterface()

      // Listen for voice status updates
      window.addEventListener('voiceStatusUpdate', (event) => {
        setVoiceStatus(event.detail.status)
      })
    }
  }

  const toggleVoiceInterface = () => {
    if (!voiceEnabled && voiceRecognition.current) {
      voiceRecognition.current.start()
      setVoiceEnabled(true)
    } else if (voiceEnabled && voiceRecognition.current) {
      voiceRecognition.current.stop()
      setVoiceEnabled(false)
    }
  }

  const loadAssessments = () => {
    // Simulate loading advanced assessments
    const sampleAssessments = [
      {
        id: 'assess_1',
        title: 'Digital Portfolio Assessment',
        type: 'PORTFOLIO_DIGITAL',
        subject: 'Computer Science',
        status: 'ACTIVE',
        progress: 75,
        dueDate: '2024-02-15'
      },
      {
        id: 'assess_2',
        title: 'Peer Collaboration Project',
        type: 'PEER_COLLABORATIVE',
        subject: 'Science',
        status: 'PENDING',
        progress: 0,
        dueDate: '2024-02-20'
      }
    ]
    setAssessments(sampleAssessments)
  }

  const loadPortfolios = () => {
    // Simulate loading digital portfolios
    const samplePortfolios = [
      {
        id: 'portfolio_1',
        title: 'My Learning Journey',
        type: 'GROWTH_ANALYTICS',
        artifacts: 23,
        reflections: 8,
        lastUpdated: '2024-01-28'
      },
      {
        id: 'portfolio_2',
        title: 'STEM Showcase',
        type: 'SHOWCASE_DIGITAL',
        artifacts: 15,
        reflections: 5,
        lastUpdated: '2024-01-25'
      }
    ]
    setPortfolios(samplePortfolios)
  }

  const loadProjects = () => {
    // Simulate loading innovation projects
    const sampleProjects = [
      {
        id: 'proj_1',
        title: 'Smart Campus IoT System',
        category: 'STEM_INNOVATION',
        status: 'IN_PROGRESS',
        progress: 60,
        team: ['Alice', 'Bob', 'Charlie'],
        labType: 'CODING_LAB'
      },
      {
        id: 'proj_2',
        title: 'Community Art Installation',
        category: 'CREATIVE_ARTS',
        status: 'PLANNING',
        progress: 20,
        team: ['Diana', 'Eve'],
        labType: 'MEDIA_STUDIO'
      }
    ]
    setProjects(sampleProjects)
  }

  const loadChallenges = () => {
    // Simulate loading innovation challenges
    const sampleChallenges = [
      {
        id: 'challenge_1',
        title: 'Sustainability Innovation Challenge',
        category: 'SOCIAL_IMPACT',
        status: 'OPEN',
        deadline: '2024-03-01',
        participants: 45,
        maxParticipants: 100
      },
      {
        id: 'challenge_2',
        title: 'AI for Education Hackathon',
        category: 'STEM_INNOVATION',
        status: 'UPCOMING',
        deadline: '2024-03-15',
        participants: 0,
        maxParticipants: 50
      }
    ]
    setChallenges(sampleChallenges)
  }

  const renderAssessmentTab = () => (
    <div className="assessment-section">
      <div className="section-header">
        <h2>Advanced Assessment Tools</h2>
        <button className="create-btn" onClick={() => createNewAssessment()}>
          Create Assessment
        </button>
      </div>

      <div className="assessment-types">
        <div className="type-card competency-based">
          <h3>Competency-Based Assessment</h3>
          <p>Skills and knowledge evaluation with mastery tracking</p>
          <div className="features">
            <span className="feature">Skill Mapping</span>
            <span className="feature">Mastery Levels</span>
            <span className="feature">Adaptive Difficulty</span>
          </div>
        </div>

        <div className="type-card portfolio-digital">
          <h3>Digital Portfolio</h3>
          <p>Comprehensive collection with growth analytics</p>
          <div className="features">
            <span className="feature">Multimedia Support</span>
            <span className="feature">Growth Tracking</span>
            <span className="feature">AI Insights</span>
          </div>
        </div>

        <div className="type-card peer-collaborative">
          <h3>Peer Assessment</h3>
          <p>Student-to-student evaluation with bias detection</p>
          <div className="features">
            <span className="feature">Anonymous Feedback</span>
            <span className="feature">Bias Detection</span>
            <span className="feature">Calibration</span>
          </div>
        </div>
      </div>

      <div className="active-assessments">
        <h3>Your Assessments</h3>
        <div className="assessment-list">
          {assessments.map(assessment => (
            <div key={assessment.id} className="assessment-item">
              <div className="assessment-info">
                <h4>{assessment.title}</h4>
                <p>{assessment.subject} • {assessment.type}</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${assessment.progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="assessment-actions">
                <span className={`status ${assessment.status.toLowerCase()}`}>
                  {assessment.status}
                </span>
                <button className="action-btn">Continue</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTechnologyTab = () => (
    <div className="technology-section">
      <div className="section-header">
        <h2>Emerging Technologies</h2>
        <div className="voice-controls">
          <button
            className={`voice-btn ${voiceEnabled ? 'active' : ''}`}
            onClick={toggleVoiceInterface}
            disabled={!technologies.voiceInterface}
          >
            🎤 Voice {voiceEnabled ? 'ON' : 'OFF'}
          </button>
          <span className={`voice-status ${voiceStatus}`}>
            {voiceStatus}
          </span>
        </div>
      </div>

      <div className="technology-grid">
        <div className="tech-card voice-interface">
          <div className="tech-icon">🎤</div>
          <h3>Voice Interface</h3>
          <p>Speech recognition and voice-controlled navigation</p>
          <div className="tech-status">
            <span className={`status-indicator ${technologies.voiceInterface ? 'supported' : 'unsupported'}`}>
              {technologies.voiceInterface ? 'Supported' : 'Not Supported'}
            </span>
          </div>
          <div className="tech-features">
            <span className="feature">Speech-to-Text</span>
            <span className="feature">Voice Commands</span>
            <span className="feature">Accessibility</span>
          </div>
        </div>

        <div className="tech-card ar-vr">
          <div className="tech-icon">🥽</div>
          <h3>AR/VR Experiences</h3>
          <p>Immersive learning environments and virtual laboratories</p>
          <div className="tech-status">
            <span className={`status-indicator ${technologies.webXR ? 'supported' : 'limited'}`}>
              {technologies.webXR ? 'WebXR Ready' : 'Limited Support'}
            </span>
          </div>
          <div className="tech-features">
            <span className="feature">Virtual Labs</span>
            <span className="feature">3D Visualization</span>
            <span className="feature">Immersive Learning</span>
          </div>
        </div>

        <div className="tech-card iot-integration">
          <div className="tech-icon">🌐</div>
          <h3>IoT Smart Classroom</h3>
          <p>Connected devices for intelligent learning environments</p>
          <div className="tech-status">
            <span className="status-indicator supported">
              Available
            </span>
          </div>
          <div className="tech-features">
            <span className="feature">Environmental Sensors</span>
            <span className="feature">Smart Devices</span>
            <span className="feature">Automation</span>
          </div>
        </div>

        <div className="tech-card blockchain">
          <div className="tech-icon">🔗</div>
          <h3>Blockchain Credentials</h3>
          <p>Secure, verifiable digital certificates and achievements</p>
          <div className="tech-status">
            <span className="status-indicator supported">
              Ready
            </span>
          </div>
          <div className="tech-features">
            <span className="feature">Digital Certificates</span>
            <span className="feature">NFT Badges</span>
            <span className="feature">Verification</span>
          </div>
        </div>
      </div>

      <div className="ar-vr-experiences">
        <h3>Available AR/VR Experiences</h3>
        <div className="experience-grid">
          <div className="experience-card">
            <h4>Virtual Science Lab</h4>
            <p>Safe experimentation in virtual environments</p>
            <button className="launch-btn" onClick={() => launchARVRExperience('VIRTUAL_LABORATORY')}>
              Launch Experience
            </button>
          </div>
          <div className="experience-card">
            <h4>Historical Time Travel</h4>
            <p>Immersive historical experiences and exploration</p>
            <button className="launch-btn" onClick={() => launchARVRExperience('HISTORICAL_IMMERSION')}>
              Launch Experience
            </button>
          </div>
          <div className="experience-card">
            <h4>Language Immersion</h4>
            <p>Practice languages in realistic virtual scenarios</p>
            <button className="launch-btn" onClick={() => launchARVRExperience('LANGUAGE_IMMERSION')}>
              Launch Experience
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderInnovationTab = () => (
    <div className="innovation-section">
      <div className="section-header">
        <h2>Innovation Lab</h2>
        <button className="create-btn" onClick={() => createNewProject()}>
          Start New Project
        </button>
      </div>

      <div className="lab-types">
        <div className="lab-card maker-space">
          <div className="lab-icon">🔧</div>
          <h3>Digital Maker Space</h3>
          <p>Hands-on creation and prototyping</p>
          <div className="equipment">3D Printers • Laser Cutters • Electronics</div>
        </div>

        <div className="lab-card coding-lab">
          <div className="lab-icon">💻</div>
          <h3>Coding Laboratory</h3>
          <p>Programming and software development</p>
          <div className="equipment">High-Performance PCs • Dev Tools • Testing</div>
        </div>

        <div className="lab-card media-studio">
          <div className="lab-icon">🎬</div>
          <h3>Media Studio</h3>
          <p>Content creation and multimedia production</p>
          <div className="equipment">Cameras • Audio • Editing Suites</div>
        </div>

        <div className="lab-card research-lab">
          <div className="lab-icon">🔬</div>
          <h3>Research Lab</h3>
          <p>Scientific research and data analysis</p>
          <div className="equipment">Research Tools • Databases • Analytics</div>
        </div>
      </div>

      <div className="active-projects">
        <h3>Your Innovation Projects</h3>
        <div className="project-list">
          {projects.map(project => (
            <div key={project.id} className="project-item">
              <div className="project-info">
                <h4>{project.title}</h4>
                <p>{project.category} • {project.labType}</p>
                <div className="team-info">
                  Team: {project.team.join(', ')}
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="project-actions">
                <span className={`status ${project.status.toLowerCase().replace('_', '-')}`}>
                  {project.status}
                </span>
                <button className="action-btn">Continue</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="innovation-challenges">
        <h3>Innovation Challenges</h3>
        <div className="challenge-list">
          {challenges.map(challenge => (
            <div key={challenge.id} className="challenge-item">
              <div className="challenge-info">
                <h4>{challenge.title}</h4>
                <p>{challenge.category}</p>
                <div className="challenge-stats">
                  {challenge.participants}/{challenge.maxParticipants} participants
                </div>
              </div>
              <div className="challenge-actions">
                <span className={`status ${challenge.status.toLowerCase()}`}>
                  {challenge.status}
                </span>
                <button className="action-btn">
                  {challenge.status === 'OPEN' ? 'Join Challenge' : 'View Details'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const createNewAssessment = () => {
    console.log('Creating new assessment...')
    // Implementation would open assessment creation modal
  }

  const createNewProject = () => {
    console.log('Creating new innovation project...')
    // Implementation would open project creation modal
  }

  const launchARVRExperience = (experienceType) => {
    console.log(`Launching AR/VR experience: ${experienceType}`)
    // Implementation would initialize AR/VR experience
    EmergingTechnologySystem.initializeARExperience(experienceType, 'ar-container')
  }

  return (
    <div className="advanced-innovation-dashboard">
      <div className="dashboard-header">
        <h1>Advanced Innovation Dashboard</h1>
        <div className="user-info">
          <span>{userRole}</span>
          {technologies.voiceInterface && (
            <div className="voice-indicator">
              <span className={`voice-status-dot ${voiceStatus}`}></span>
              Voice {voiceEnabled ? 'Active' : 'Ready'}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'assessment' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessment')}
        >
          Advanced Assessment
        </button>
        <button
          className={`tab-btn ${activeTab === 'technology' ? 'active' : ''}`}
          onClick={() => setActiveTab('technology')}
        >
          Emerging Tech
        </button>
        <button
          className={`tab-btn ${activeTab === 'innovation' ? 'active' : ''}`}
          onClick={() => setActiveTab('innovation')}
        >
          Innovation Lab
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'assessment' && renderAssessmentTab()}
        {activeTab === 'technology' && renderTechnologyTab()}
        {activeTab === 'innovation' && renderInnovationTab()}
      </div>

      <style jsx>{`
        .advanced-innovation-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .dashboard-header {
          background: white;
          padding: 24px 32px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-header h1 {
          color: #1e40af;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 20px;
          color: #6b7280;
          font-weight: 500;
        }

        .voice-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #eff6ff;
          border-radius: 20px;
          font-size: 14px;
          color: #1e40af;
        }

        .voice-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6b7280;
        }

        .voice-status-dot.listening {
          background: #10b981;
          animation: pulse 1.5s infinite;
        }

        .voice-status-dot.active {
          background: #3b82f6;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .dashboard-tabs {
          background: white;
          padding: 0 32px;
          display: flex;
          gap: 4px;
          border-bottom: 1px solid #e5e7eb;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 16px 24px;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #1e40af;
          background: #f8fafc;
        }

        .tab-btn.active {
          color: #1e40af;
          border-bottom-color: #3b82f6;
          background: #f8fafc;
        }

        .dashboard-content {
          padding: 32px;
        }

        .voice-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .voice-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .voice-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .voice-btn.active {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .voice-status {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .voice-status.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .voice-status.listening {
          background: #dcfce7;
          color: #166534;
        }

        .voice-status.error {
          background: #fecaca;
          color: #991b1b;
        }

        .technology-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .tech-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
          border: 2px solid transparent;
        }

        .tech-card:hover {
          transform: translateY(-4px);
          border-color: #3b82f6;
        }

        .tech-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .tech-card h3 {
          color: #1e40af;
          margin: 0 0 12px 0;
          font-size: 20px;
        }

        .tech-card p {
          color: #6b7280;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .tech-status {
          margin-bottom: 16px;
        }

        .status-indicator {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-indicator.supported {
          background: #dcfce7;
          color: #166534;
        }

        .status-indicator.unsupported {
          background: #fecaca;
          color: #991b1b;
        }

        .status-indicator.limited {
          background: #fef3c7;
          color: #92400e;
        }

        .tech-features {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ar-vr-experiences h3 {
          color: #1e40af;
          margin-bottom: 20px;
        }

        .experience-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .experience-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #8b5cf6;
        }

        .experience-card h4 {
          color: #1e40af;
          margin: 0 0 8px 0;
        }

        .experience-card p {
          color: #6b7280;
          margin: 0 0 16px 0;
          font-size: 14px;
        }

        .launch-btn {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: transform 0.2s;
        }

        .launch-btn:hover {
          transform: translateY(-1px);
        }

        .lab-types {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .lab-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.2s;
          border: 2px solid transparent;
        }

        .lab-card:hover {
          transform: translateY(-4px);
          border-color: #10b981;
        }

        .lab-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .lab-card h3 {
          color: #1e40af;
          margin: 0 0 8px 0;
        }

        .lab-card p {
          color: #6b7280;
          margin: 0 0 12px 0;
          font-size: 14px;
        }

        .equipment {
          color: #059669;
          font-size: 12px;
          font-weight: 500;
        }

        .active-projects h3,
        .innovation-challenges h3 {
          color: #1e40af;
          margin-bottom: 20px;
        }

        .project-list,
        .challenge-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .project-item,
        .challenge-item {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .project-info h4,
        .challenge-info h4 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .project-info p,
        .challenge-info p {
          margin: 0 0 8px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .team-info,
        .challenge-stats {
          color: #059669;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .project-actions,
        .challenge-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status.in-progress {
          background: #dbeafe;
          color: #1e40af;
        }

        .status.planning {
          background: #fef3c7;
          color: #92400e;
        }

        .status.open {
          background: #dcfce7;
          color: #166534;
        }

        .status.upcoming {
          background: #e0e7ff;
          color: #3730a3;
        }
      `}</style>
    </div>
  )
}

export default AdvancedInnovationDashboard

      <style jsx>{`
        .assessment-section {
          padding: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .section-header h2 {
          color: #1e40af;
          margin: 0;
        }

        .create-btn {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: transform 0.2s;
        }

        .create-btn:hover {
          transform: translateY(-2px);
        }

        .assessment-types {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .type-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #3b82f6;
          transition: transform 0.2s;
        }

        .type-card:hover {
          transform: translateY(-4px);
        }

        .type-card h3 {
          color: #1e40af;
          margin: 0 0 12px 0;
        }

        .type-card p {
          color: #6b7280;
          margin: 0 0 16px 0;
        }

        .features {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .feature {
          background: #eff6ff;
          color: #1e40af;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
        }

        .active-assessments h3 {
          color: #1e40af;
          margin-bottom: 20px;
        }

        .assessment-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .assessment-item {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .assessment-info h4 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .assessment-info p {
          margin: 0 0 12px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .progress-bar {
          width: 200px;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.3s;
        }

        .assessment-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status.active {
          background: #dcfce7;
          color: #166534;
        }

        .status.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .action-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .action-btn:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  )