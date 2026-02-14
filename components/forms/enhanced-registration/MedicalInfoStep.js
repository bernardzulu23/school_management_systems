import React from 'react';
import { Heart, Activity, AlertCircle, ClipboardList } from 'lucide-react';
import { FormGroup, FormSection } from '@/components/ui/FormGroup';
import { BLOOD_TYPES } from '@/lib/constants';

export default function MedicalInfoStep({ formData, errors, onInputChange }) {
  return (
    <FormSection title="Medical Information" icon={Heart}>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormGroup
            label="Blood Type"
            name="blood_type"
            type="select"
            value={formData.blood_type}
            onChange={onInputChange}
            error={errors.blood_type}
            icon={Activity}
            aria-describedby="blood_type-error"
          >
            <option value="">Select Blood Type</option>
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </FormGroup>

          <FormGroup
            label="Medical Aid Scheme"
            name="medical_aid_scheme"
            value={formData.medical_aid_scheme}
            onChange={onInputChange}
            placeholder="e.g., CIMAS, PSMAS"
            icon={Activity}
            error={errors.medical_aid_scheme}
            aria-describedby="medical_aid_scheme-error"
          />
        </div>

        <div className="bg-red-50 p-6 rounded-xl border border-red-200">
          <h4 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Allergies & Conditions
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormGroup
                label="Has Allergies?"
                name="has_allergies"
                type="select"
                value={formData.has_allergies}
                onChange={onInputChange}
                error={errors.has_allergies}
                icon={AlertCircle}
                aria-describedby="has_allergies-error"
              >
                <option value="">Select Option</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </FormGroup>
            </div>

            {formData.has_allergies === 'yes' && (
              <FormGroup
                label="List Allergies"
                name="food_allergies"
                type="textarea"
                value={formData.food_allergies}
                onChange={onInputChange}
                rows={2}
                placeholder="Please list all known allergies"
                icon={ClipboardList}
                error={errors.food_allergies}
                aria-describedby="food_allergies-error"
              />
            )}
          </div>
        </div>
      </div>
    </FormSection>
  );
}
