import React, { useState } from 'react'
import { Shield, Mail, Eye, EyeOff, KeyRound } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'

export default function AccountSetupStep({
  formData,
  errors,
  onInputChange,
  requireEnrollmentCode = false,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <FormSection title="Account Setup" icon={Shield}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormGroup
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={onInputChange}
          placeholder="Enter your email address"
          required
          icon={Mail}
          error={errors.email}
          aria-describedby="email-error"
        />

        <div className="hidden md:block"></div>

        <div className="relative">
          <FormGroup
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={onInputChange}
            placeholder="Create a strong password"
            required
            icon={Shield}
            error={errors.password}
            aria-describedby="password-error"
          />
          <button
            type="button"
            className="absolute right-3 top-[38px] text-royalPurple-text3 hover:text-royalPurple-text2 focus:outline-none focus:text-royalPurple-accentTx"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <div className="relative">
          <FormGroup
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={onInputChange}
            placeholder="Confirm your password"
            required
            icon={Shield}
            error={errors.confirmPassword}
            aria-describedby="confirmPassword-error"
          />
          <button
            type="button"
            className="absolute right-3 top-[38px] text-royalPurple-text3 hover:text-royalPurple-text2 focus:outline-none focus:text-royalPurple-accentTx"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {requireEnrollmentCode ? (
        <div className="mt-6">
          <FormGroup
            label="One-time enrollment code (OTC)"
            name="enrollmentCode"
            value={formData.enrollmentCode || ''}
            onChange={onInputChange}
            placeholder="Enter the code from your solo workspace"
            required
            icon={KeyRound}
            error={errors.enrollmentCode}
            aria-describedby="enrollmentCode-error"
          />
          <p className="text-xs text-royalPurple-text3 mt-2">
            Generate a new code on your Solo workspace before registering each student. Each code
            can only be used once.
          </p>
        </div>
      ) : null}

      <div className="mt-6 p-4 bg-royalPurple-accent rounded-lg border border-royalPurple-border2">
        <h4 className="font-medium text-royalPurple-accentTx mb-2">Password Requirements:</h4>
        <ul className="text-sm text-royalPurple-accentTx space-y-1">
          <li>• At least 6 characters long</li>
          <li>• Include both letters and numbers</li>
          <li>• Use a unique password you haven't used elsewhere</li>
        </ul>
      </div>
    </FormSection>
  )
}
