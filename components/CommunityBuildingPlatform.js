import React, { useState, useEffect } from 'react'
import { RealTimeCommunicationHub } from '../lib/realTimeCommunicationHub'
import { SocialLearningNetwork } from '../lib/socialLearningNetwork'

const CommunityBuildingPlatform = ({ userRole, userId }) => {
  const [activeSection, setActiveSection] = useState('events')
  const [communityEvents, setCommunityEvents] = useState([])
  const [discussionForums, setDiscussionForums] = useState([])
  const [mentorshipPrograms, setMentorshipPrograms] = useState([])
  const [knowledgeExchanges, setKnowledgeExchanges] = useState([])
  const [peerNetworks, setPeerNetworks] = useState([])

  useEffect(() => {
    initializeCommunityData()
  }, [userId])

  const initializeCommunityData = () => {
    // Initialize community events
    const events = [
      RealTimeCommunicationHub.createCommunityEvent({
        title: 'Science Fair 2024',
        description: 'Annual science fair showcasing student research projects',
        type: 'academic',
        organizer: { id: 'teacher_1', name: 'Dr. Smith' },
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        location: 'Main Auditorium',
        maxAttendees: 200,
        registrationRequired: true,
        tags: ['science', 'research', 'competition']
      }),
      RealTimeCommunicationHub.createCommunityEvent({
        title: 'Math Olympiad Training',
        description: 'Intensive training session for upcoming math competitions',
        type: 'academic',
        organizer: { id: 'teacher_2', name: 'Prof. Johnson' },
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        location: 'Room 201',
        maxAttendees: 30,
        registrationRequired: true,
        tags: ['mathematics', 'competition', 'training']
      }),
      RealTimeCommunicationHub.createCommunityEvent({
        title: 'Cultural Exchange Day',
        description: 'Celebrate diversity with food, music, and traditions',
        type: 'cultural',
        organizer: { id: 'student_council', name: 'Student Council' },
        startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        location: 'School Courtyard',
        maxAttendees: 500,
        registrationRequired: false,
        tags: ['culture', 'diversity', 'community']
      })
    ]
    setCommunityEvents(events)

    // Initialize discussion forums
    const forums = [
      RealTimeCommunicationHub.createDiscussionForum({
        title: 'Academic Support Hub',
        description: 'Get help with homework, assignments, and study strategies',
        category: 'academic',
        subject: 'General',
        moderators: ['teacher_1', 'teacher_2'],
        createdBy: 'admin'
      }),
      RealTimeCommunicationHub.createDiscussionForum({
        title: 'Career Guidance Corner',
        description: 'Discuss future careers, college applications, and life planning',
        category: 'general',
        subject: 'Career Development',
        moderators: ['counselor_1'],
        createdBy: 'admin'
      }),
      RealTimeCommunicationHub.createDiscussionForum({
        title: 'Student Innovation Lab',
        description: 'Share creative projects, inventions, and innovative ideas',
        category: 'academic',
        subject: 'Innovation',
        moderators: ['teacher_3'],
        createdBy: 'admin'
      })
    ]
    setDiscussionForums(forums)

    // Initialize mentorship programs
    const mentorships = [
      SocialLearningNetwork.createMentorshipProgram({
        title: 'Academic Excellence Mentorship',
        description: 'Senior students mentor juniors in academic subjects',
        type: 'ACADEMIC',
        subject: 'Mathematics',
        mentor: { id: 'student_senior_1', name: 'Alex Chen' },
        mentee: { id: userId, name: 'Current User' },
        goals: ['Improve problem-solving skills', 'Prepare for competitions', 'Build confidence']
      }),
      SocialLearningNetwork.createMentorshipProgram({
        title: 'Career Exploration Program',
        description: 'Professional mentors guide students in career planning',
        type: 'CAREER',
        subject: 'Computer Science',
        mentor: { id: 'professional_1', name: 'Dr. Sarah Wilson' },
        mentee: { id: userId, name: 'Current User' },
        goals: ['Explore tech careers', 'Build professional network', 'Develop industry skills']
      })
    ]
    setMentorshipPrograms(mentorships)

    // Initialize knowledge exchanges
    const exchanges = [
      SocialLearningNetwork.createKnowledgeExchange({
        title: 'Language Exchange Program',
        description: 'Practice languages with native speakers',
        type: 'skill_swap',
        offeredSkills: ['English', 'Public Speaking'],
        requestedSkills: ['Spanish', 'French'],
        creator: { id: userId, name: 'Current User' },
        timeCommitment: 2,
        duration: '3_months',
        format: 'online'
      }),
      SocialLearningNetwork.createKnowledgeExchange({
        title: 'Coding Bootcamp Buddy',
        description: 'Learn programming together through peer teaching',
        type: 'study_buddy',
        offeredSkills: ['Python', 'Web Development'],
        requestedSkills: ['Data Science', 'Machine Learning'],
        creator: { id: 'student_2', name: 'Jordan Smith' },
        timeCommitment: 3,
        duration: '6_months',
        format: 'hybrid'
      })
    ]
    setKnowledgeExchanges(exchanges)

    // Initialize peer learning networks
    const networks = [
      SocialLearningNetwork.createPeerLearningNetwork({
        name: 'STEM Innovators Network',
        description: 'Connect with fellow STEM enthusiasts and innovators',
        category: 'academic',
        subject: 'STEM',
        members: [userId, 'student_1', 'student_2', 'student_3'],
        moderators: ['teacher_1']
      }),
      SocialLearningNetwork.createPeerLearningNetwork({
        name: 'Creative Arts Collective',
        description: 'Share artistic projects and collaborate on creative endeavors',
        category: 'personal',
        subject: 'Arts',
        members: [userId, 'student_4', 'student_5'],
        moderators: ['teacher_4']
      })
    ]
    setPeerNetworks(networks)
  }

  const registerForEvent = (eventId) => {
    setCommunityEvents(prev => prev.map(event =>
      event.id === eventId
        ? { ...event, attendees: [...event.attendees, { id: userId, name: 'Current User' }] }
        : event
    ))
  }

  const joinForum = (forumId) => {
    setDiscussionForums(prev => prev.map(forum =>
      forum.id === forumId
        ? { ...forum, participants: [...forum.participants, userId] }
        : forum
    ))
  }

  const applyForMentorship = (mentorshipId) => {
    setMentorshipPrograms(prev => prev.map(program =>
      program.id === mentorshipId
        ? { ...program, status: 'applied' }
        : program
    ))
  }

  const joinKnowledgeExchange = (exchangeId) => {
    setKnowledgeExchanges(prev => prev.map(exchange =>
      exchange.id === exchangeId
        ? { ...exchange, participants: [...exchange.participants, { id: userId, name: 'Current User' }] }
        : exchange
    ))
  }

  const joinPeerNetwork = (networkId) => {
    setPeerNetworks(prev => prev.map(network =>
      network.id === networkId
        ? { ...network, members: [...network.members, userId] }
        : network
    ))
  }

  const renderCommunityEvents = () => (
    <div className="community-events">
      <div className="section-header">
        <h3>Community Events</h3>
        <button className="create-button">+ Create Event</button>
      </div>

      <div className="events-grid">
        {communityEvents.map(event => (
          <div key={event.id} className="event-card">
            <div className="event-header">
              <h4>{event.title}</h4>
              <span className={`event-type ${event.type}`}>{event.type}</span>
            </div>
            <p className="event-description">{event.description}</p>
            <div className="event-details">
              <div className="event-info">
                <span className="event-date">
                  📅 {event.startTime.toLocaleDateString()} at {event.startTime.toLocaleTimeString()}
                </span>
                <span className="event-location">📍 {event.location}</span>
                <span className="event-organizer">👤 {event.organizer.name}</span>
              </div>
              <div className="event-stats">
                <span className="attendees">
                  👥 {event.attendees.length}/{event.maxAttendees} attending
                </span>
                {event.registrationRequired && (
                  <span className="registration-required">✅ Registration Required</span>
                )}
              </div>
            </div>
            <div className="event-tags">
              {event.tags.map(tag => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
            <div className="event-actions">
              <button
                onClick={() => registerForEvent(event.id)}
                className="register-button"
                disabled={event.attendees.some(a => a.id === userId)}
              >
                {event.attendees.some(a => a.id === userId) ? 'Registered' : 'Register'}
              </button>
              <button>View Details</button>
              <button>Share</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderDiscussionForums = () => (
    <div className="discussion-forums">
      <div className="section-header">
        <h3>Discussion Forums</h3>
        <button className="create-button">+ Create Forum</button>
      </div>

      <div className="forums-grid">
        {discussionForums.map(forum => (
          <div key={forum.id} className="forum-card">
            <div className="forum-header">
              <h4>{forum.title}</h4>
              <span className={`forum-category ${forum.category}`}>{forum.category}</span>
            </div>
            <p className="forum-description">{forum.description}</p>
            <div className="forum-stats">
              <span className="topics">💬 {forum.statistics.totalTopics} topics</span>
              <span className="posts">📝 {forum.statistics.totalPosts} posts</span>
              <span className="active-users">👥 {forum.statistics.activeUsers} active users</span>
            </div>
            <div className="forum-moderators">
              <span>Moderators: {forum.moderators.join(', ')}</span>
            </div>
            <div className="forum-actions">
              <button
                onClick={() => joinForum(forum.id)}
                className="join-button"
                disabled={forum.participants.includes(userId)}
              >
                {forum.participants.includes(userId) ? 'Joined' : 'Join Forum'}
              </button>
              <button>Browse Topics</button>
              <button>Start Discussion</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderMentorshipPrograms = () => (
    <div className="mentorship-programs">
      <div className="section-header">
        <h3>Mentorship Programs</h3>
        <button className="create-button">+ Become a Mentor</button>
      </div>

      <div className="mentorship-grid">
        {mentorshipPrograms.map(program => (
          <div key={program.id} className="mentorship-card">
            <div className="mentorship-header">
              <h4>{program.title}</h4>
              <span className={`mentorship-type ${program.type.toLowerCase()}`}>{program.type}</span>
            </div>
            <p className="mentorship-description">{program.description}</p>
            <div className="mentorship-details">
              <div className="mentor-info">
                <span className="mentor">👨‍🏫 Mentor: {program.mentor.name}</span>
                <span className="subject">📚 Subject: {program.subject}</span>
                <span className="duration">⏱️ Duration: {program.duration}</span>
                <span className="frequency">📅 Frequency: {program.meetingFrequency}</span>
              </div>
            </div>
            <div className="mentorship-goals">
              <h5>Goals:</h5>
              <ul>
                {program.goals.map((goal, index) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            </div>
            <div className="mentorship-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${program.progress.overallProgress}%` }}
                ></div>
              </div>
              <span>{program.progress.overallProgress}% Complete</span>
            </div>
            <div className="mentorship-actions">
              <button
                onClick={() => applyForMentorship(program.id)}
                className="apply-button"
                disabled={program.status === 'applied'}
              >
                {program.status === 'applied' ? 'Applied' : 'Apply'}
              </button>
              <button>View Profile</button>
              <button>Message Mentor</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderKnowledgeExchange = () => (
    <div className="knowledge-exchange">
      <div className="section-header">
        <h3>Knowledge Exchange</h3>
        <button className="create-button">+ Create Exchange</button>
      </div>

      <div className="exchange-grid">
        {knowledgeExchanges.map(exchange => (
          <div key={exchange.id} className="exchange-card">
            <div className="exchange-header">
              <h4>{exchange.title}</h4>
              <span className={`exchange-type ${exchange.type}`}>{exchange.type}</span>
            </div>
            <p className="exchange-description">{exchange.description}</p>
            <div className="exchange-skills">
              <div className="offered-skills">
                <h5>Offering:</h5>
                <div className="skills-list">
                  {exchange.offeredSkills.map(skill => (
                    <span key={skill} className="skill offered">{skill}</span>
                  ))}
                </div>
              </div>
              <div className="requested-skills">
                <h5>Looking for:</h5>
                <div className="skills-list">
                  {exchange.requestedSkills.map(skill => (
                    <span key={skill} className="skill requested">{skill}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="exchange-details">
              <span className="time-commitment">⏰ {exchange.timeCommitment} hours/week</span>
              <span className="duration">📅 {exchange.duration}</span>
              <span className="format">🌐 {exchange.format}</span>
            </div>
            <div className="exchange-actions">
              <button
                onClick={() => joinKnowledgeExchange(exchange.id)}
                className="join-button"
                disabled={exchange.participants.some(p => p.id === userId)}
              >
                {exchange.participants.some(p => p.id === userId) ? 'Joined' : 'Join Exchange'}
              </button>
              <button>Contact Creator</button>
              <button>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPeerNetworks = () => (
    <div className="peer-networks">
      <div className="section-header">
        <h3>Peer Learning Networks</h3>
        <button className="create-button">+ Create Network</button>
      </div>

      <div className="networks-grid">
        {peerNetworks.map(network => (
          <div key={network.id} className="network-card">
            <div className="network-header">
              <h4>{network.name}</h4>
              <span className={`network-category ${network.category}`}>{network.category}</span>
            </div>
            <p className="network-description">{network.description}</p>
            <div className="network-details">
              <span className="subject">📚 {network.subject}</span>
              <span className="members">👥 {network.members.length} members</span>
              <span className="activity">📈 {network.analytics.engagementLevel}% engagement</span>
            </div>
            <div className="network-features">
              <h5>Features:</h5>
              <div className="features-list">
                {Object.entries(network.features).map(([feature, enabled]) =>
                  enabled && <span key={feature} className="feature">{feature.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                )}
              </div>
            </div>
            <div className="network-actions">
              <button
                onClick={() => joinPeerNetwork(network.id)}
                className="join-button"
                disabled={network.members.includes(userId)}
              >
                {network.members.includes(userId) ? 'Member' : 'Join Network'}
              </button>
              <button>Browse Content</button>
              <button>Start Discussion</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="community-building-platform">
      <div className="platform-header">
        <h2>Community Building Platform</h2>
        <p>Connect, collaborate, and grow together in our learning community</p>
      </div>

      <div className="platform-tabs">
        <button
          className={activeSection === 'events' ? 'active' : ''}
          onClick={() => setActiveSection('events')}
        >
          🎉 Events
        </button>
        <button
          className={activeSection === 'forums' ? 'active' : ''}
          onClick={() => setActiveSection('forums')}
        >
          💬 Forums
        </button>
        <button
          className={activeSection === 'mentorship' ? 'active' : ''}
          onClick={() => setActiveSection('mentorship')}
        >
          👨‍🏫 Mentorship
        </button>
        <button
          className={activeSection === 'exchange' ? 'active' : ''}
          onClick={() => setActiveSection('exchange')}
        >
          🔄 Knowledge Exchange
        </button>
        <button
          className={activeSection === 'networks' ? 'active' : ''}
          onClick={() => setActiveSection('networks')}
        >
          🌐 Peer Networks
        </button>
      </div>

      <div className="platform-content">
        {activeSection === 'events' && renderCommunityEvents()}
        {activeSection === 'forums' && renderDiscussionForums()}
        {activeSection === 'mentorship' && renderMentorshipPrograms()}
        {activeSection === 'exchange' && renderKnowledgeExchange()}
        {activeSection === 'networks' && renderPeerNetworks()}
      </div>

      <style jsx>{`
        .community-building-platform {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .platform-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 40px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 16px;
        }

        .platform-header h2 {
          margin: 0 0 10px 0;
          font-size: 32px;
          font-weight: 700;
        }

        .platform-header p {
          margin: 0;
          font-size: 18px;
          opacity: 0.9;
        }

        .platform-tabs {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }

        .platform-tabs button {
          padding: 12px 24px;
          border: 2px solid #e5e7eb;
          background: white;
          color: #6b7280;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 25px;
          transition: all 0.3s ease;
        }

        .platform-tabs button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .platform-tabs button:hover:not(.active) {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 24px;
          color: #1f2937;
          font-weight: 600;
        }

        .create-button {
          padding: 12px 24px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .create-button:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .events-grid, .forums-grid, .mentorship-grid, .exchange-grid, .networks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 24px;
        }

        .event-card, .forum-card, .mentorship-card, .exchange-card, .network-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .event-card:hover, .forum-card:hover, .mentorship-card:hover, .exchange-card:hover, .network-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }

        .event-header, .forum-header, .mentorship-header, .exchange-header, .network-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .event-header h4, .forum-header h4, .mentorship-header h4, .exchange-header h4, .network-header h4 {
          margin: 0;
          color: #1f2937;
          font-size: 20px;
          font-weight: 600;
        }

        .event-type, .forum-category, .mentorship-type, .exchange-type, .network-category {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .event-type.academic, .forum-category.academic, .mentorship-type.academic {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .event-type.social, .forum-category.general {
          background: #fef3c7;
          color: #d97706;
        }

        .event-type.cultural {
          background: #f3e8ff;
          color: #7c3aed;
        }

        .event-type.sports {
          background: #dcfce7;
          color: #16a34a;
        }

        .mentorship-type.career {
          background: #fecaca;
          color: #dc2626;
        }

        .exchange-type.skill_swap {
          background: #e0e7ff;
          color: #4338ca;
        }

        .exchange-type.study_buddy {
          background: #ecfdf5;
          color: #059669;
        }

        .network-category.personal {
          background: #fdf2f8;
          color: #be185d;
        }

        .event-description, .forum-description, .mentorship-description, .exchange-description, .network-description {
          color: #6b7280;
          margin-bottom: 16px;
          line-height: 1.6;
        }

        .event-details, .forum-stats, .mentorship-details, .exchange-details, .network-details {
          margin-bottom: 16px;
        }

        .event-info, .event-stats {
          margin-bottom: 8px;
        }

        .event-info span, .event-stats span, .forum-stats span, .mentorship-details span, .exchange-details span, .network-details span {
          display: inline-block;
          margin-right: 16px;
          margin-bottom: 4px;
          font-size: 14px;
          color: #374151;
        }

        .event-tags {
          margin-bottom: 16px;
        }

        .tag {
          display: inline-block;
          background: #f3f4f6;
          color: #374151;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          margin-right: 8px;
          margin-bottom: 4px;
        }

        .exchange-skills {
          margin-bottom: 16px;
        }

        .exchange-skills h5, .network-features h5, .mentorship-goals h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #374151;
          font-weight: 600;
        }

        .skills-list, .features-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .skill, .feature {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .skill.offered {
          background: #dcfce7;
          color: #16a34a;
        }

        .skill.requested {
          background: #fef3c7;
          color: #d97706;
        }

        .feature {
          background: #e0e7ff;
          color: #4338ca;
        }

        .mentorship-goals ul {
          margin: 8px 0 16px 0;
          padding-left: 20px;
        }

        .mentorship-goals li {
          color: #6b7280;
          margin-bottom: 4px;
        }

        .mentorship-progress, .progress-bar {
          margin-bottom: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: #10b981;
          transition: width 0.3s ease;
        }

        .event-actions, .forum-actions, .mentorship-actions, .exchange-actions, .network-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-actions button, .forum-actions button, .mentorship-actions button, .exchange-actions button, .network-actions button {
          flex: 1;
          min-width: 100px;
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .register-button, .join-button, .apply-button {
          background: #3b82f6 !important;
          color: white !important;
          border-color: #3b82f6 !important;
        }

        .register-button:hover, .join-button:hover, .apply-button:hover {
          background: #2563eb !important;
          transform: translateY(-1px);
        }

        .register-button:disabled, .join-button:disabled, .apply-button:disabled {
          background: #9ca3af !important;
          border-color: #9ca3af !important;
          cursor: not-allowed;
          transform: none;
        }

        .event-actions button:hover, .forum-actions button:hover, .mentorship-actions button:hover, .exchange-actions button:hover, .network-actions button:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .registration-required {
          color: #059669;
          font-weight: 500;
        }

        .forum-moderators {
          margin-bottom: 16px;
          font-size: 14px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .events-grid, .forums-grid, .mentorship-grid, .exchange-grid, .networks-grid {
            grid-template-columns: 1fr;
          }

          .platform-tabs {
            flex-direction: column;
            align-items: center;
          }

          .platform-tabs button {
            width: 200px;
          }
        }
      `}</style>
    </div>
  )
}

export default CommunityBuildingPlatform