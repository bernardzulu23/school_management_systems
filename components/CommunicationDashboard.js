import React, { useState, useEffect } from 'react'
import { RealTimeCommunicationHub } from '../lib/realTimeCommunicationHub'
import { SocialLearningNetwork } from '../lib/socialLearningNetwork'
import { CollaborativeProjectManager } from '../lib/collaborativeProjectManager'

const CommunicationDashboard = ({ userRole, userId }) => {
  const [activeTab, setActiveTab] = useState('messages')
  const [channels, setChannels] = useState([])
  const [studyGroups, setStudyGroups] = useState([])
  const [projects, setProjects] = useState([])
  const [notifications, setNotifications] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState(null)

  useEffect(() => {
    initializeCommunicationData()
    setupRealTimeUpdates()
  }, [userId])

  const initializeCommunicationData = () => {
    // Initialize communication channels
    const defaultChannels = [
      RealTimeCommunicationHub.createCommunicationChannel({
        name: 'General Discussion',
        description: 'General school communication',
        type: 'CLASS_CHANNEL',
        members: [userId],
        createdBy: userId
      }),
      RealTimeCommunicationHub.createCommunicationChannel({
        name: 'Study Help',
        description: 'Academic support and tutoring',
        type: 'STUDY_GROUP',
        members: [userId],
        createdBy: userId
      })
    ]
    setChannels(defaultChannels)

    // Initialize study groups
    const defaultStudyGroups = [
      SocialLearningNetwork.createStudyGroup({
        name: 'Mathematics Study Circle',
        description: 'Advanced mathematics problem solving',
        type: 'SUBJECT_FOCUSED',
        subject: 'Mathematics',
        level: 'intermediate',
        creator: { id: userId, name: 'Current User' },
        meetingFrequency: 'weekly'
      }),
      SocialLearningNetwork.createStudyGroup({
        name: 'Science Research Group',
        description: 'Collaborative science research projects',
        type: 'PROJECT_COLLABORATION',
        subject: 'Science',
        level: 'advanced',
        creator: { id: userId, name: 'Current User' },
        meetingFrequency: 'bi_weekly'
      })
    ]
    setStudyGroups(defaultStudyGroups)

    // Initialize collaborative projects
    const defaultProjects = [
      CollaborativeProjectManager.createCollaborativeProject({
        title: 'Environmental Impact Study',
        description: 'Research project on local environmental issues',
        type: 'RESEARCH',
        subject: 'Environmental Science',
        creator: { id: userId, name: 'Current User' },
        startDate: new Date(),
        primaryObjectives: ['Conduct field research', 'Analyze data', 'Present findings']
      })
    ]
    setProjects(defaultProjects)

    // Mock online users
    setOnlineUsers([
      { id: 'user1', name: 'Alex Johnson', status: 'online', role: 'student' },
      { id: 'user2', name: 'Sarah Chen', status: 'in_class', role: 'student' },
      { id: 'user3', name: 'Dr. Smith', status: 'online', role: 'teacher' },
      { id: 'user4', name: 'Maria Garcia', status: 'away', role: 'student' }
    ])
  }

  const setupRealTimeUpdates = () => {
    // Mock real-time updates
    const interval = setInterval(() => {
      // Simulate new notifications
      const newNotification = RealTimeCommunicationHub.processSmartNotification({
        userId: userId,
        type: 'message',
        title: 'New Message',
        message: 'You have a new message in Study Help channel',
        source: 'communication_hub',
        category: 'social'
      })
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]) // Keep last 10
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }

  const handleSendMessage = (channelId, messageContent) => {
    const message = RealTimeCommunicationHub.sendMessage({
      channelId: channelId,
      senderId: userId,
      senderName: 'Current User',
      senderRole: userRole,
      type: 'TEXT',
      content: messageContent,
      priority: 'MEDIUM'
    })

    // Update channel with new message (in production would use WebSocket)
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, metadata: { ...channel.metadata, lastActivity: new Date() } }
        : channel
    ))
  }

  const startVideoCall = (participants) => {
    const conference = RealTimeCommunicationHub.createVideoConference({
      title: 'Study Session',
      description: 'Collaborative learning session',
      host: { id: userId, name: 'Current User' },
      participants: participants,
      scheduledTime: new Date(),
      duration: 60,
      type: 'study_session',
      recordingEnabled: false,
      chatEnabled: true,
      screenSharingEnabled: true,
      whiteboardEnabled: true
    })

    setIsVideoCallActive(true)
    console.log('Video call started:', conference)
  }

  const createNewStudyGroup = () => {
    const newGroup = SocialLearningNetwork.createStudyGroup({
      name: 'New Study Group',
      description: 'Collaborative learning group',
      type: 'SUBJECT_FOCUSED',
      subject: 'General',
      level: 'beginner',
      creator: { id: userId, name: 'Current User' },
      meetingFrequency: 'weekly'
    })

    setStudyGroups(prev => [...prev, newGroup])
  }

  const joinStudyGroup = (groupId) => {
    setStudyGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, members: [...group.members, { id: userId, name: 'Current User' }] }
        : group
    ))
  }

  const createNewProject = () => {
    const newProject = CollaborativeProjectManager.createCollaborativeProject({
      title: 'New Collaborative Project',
      description: 'Team project for learning',
      type: 'RESEARCH',
      subject: 'General Studies',
      creator: { id: userId, name: 'Current User' },
      startDate: new Date(),
      primaryObjectives: ['Define objectives', 'Plan approach', 'Execute project']
    })

    setProjects(prev => [...prev, newProject])
  }

  const renderMessagingInterface = () => (
    <div className="messaging-interface">
      <div className="channels-sidebar">
        <h3>Channels</h3>
        {channels.map(channel => (
          <div 
            key={channel.id} 
            className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
            onClick={() => setSelectedChannel(channel)}
          >
            <div className="channel-info">
              <span className="channel-name"># {channel.name}</span>
              <span className="member-count">{channel.members.length} members</span>
            </div>
          </div>
        ))}
        
        <h3>Direct Messages</h3>
        {onlineUsers.map(user => (
          <div key={user.id} className="user-item">
            <div className={`status-indicator ${user.status}`}></div>
            <span className="user-name">{user.name}</span>
            <span className="user-role">({user.role})</span>
          </div>
        ))}
      </div>

      <div className="chat-area">
        {selectedChannel ? (
          <div className="chat-container">
            <div className="chat-header">
              <h3>#{selectedChannel.name}</h3>
              <div className="chat-actions">
                <button onClick={() => startVideoCall(selectedChannel.members)}>
                  📹 Start Video Call
                </button>
                <button>📋 Shared Whiteboard</button>
                <button>📁 File Sharing</button>
              </div>
            </div>
            
            <div className="message-area">
              <div className="message-placeholder">
                <p>Welcome to #{selectedChannel.name}</p>
                <p>{selectedChannel.description}</p>
              </div>
            </div>
            
            <div className="message-input">
              <input 
                type="text" 
                placeholder="Type your message..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleSendMessage(selectedChannel.id, e.target.value)
                    e.target.value = ''
                  }
                }}
              />
              <button>Send</button>
            </div>
          </div>
        ) : (
          <div className="no-channel-selected">
            <p>Select a channel to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderStudyGroups = () => (
    <div className="study-groups-section">
      <div className="section-header">
        <h3>Study Groups</h3>
        <button onClick={createNewStudyGroup} className="create-button">
          + Create New Group
        </button>
      </div>
      
      <div className="groups-grid">
        {studyGroups.map(group => (
          <div key={group.id} className="group-card">
            <div className="group-header">
              <h4>{group.name}</h4>
              <span className="group-type">{group.type}</span>
            </div>
            <p className="group-description">{group.description}</p>
            <div className="group-details">
              <span className="subject">📚 {group.subject}</span>
              <span className="level">🎯 {group.level}</span>
              <span className="members">👥 {group.members.length}/{group.maxMembers}</span>
            </div>
            <div className="group-schedule">
              <span>📅 Meets {group.schedule.meetingFrequency}</span>
            </div>
            <div className="group-actions">
              <button onClick={() => joinStudyGroup(group.id)}>Join Group</button>
              <button>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderCollaborativeProjects = () => (
    <div className="projects-section">
      <div className="section-header">
        <h3>Collaborative Projects</h3>
        <button onClick={createNewProject} className="create-button">
          + Start New Project
        </button>
      </div>
      
      <div className="projects-grid">
        {projects.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <h4>{project.title}</h4>
              <span className="project-type">{project.type}</span>
            </div>
            <p className="project-description">{project.description}</p>
            <div className="project-details">
              <span className="subject">📖 {project.subject}</span>
              <span className="team-size">👥 {project.team.members.length} members</span>
              <span className="phase">🔄 {project.timeline.currentPhase}</span>
            </div>
            <div className="project-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${project.progress.overallProgress}%` }}
                ></div>
              </div>
              <span>{project.progress.overallProgress}% Complete</span>
            </div>
            <div className="project-actions">
              <button>Open Project</button>
              <button>Team Chat</button>
              <button>View Timeline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="notifications-section">
      <h3>Recent Notifications</h3>
      <div className="notifications-list">
        {notifications.length > 0 ? notifications.map(notification => (
          <div key={notification.id} className={`notification-item ${notification.priority.toLowerCase()}`}>
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <span className="notification-time">
                {notification.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="notification-actions">
              <button>Mark Read</button>
              <button>Dismiss</button>
            </div>
          </div>
        )) : (
          <p className="no-notifications">No new notifications</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="communication-dashboard">
      <div className="dashboard-header">
        <h2>Communication & Collaboration Hub</h2>
        <div className="user-status">
          <span>Welcome, {userRole}!</span>
          <div className="status-controls">
            <select defaultValue="online">
              <option value="online">🟢 Online</option>
              <option value="away">🟡 Away</option>
              <option value="busy">🔴 Busy</option>
              <option value="in_class">🔵 In Class</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'messages' ? 'active' : ''}
          onClick={() => setActiveTab('messages')}
        >
          💬 Messages
        </button>
        <button 
          className={activeTab === 'study_groups' ? 'active' : ''}
          onClick={() => setActiveTab('study_groups')}
        >
          👥 Study Groups
        </button>
        <button 
          className={activeTab === 'projects' ? 'active' : ''}
          onClick={() => setActiveTab('projects')}
        >
          🚀 Projects
        </button>
        <button 
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications {notifications.length > 0 && `(${notifications.length})`}
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'messages' && renderMessagingInterface()}
        {activeTab === 'study_groups' && renderStudyGroups()}
        {activeTab === 'projects' && renderCollaborativeProjects()}
        {activeTab === 'notifications' && renderNotifications()}
      </div>

      {isVideoCallActive && (
        <div className="video-call-overlay">
          <div className="video-call-container">
            <div className="video-call-header">
              <h3>Study Session Video Call</h3>
              <button onClick={() => setIsVideoCallActive(false)}>✕ End Call</button>
            </div>
            <div className="video-area">
              <div className="video-placeholder">
                <p>📹 Video call interface would be here</p>
                <p>Features: Screen sharing, whiteboard, chat, breakout rooms</p>
              </div>
            </div>
            <div className="video-controls">
              <button>🎤 Mute</button>
              <button>📹 Camera</button>
              <button>🖥️ Share Screen</button>
              <button>📝 Whiteboard</button>
              <button>💬 Chat</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .communication-dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }

        .dashboard-header h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }

        .user-status {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .status-controls select {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          background: white;
          color: #333;
          font-size: 14px;
        }

        .dashboard-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
        }

        .dashboard-tabs button {
          padding: 12px 24px;
          border: none;
          background: none;
          color: #6b7280;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .dashboard-tabs button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .dashboard-tabs button:hover {
          color: #3b82f6;
          background: #f8fafc;
        }

        .messaging-interface {
          display: flex;
          height: 600px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .channels-sidebar {
          width: 300px;
          background: #f8fafc;
          padding: 20px;
          border-right: 1px solid #e5e7eb;
          overflow-y: auto;
        }

        .channels-sidebar h3 {
          margin: 0 0 15px 0;
          color: #374151;
          font-size: 16px;
          font-weight: 600;
        }

        .channel-item, .user-item {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .channel-item:hover, .user-item:hover {
          background: #e5e7eb;
        }

        .channel-item.active {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .channel-info {
          display: flex;
          flex-direction: column;
        }

        .channel-name {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .member-count {
          font-size: 12px;
          color: #6b7280;
        }

        .user-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.online { background: #10b981; }
        .status-indicator.away { background: #f59e0b; }
        .status-indicator.busy { background: #ef4444; }
        .status-indicator.in_class { background: #3b82f6; }

        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-actions {
          display: flex;
          gap: 10px;
        }

        .chat-actions button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .chat-actions button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .message-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .message-placeholder {
          text-align: center;
          color: #6b7280;
          margin-top: 50px;
        }

        .message-input {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 10px;
        }

        .message-input input {
          flex: 1;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .message-input button {
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .create-button {
          padding: 10px 20px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .create-button:hover {
          background: #059669;
        }

        .groups-grid, .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .group-card, .project-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .group-card:hover, .project-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .group-header, .project-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .group-header h4, .project-header h4 {
          margin: 0;
          color: #1f2937;
          font-size: 18px;
        }

        .group-type, .project-type {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .group-description, .project-description {
          color: #6b7280;
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .group-details, .project-details {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
        }

        .group-details span, .project-details span {
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #374151;
        }

        .project-progress {
          margin-bottom: 15px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 5px;
        }

        .progress-fill {
          height: 100%;
          background: #10b981;
          transition: width 0.3s ease;
        }

        .group-actions, .project-actions {
          display: flex;
          gap: 10px;
        }

        .group-actions button, .project-actions button {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .group-actions button:first-child, .project-actions button:first-child {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .group-actions button:hover, .project-actions button:hover {
          background: #f3f4f6;
        }

        .notifications-list {
          max-height: 500px;
          overflow-y: auto;
        }

        .notification-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          margin-bottom: 10px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .notification-item.high {
          border-left-color: #ef4444;
        }

        .notification-item.critical {
          border-left-color: #dc2626;
          background: #fef2f2;
        }

        .notification-content h4 {
          margin: 0 0 5px 0;
          color: #1f2937;
        }

        .notification-content p {
          margin: 0 0 5px 0;
          color: #6b7280;
        }

        .notification-time {
          font-size: 12px;
          color: #9ca3af;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
        }

        .notification-actions button {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .video-call-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .video-call-container {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 1000px;
          height: 80%;
          display: flex;
          flex-direction: column;
        }

        .video-call-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .video-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1f2937;
          color: white;
        }

        .video-placeholder {
          text-align: center;
        }

        .video-controls {
          display: flex;
          justify-content: center;
          gap: 15px;
          padding: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .video-controls button {
          padding: 12px 20px;
          border: none;
          background: #374151;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s ease;
        }

        .video-controls button:hover {
          background: #4b5563;
        }

        .no-notifications {
          text-align: center;
          color: #6b7280;
          padding: 40px;
        }

        .no-channel-selected {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default CommunicationDashboard
