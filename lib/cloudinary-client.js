/**
 * Client-side Cloudinary utilities for the school management system
 * This file provides client-side image upload and management functionality
 */

// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  uploadPreset: 'school_management_profiles' // You'll need to create this in Cloudinary dashboard
};

// Role-based folder organization
const ROLE_FOLDERS = {
  student: 'school_management/students',
  teacher: 'school_management/teachers',
  hod: 'school_management/hods',
  headteacher: 'school_management/headteachers',
  deputy: 'school_management/deputies',
  admin: 'school_management/admins'
};

// File validation settings
const UPLOAD_SETTINGS = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  transformation: {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'webp'
  }
};

/**
 * Upload profile picture to Cloudinary using unsigned upload
 * @param {File} file - The image file to upload
 * @param {string} userId - User ID for unique naming
 * @param {string} role - User role for folder organization
 * @returns {Promise<Object>} Upload result with URL and public_id
 */
export async function uploadProfilePicture(file, userId, role) {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Create FormData for upload
    const formData = new FormData();
    const folder = ROLE_FOLDERS[role] || 'school_management/users';
    const publicId = `${folder}/${userId}_${Date.now()}`;

    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('public_id', publicId);
    formData.append('folder', folder);
    formData.append('tags', `role:${role},user:${userId},profile_picture`);
    formData.append('context', `user_id=${userId}|role=${role}|upload_date=${new Date().toISOString()}`);

    // Add transformations
    const transformation = getUploadPreset(role);
    formData.append('transformation', JSON.stringify([transformation]));

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      version: result.version
    };

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}

/**
 * Generate optimized URL for profile picture display
 * @param {string} publicId - The public_id of the image
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(publicId, options = {}) {
  if (!publicId || !CLOUDINARY_CONFIG.cloudName) {
    return null;
  }

  const defaultOptions = {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'webp'
  };

  const transformOptions = { ...defaultOptions, ...options };
  
  // Build transformation string
  const transformations = Object.entries(transformOptions)
    .map(([key, value]) => `${key}_${value}`)
    .join(',');

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${transformations}/${publicId}`;
}

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export function validateImageFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors };
  }

  // Check file size
  if (file.size > UPLOAD_SETTINGS.maxFileSize) {
    errors.push(`File size must be less than ${UPLOAD_SETTINGS.maxFileSize / 1024 / 1024}MB`);
  }

  // Check file type
  const fileExtension = file.name.split('.').pop().toLowerCase();
  if (!UPLOAD_SETTINGS.allowedFormats.includes(fileExtension)) {
    errors.push(`Invalid file format. Allowed formats: ${UPLOAD_SETTINGS.allowedFormats.join(', ')}`);
  }

  // Check if it's actually an image
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get upload preset for different roles
 * @param {string} role - User role
 * @returns {Object} Upload preset configuration
 */
export function getUploadPreset(role) {
  const basePreset = {
    ...UPLOAD_SETTINGS.transformation,
    flags: 'progressive'
  };

  // Role-specific customizations
  switch (role) {
    case 'headteacher':
    case 'deputy':
      return {
        ...basePreset,
        width: 500,
        height: 500
      };
    case 'hod':
      return {
        ...basePreset,
        width: 400,
        height: 400
      };
    case 'teacher':
      return {
        ...basePreset,
        width: 350,
        height: 350
      };
    case 'student':
      return {
        ...basePreset,
        width: 300,
        height: 300
      };
    default:
      return basePreset;
  }
}

/**
 * Delete image from Cloudinary (requires backend API call)
 * @param {string} publicId - The public_id of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProfilePicture(publicId) {
  try {
    // This would typically be handled by your backend API
    // since it requires the API secret
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId })
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: result.success,
      result: result.result
    };

  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message || 'Delete failed'
    };
  }
}

/**
 * Generate responsive image URLs for different screen sizes
 * @param {string} publicId - The public_id of the image
 * @param {string} role - User role for size optimization
 * @returns {Object} Object with different sized URLs
 */
export function getResponsiveImageUrls(publicId, role = 'student') {
  if (!publicId) return {};

  const baseOptions = getUploadPreset(role);
  
  return {
    thumbnail: getOptimizedImageUrl(publicId, { ...baseOptions, width: 50, height: 50 }),
    small: getOptimizedImageUrl(publicId, { ...baseOptions, width: 100, height: 100 }),
    medium: getOptimizedImageUrl(publicId, { ...baseOptions, width: 200, height: 200 }),
    large: getOptimizedImageUrl(publicId, { ...baseOptions, width: 400, height: 400 }),
    original: getOptimizedImageUrl(publicId, baseOptions)
  };
}

/**
 * Extract public_id from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} Public ID or null if invalid
 */
export function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Match Cloudinary URL pattern and extract public_id
    const match = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|webp|gif)$/i);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
}

export default {
  uploadProfilePicture,
  getOptimizedImageUrl,
  validateImageFile,
  getUploadPreset,
  deleteProfilePicture,
  getResponsiveImageUrls,
  extractPublicIdFromUrl,
  CLOUDINARY_CONFIG,
  ROLE_FOLDERS,
  UPLOAD_SETTINGS
};
