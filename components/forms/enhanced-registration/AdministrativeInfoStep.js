import React from 'react';
import { Building, FileText, GraduationCap } from 'lucide-react';
import { FormGroup, FormSection } from '@/components/ui/FormGroup';

export default function AdministrativeInfoStep({ formData, errors, onInputChange }) {
  return (
    <FormSection title="Administrative Information" icon={Building}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormGroup
          label="Employee ID"
          name="employee_id"
          value={formData.employee_id}
          onChange={onInputChange}
          placeholder="Enter employee ID"
          required
          icon={FileText}
          error={errors.employee_id}
          aria-describedby="employee_id-error"
        />

        <FormGroup
          label="Qualifications"
          name="qualifications"
          type="textarea"
          value={formData.qualifications}
          onChange={onInputChange}
          rows={3}
          placeholder="Enter your qualifications"
          required
          icon={GraduationCap}
          className="md:col-span-2"
          error={errors.qualifications}
          aria-describedby="qualifications-error"
        />
      </div>
    </FormSection>
  );
}
