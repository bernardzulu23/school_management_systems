import React from 'react'
import PhaseCard, { StatusBadge } from './PhaseCard'

const PhaseOverview = ({ realTimeData }) => {
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      role="list"
      aria-label="System phases overview"
    >
      {/* Phase 1: Essential Survival Features */}
      <div role="listitem">
        <PhaseCard 
          title="Phase 1: Essential Survival" 
          icon="📱" 
          color="border-blue-500"
        >
          <div className="flex justify-between items-center py-1">
            <span>Offline System:</span>
            <StatusBadge status={realTimeData.phase1_stats?.offline_system} />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>SMS System:</span>
            <StatusBadge status={realTimeData.phase1_stats?.sms_system} />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Power Management:</span>
            <StatusBadge status={realTimeData.phase1_stats?.power_system} />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Language Support:</span>
            <StatusBadge status={realTimeData.phase1_stats?.language_system} />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Mobile Money:</span>
            <StatusBadge status={realTimeData.phase1_stats?.mobile_money_system} />
          </div>
        </PhaseCard>
      </div>

      {/* Phase 2: Rural Education */}
      <div role="listitem">
        <PhaseCard 
          title="Phase 2: Rural Education" 
          icon="🌾" 
          color="border-green-500"
        >
          <div className="flex justify-between items-center py-1">
            <span>Agricultural Calendar:</span>
            <StatusBadge status="Active" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Multi-Grade Classes:</span>
            <StatusBadge status="Configured" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Traveling Teachers:</span>
            <StatusBadge status="Scheduled" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Seasonal Adaptations:</span>
            <StatusBadge status="Applied" />
          </div>
        </PhaseCard>
      </div>

      {/* Phase 3: Health & Nutrition */}
      <div role="listitem">
        <PhaseCard 
          title="Phase 3: Health & Nutrition" 
          icon="🏥" 
          color="border-red-500"
        >
          <div className="flex justify-between items-center py-1">
            <span>Health Monitoring:</span>
            <StatusBadge status="Active" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Nutrition Tracking:</span>
            <StatusBadge status="Operational" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Feeding Program:</span>
            <StatusBadge status="Running" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Community Health:</span>
            <StatusBadge status="Coordinated" />
          </div>
        </PhaseCard>
      </div>

      {/* Phase 4: Economic & Transport */}
      <div role="listitem">
        <PhaseCard 
          title="Phase 4: Economic & Transport" 
          icon="🚌" 
          color="border-yellow-500"
        >
          <div className="flex justify-between items-center py-1">
            <span>Transport Routes:</span>
            <StatusBadge status="Mapped" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Economic Support:</span>
            <StatusBadge status="Available" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Skills Training:</span>
            <StatusBadge status="Ongoing" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Income Projects:</span>
            <StatusBadge status="Active" />
          </div>
        </PhaseCard>
      </div>

      {/* Phase 5: Technical Sustainability */}
      <div role="listitem">
        <PhaseCard 
          title="Phase 5: Sustainability" 
          icon="♻️" 
          color="border-purple-500"
        >
          <div className="flex justify-between items-center py-1">
            <span>Data Optimization:</span>
            <StatusBadge status="Optimized" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Resource Recycling:</span>
            <StatusBadge status="Active" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Long-term Storage:</span>
            <StatusBadge status="Configured" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Local Integration:</span>
            <StatusBadge status="Integrated" />
          </div>
        </PhaseCard>
      </div>
    </div>
  )
}

export default PhaseOverview
