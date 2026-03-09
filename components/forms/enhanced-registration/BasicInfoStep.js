import React from 'react'
import { User, Phone, Calendar, MapPin } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'
import { GENDERS } from '@/lib/constants'

export default function BasicInfoStep({ formData, errors, onInputChange, role }) {
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0]

  return (
    <FormSection title="Basic Information" icon={User}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormGroup
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          placeholder="Enter your full name"
          required
          icon={User}
          error={errors.name}
          aria-describedby="name-error"
        />

        {role !== 'student' && (
          <FormGroup
            label="Contact Number"
            name="contact_number"
            type="tel"
            value={formData.contact_number}
            onChange={onInputChange}
            placeholder="Enter your phone number"
            required
            icon={Phone}
            error={errors.contact_number}
            aria-describedby="contact_number-error"
          />
        )}

        <FormGroup
          label="Date of Birth"
          name="date_of_birth"
          type="date"
          value={formData.date_of_birth}
          onChange={onInputChange}
          required
          icon={Calendar}
          min="1950-01-01"
          max={maxDate}
          error={errors.date_of_birth}
          aria-describedby="date_of_birth-error"
        />

        <FormGroup
          label="Gender"
          name="gender"
          type="select"
          value={formData.gender}
          onChange={onInputChange}
          required
          error={errors.gender}
          icon={User}
          aria-describedby="gender-error"
        >
          <option value="">Select Gender</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </FormGroup>

        <FormGroup
          label="Address"
          name="address"
          type="textarea"
          value={formData.address}
          onChange={onInputChange}
          placeholder="Enter your full address"
          icon={MapPin}
          className="md:col-span-2"
          rows={3}
          error={errors.address}
          aria-describedby="address-error"
        />
      </div>
    </FormSection>
  )
}
