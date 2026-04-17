import React, { useState } from 'react'
import StatusCard from './StatusCard'
import { DollarSign } from 'lucide-react'

const MobileMoneyCard = ({ moneyStats, testMobileMoneyPayment }) => {
  const [provider, setProvider] = useState('airtel')

  return (
    <StatusCard title="Mobile Money" icon={<DollarSign size={16} aria-hidden="true" />}>
      <div style={{ marginBottom: '10px' }} aria-label="Mobile money statistics">
        <span className="block">Total Transactions: {moneyStats.totalTransactions || 0}</span>
        <span className="block">Total Amount: K{moneyStats.totalAmount?.toFixed(2) || '0.00'}</span>
        <span className="block">Success Rate: {moneyStats.successRate || 0}%</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 12,
            background: 'white',
            outline: 'none',
          }}
          aria-label="Select mobile money provider"
        >
          <option value="airtel">Airtel Zambia</option>
          <option value="mtn">MTN Zambia</option>
          <option value="zamtel">Zamtel</option>
        </select>
      </div>
      <button
        onClick={() => testMobileMoneyPayment(provider)}
        style={{
          padding: '8px 12px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '12px',
          outline: 'none',
          transition: 'background 0.2s',
        }}
        aria-label="Test mobile money payment"
        onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.4)')}
        onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
        onMouseOver={(e) => (e.currentTarget.style.background = '#059669')}
        onMouseOut={(e) => (e.currentTarget.style.background = '#10b981')}
      >
        Test Payment
      </button>
    </StatusCard>
  )
}

export default MobileMoneyCard
