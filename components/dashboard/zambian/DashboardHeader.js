import React from 'react'

const DashboardHeader = ({ currentLanguage, handleLanguageChange, handleEmergencyButton }) => {
  return (
    <div className="bg-header rounded-[20px] p-6 mb-5 flex justify-between items-center gap-4">
      <div>
        <h1 className="m-0 text-white font-bold text-[22px]">🇿🇲 Zambian School Management</h1>
        <p className="mt-1 text-white/60 text-sm">Ultra-Low Infrastructure School System</p>
      </div>

      <div className="flex gap-2 items-center">
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="px-3 py-2 rounded-[10px] bg-white/[0.12] border border-white/[0.2] text-white text-sm font-semibold"
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
          className="px-3 py-2 rounded-[10px] bg-[#b91c1c] text-white text-sm font-semibold hover:bg-[#991b1b] active:scale-[0.97] transition-all"
          aria-label="Emergency"
        >
          🚨 EMERGENCY
        </button>
      </div>
    </div>
  )
}

export default DashboardHeader
