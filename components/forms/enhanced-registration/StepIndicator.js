import React from 'react'

export default function StepIndicator({ steps, currentStep, completedSteps, onStepClick }) {
  return (
    <div className="flex items-center gap-3 mb-6 overflow-x-auto">
      {steps.map((step, i) => {
        const stepId = step.id ?? i + 1
        const isActive = currentStep === stepId
        const isCompletedVisual = i < currentStep - 1
        const isAccessible = stepId <= currentStep || completedSteps.has(stepId - 1)
        const label = step.label || step.title || step.name

        const circleClass = isCompletedVisual
          ? 'bg-royalPurple-success text-royalPurple-successTx border-royalPurple-border'
          : isActive
            ? 'bg-royalPurple-accent text-royalPurple-deep border-royalPurple-accent'
            : 'bg-royalPurple-card2 text-royalPurple-text2 border-royalPurple-border'

        return (
          <div key={stepId} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => isAccessible && onStepClick(stepId)}
              disabled={!isAccessible}
              className={`flex items-center gap-2 ${isAccessible ? '' : 'opacity-60 cursor-not-allowed'}`}
            >
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${circleClass}`}
                aria-label={`Step ${i + 1}: ${label}`}
              >
                {isCompletedVisual ? '✓' : i + 1}
              </div>
              <div className="text-sm font-medium text-royalPurple-text2 whitespace-nowrap">
                {label}
              </div>
            </button>

            {i < steps.length - 1 && <div className="mx-3 h-px w-10 bg-royalPurple-border" />}
          </div>
        )
      })}
    </div>
  )
}
