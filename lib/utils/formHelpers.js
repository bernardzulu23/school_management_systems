/**
 * Common form input change handler
 * @param {Function} setFormData - React state setter function
 */
export const handleInputChange = (setFormData) => (e) => {
  const { name, value, type, checked } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value
  }));
};

/**
 * Common multi-select change handler (e.g., for subjects)
 * @param {Function} setFormData - React state setter function
 * @param {string} fieldName - Name of the field in formData (default: 'subjects')
 */
export const handleMultiSelectChange = (setFormData, fieldName = 'subjects') => (id, checked) => {
  const numericId = parseInt(id);
  setFormData(prev => ({
    ...prev,
    [fieldName]: checked 
      ? [...prev[fieldName], numericId]
      : prev[fieldName].filter(item => item !== numericId)
  }));
};

/**
 * Formats a full name from first and last name
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {string}
 */
export const formatFullName = (firstName, lastName) => {
  return `${firstName} ${lastName}`.trim();
};
