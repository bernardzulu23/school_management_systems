import React from 'react'
import StatusCard from './StatusCard'

const MobileMoneyCard = ({ moneyStats, testMobileMoneyPayment }) => {
  return (
    <StatusCard title="Mobile Money" icon="💰">
      <div style={{ marginBottom: '10px' }} aria-label="Mobile money statistics">
        <span className="block">Total Transactions: {moneyStats.totalTransactions || 0}</span>
        <span className="block">Total Amount: K{moneyStats.totalAmount?.toFixed(2) || '0.00'}</span>
        <span className="block">Success Rate: {moneyStats.successRate || 0}%</span>
      </div>
      <button
        onClick={testMobileMoneyPayment}
        style={{
          padding: '8px 12px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '12px',
          outline: 'none',
          transition: 'background 0.2s'
        }}
        aria-label="Test mobile money payment"
        onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.4)'}
        onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
        onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
        onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
      >
        Test Payment
      </button>
    </StatusCard>
  )
}

export default MobileMoneyCard
