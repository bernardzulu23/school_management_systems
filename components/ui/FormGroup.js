import React from 'react'
import FormField from '@/components/forms/FormField'

export function FormGroup({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  error = '',
  validate,
  description,
  disabled = false,
  className = '',
  icon,
  children,
}) {
  return (
    <FormField
      label={label}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      error={error}
      validate={validate}
      description={description}
      disabled={disabled}
      className={className}
      icon={icon}
    >
      {type === 'select' && children}
    </FormField>
  )
}

export function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-royalPurple-text1 flex items-center gap-2 border-b pb-2">
        {Icon && <Icon className="w-5 h-5" />}
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}
