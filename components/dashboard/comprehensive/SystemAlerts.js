import React from 'react'

const SystemAlerts = ({ alerts }) => {
  return (
    <section
      className="bg-royalPurple-card rounded-lg shadow-md p-6"
      aria-labelledby="system-alerts-title"
    >
      <h3 id="system-alerts-title" className="text-lg font-semibold text-royalPurple-text1 mb-4">
        🚨 System Alerts
      </h3>
      {alerts.length === 0 ? (
        <p className="text-royalPurple-text3 italic">No active alerts</p>
      ) : (
        <div className="space-y-2" role="list">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              role="listitem"
              className={`p-3 rounded border-l-4 transition-all hover:shadow-sm ${
                alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
                  : alert.type === 'error'
                    ? 'bg-royalPurple-danger border-royalPurple-border text-royalPurple-dangerTx'
                    : 'bg-royalPurple-accent border-royalPurple-border2 text-royalPurple-accentTx'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <p className="text-sm font-medium">{alert.message}</p>
                <time
                  dateTime={alert.timestamp.toISOString()}
                  className="text-xs opacity-70 whitespace-nowrap"
                >
                  {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default SystemAlerts
