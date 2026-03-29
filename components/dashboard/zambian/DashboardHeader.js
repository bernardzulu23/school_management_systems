import React from 'react'

const DashboardHeader = ({ currentLanguage, handleLanguageChange, handleEmergencyButton }) => {
  return (
    <div className="bg-royalPurple-deep border border-royalPurple-border rounded-2xl p-6 mb-5 flex justify-between items-center gap-4">
      <div>
        <h1 className="m-0 text-royalPurple-text1 font-bold text-[22px]">
          🇿🇲 Zambian School Management
        </h1>
        <p className="mt-1 text-royalPurple-text2 text-sm">
          Ultra-Low Infrastructure School System
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 text-sm font-semibold"
          aria-label="Language selector"
        >
          <option value="en">English</option>
          <option value="bem">Ichibemba</option>
          <option value="ton">Chitonga</option>
          <option value="nya">Chinyanja</option>
          <option value="loz">Silozi</option>
        </select>

        <button
          onClick={handleEmergencyButton}
          className="px-3 py-2 rounded-lg bg-royalPurple-danger text-royalPurple-dangerTx text-sm font-semibold hover:bg-royalPurple-danger/80 active:scale-[0.97] transition-colors"
          aria-label="Emergency"
        >
          🚨 EMERGENCY
        </button>
      </div>
    </div>
  )
}

export default DashboardHeader
