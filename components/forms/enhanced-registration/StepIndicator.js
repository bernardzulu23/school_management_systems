import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function StepIndicator({ steps, currentStep, completedSteps, onStepClick }) {
  return (
    <div className="form-step-indicator">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const isCompleted = completedSteps.has(step.id);
        const isAccessible = step.id <= currentStep || completedSteps.has(step.id - 1);
        const StepIcon = step.icon;

        return (
          <div
            key={step.id}
            className={`step-item ${isActive ? 'active' : isCompleted ? 'completed' : 'inactive'} ${
              isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
            onClick={() => isAccessible && onStepClick(step.id)}
          >
            <div className={`step-number ${isActive ? 'active' : isCompleted ? 'completed' : 'inactive'}`}>
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
            </div>
            <div className="hidden md:block">
              <div className="font-medium text-sm">{step.title}</div>
              <div className="text-xs opacity-75">{step.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
