'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { validateImageFile } from '@/lib/cloudinary'
import { 
  Upload, 
  User, 
  X, 
  Camera, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePictureUpload({ 
  currentImage, 
  onImageSelect, 
  onImageRemove,
  role = 'student',
  disabled = false,
  size = 'medium' // small, medium, large
}) {
  const [preview, setPreview] = useState(currentImage || null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Size configurations
  const sizeConfig = {
    small: { width: 'w-20', height: 'h-20', text: 'text-xs' },
    medium: { width: 'w-32', height: 'h-32', text: 'text-sm' },
    large: { width: 'w-48', height: 'h-48', text: 'text-base' }
  }

  const config = sizeConfig[size] || sizeConfig.medium

  const handleFileSelect = (file) => {
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error))
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // Pass file to parent component
    if (onImageSelect) {
      onImageSelect(file)
    }

    toast.success('Image selected successfully')
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onImageRemove) {
      onImageRemove()
    }
    toast.success('Image removed')
  }

  const handleCameraClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          relative ${config.width} ${config.height} mx-auto
          border-2 border-dashed rounded-full
          transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${preview ? 'border-solid border-gray-200' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleCameraClick}
      >
        {/* Preview Image */}
        {preview ? (
          <div className="relative w-full h-full">
            <img
              src={preview}
              alt="Profile preview"
              className="w-full h-full object-cover rounded-full"
            />
            {/* Remove Button */}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveImage()
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {/* Upload Overlay */}
            {!disabled && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
        ) : (
          /* Upload Placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                <User className="h-8 w-8 mb-2" />
                <Upload className="h-4 w-4" />
              </>
            )}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Upload Instructions */}
      <div className={`text-center ${config.text} text-gray-600`}>
        {preview ? (
          <p>Click to change profile picture</p>
        ) : (
          <div>
            <p>Click or drag to upload</p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, WebP up to 5MB
            </p>
          </div>
        )}
      </div>

      {/* Upload Button (Alternative) */}
      {!preview && (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCameraClick}
            disabled={disabled || isUploading}
            className="flex items-center space-x-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <span>Choose Photo</span>
          </Button>
        </div>
      )}

      {/* Role-specific Guidelines */}
      <div className={`${config.text} text-gray-500 text-center`}>
        {role === 'headteacher' || role === 'deputy' ? (
          <p className="text-xs">Professional headshot recommended</p>
        ) : role === 'teacher' || role === 'hod' ? (
          <p className="text-xs">Clear, professional photo preferred</p>
        ) : (
          <p className="text-xs">Clear photo of yourself</p>
        )}
      </div>
    </div>
  )
}

// Validation Status Component
export function ValidationStatus({ file, className = '' }) {
  if (!file) return null

  const validation = validateImageFile(file)

  return (
    <div className={`space-y-2 ${className}`}>
      {validation.isValid ? (
        <div className="flex items-center text-green-600 text-sm">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span>Image is valid</span>
        </div>
      ) : (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <div key={index} className="flex items-center text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
