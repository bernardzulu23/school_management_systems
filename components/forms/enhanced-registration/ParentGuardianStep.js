import React from 'react'
import { Users, User, Phone, Mail, Briefcase } from 'lucide-react'
import { FormGroup, FormSection } from '@/components/ui/FormGroup'

export default function ParentGuardianStep({ formData, errors, onInputChange }) {
  return (
    <FormSection title="Parent/Guardian Information" icon={Users}>
      <div className="space-y-8">
        {/* Father's Information */}
        <div className="bg-royalPurple-accent p-6 rounded-xl border border-royalPurple-border2">
          <h4 className="text-lg font-semibold text-royalPurple-accentTx mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Father's Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup
              label="Father's Full Name"
              name="parent_father_name"
              value={formData.parent_father_name}
              onChange={onInputChange}
              placeholder="Enter father's full name"
              required
              icon={User}
              error={errors.parent_father_name}
              aria-describedby="parent_father_name-error"
            />
            <FormGroup
              label="Father's Contact Number"
              name="parent_father_contact"
              type="tel"
              value={formData.parent_father_contact}
              onChange={onInputChange}
              placeholder="Enter father's phone number"
              required
              icon={Phone}
              error={errors.parent_father_contact}
              aria-describedby="parent_father_contact-error"
            />
            <FormGroup
              label="Father's Email"
              name="parent_father_email"
              type="email"
              value={formData.parent_father_email}
              onChange={onInputChange}
              placeholder="Enter father's email"
              icon={Mail}
              error={errors.parent_father_email}
              aria-describedby="parent_father_email-error"
            />
            <FormGroup
              label="Father's Occupation"
              name="parent_father_occupation"
              value={formData.parent_father_occupation}
              onChange={onInputChange}
              placeholder="Enter father's occupation"
              icon={Briefcase}
              error={errors.parent_father_occupation}
              aria-describedby="parent_father_occupation-error"
            />
          </div>
        </div>

        {/* Mother's Information */}
        <div className="bg-royalPurple-card2 p-6 rounded-xl border border-royalPurple-border">
          <h4 className="text-lg font-semibold text-royalPurple-text1 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Mother's Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup
              label="Mother's Full Name"
              name="parent_mother_name"
              value={formData.parent_mother_name}
              onChange={onInputChange}
              placeholder="Enter mother's full name"
              icon={User}
              error={errors.parent_mother_name}
              aria-describedby="parent_mother_name-error"
            />
            <FormGroup
              label="Mother's Contact Number"
              name="parent_mother_contact"
              type="tel"
              value={formData.parent_mother_contact}
              onChange={onInputChange}
              placeholder="Enter mother's phone number"
              icon={Phone}
              error={errors.parent_mother_contact}
              aria-describedby="parent_mother_contact-error"
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-royalPurple-card2 p-6 rounded-xl border border-royalPurple-border">
          <h4 className="text-lg font-semibold text-royalPurple-text1 mb-4 flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Emergency Contact
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup
              label="Emergency Contact Name"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={onInputChange}
              placeholder="Enter emergency contact name"
              icon={User}
              error={errors.emergency_contact_name}
              aria-describedby="emergency_contact_name-error"
            />
            <FormGroup
              label="Emergency Contact Phone"
              name="emergency_contact_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={onInputChange}
              placeholder="Enter emergency contact phone"
              icon={Phone}
              error={errors.emergency_contact_phone}
              aria-describedby="emergency_contact_phone-error"
            />
          </div>
        </div>
      </div>
    </FormSection>
  )
}
