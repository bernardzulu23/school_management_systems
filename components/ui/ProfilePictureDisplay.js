'use client'

import { useEffect, useState } from 'react'
import { User, AlertCircle } from 'lucide-react'

export default function ProfilePictureDisplay({
  src,
  alt = 'Profile picture',
  size = 'medium',
  role = 'student',
  name = '',
  showFallback = true,
  className = '',
  onClick,
  loading = false,
}) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  useEffect(() => {
    setImageError(false)
    setImageLoading(true)
  }, [src])

  // Size configurations
  const sizeConfig = {
    xs: { width: 'w-6', height: 'h-6', text: 'text-xs', icon: 'h-3 w-3' },
    sm: { width: 'w-8', height: 'h-8', text: 'text-xs', icon: 'h-4 w-4' },
    medium: { width: 'w-12', height: 'h-12', text: 'text-sm', icon: 'h-6 w-6' },
    large: { width: 'w-20', height: 'h-20', text: 'text-base', icon: 'h-8 w-8' },
    xl: { width: 'w-32', height: 'h-32', text: 'text-lg', icon: 'h-12 w-12' },
    '2xl': { width: 'w-48', height: 'h-48', text: 'text-xl', icon: 'h-16 w-16' },
  }

  const config = sizeConfig[size] || sizeConfig.medium

  // Role-based styling
  const roleStyles = {
    headteacher: 'ring-2 ring-royalPurple-border2 bg-royalPurple-pill',
    deputy: 'ring-2 ring-royalPurple-border2 bg-royalPurple-card2',
    hod: 'ring-2 ring-royalPurple-border bg-royalPurple-card2',
    teacher: 'ring-2 ring-royalPurple-border bg-royalPurple-muted',
    student: 'ring-2 ring-royalPurple-border bg-royalPurple-card2',
    admin: 'ring-2 ring-royalPurple-border2 bg-royalPurple-pill',
  }

  const roleStyle = roleStyles[role] || roleStyles.student

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const handleClick = () => {
    if (onClick && !loading) {
      onClick()
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div
        className={`
          ${config.width} ${config.height} 
          rounded-full bg-royalPurple-card2 animate-pulse
          flex items-center justify-center
          ${className}
        `}
      >
        <User className={`${config.icon} text-royalPurple-text3`} />
      </div>
    )
  }

  // Show image if available and no error
  if (src && !imageError) {
    return (
      <div
        className={`
          relative ${config.width} ${config.height} 
          rounded-full overflow-hidden
          ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
          ${className}
        `}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={alt}
          className={`
            absolute inset-0 w-full h-full object-cover
            ${imageLoading ? 'opacity-0' : 'opacity-100'}
            transition-opacity duration-200
          `}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Loading overlay */}
        {imageLoading && (
          <div className="absolute inset-0 bg-royalPurple-card2 animate-pulse flex items-center justify-center">
            <User className={`${config.icon} text-royalPurple-text3`} />
          </div>
        )}

        {/* Role indicator */}
        <div className={`absolute inset-0 rounded-full ${roleStyle.split('bg-')[0]}`} />
      </div>
    )
  }

  // Show fallback
  if (showFallback) {
    return (
      <div
        className={`
          ${config.width} ${config.height} 
          rounded-full ${roleStyle}
          flex items-center justify-center
          text-royalPurple-text1 font-semibold ${config.text}
          ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
          ${className}
        `}
        onClick={handleClick}
      >
        {name ? getInitials(name) : <User className={config.icon} />}
      </div>
    )
  }

  // Show error state
  return (
    <div
      className={`
        ${config.width} ${config.height} 
        rounded-full bg-royalPurple-danger border-2 border-royalPurple-border
        flex items-center justify-center
        ${className}
      `}
    >
      <AlertCircle className={`${config.icon} text-royalPurple-dangerTx`} />
    </div>
  )
}

// Avatar Group Component for showing multiple profile pictures
export function ProfilePictureGroup({
  profiles = [],
  maxVisible = 3,
  size = 'medium',
  className = '',
}) {
  const visibleProfiles = profiles.slice(0, maxVisible)
  const remainingCount = profiles.length - maxVisible

  const sizeConfig = {
    xs: { width: 'w-6', height: 'h-6', text: 'text-xs', overlap: '-ml-1' },
    sm: { width: 'w-8', height: 'h-8', text: 'text-xs', overlap: '-ml-2' },
    medium: { width: 'w-12', height: 'h-12', text: 'text-sm', overlap: '-ml-3' },
    large: { width: 'w-20', height: 'h-20', text: 'text-base', overlap: '-ml-4' },
  }

  const config = sizeConfig[size] || sizeConfig.medium

  return (
    <div className={`flex items-center ${className}`}>
      {visibleProfiles.map((profile, index) => (
        <div
          key={profile.id || index}
          className={`
            ${index > 0 ? config.overlap : ''}
            border-2 border-white rounded-full
          `}
          style={{ zIndex: visibleProfiles.length - index }}
        >
          <ProfilePictureDisplay
            src={profile.profile_picture_url}
            alt={profile.name}
            name={profile.name}
            role={profile.role}
            size={size}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={`
            ${config.overlap} ${config.width} ${config.height}
            rounded-full bg-royalPurple-muted text-royalPurple-text1
            flex items-center justify-center
            font-semibold ${config.text}
            border-2 border-white
          `}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Profile Picture with Status Indicator
export function ProfilePictureWithStatus({
  src,
  alt,
  name,
  role,
  size = 'medium',
  status = 'offline', // online, offline, away, busy
  className = '',
}) {
  const statusColors = {
    online: 'bg-royalPurple-success',
    offline: 'bg-royalPurple-card2',
    away: 'bg-royalPurple-accent',
    busy: 'bg-royalPurple-danger',
  }

  const statusColor = statusColors[status] || statusColors.offline

  const sizeConfig = {
    sm: { indicator: 'w-2 h-2', position: 'bottom-0 right-0' },
    medium: { indicator: 'w-3 h-3', position: 'bottom-0 right-0' },
    large: { indicator: 'w-4 h-4', position: 'bottom-1 right-1' },
  }

  const config = sizeConfig[size] || sizeConfig.medium

  return (
    <div className={`relative inline-block ${className}`}>
      <ProfilePictureDisplay src={src} alt={alt} name={name} role={role} size={size} />

      {/* Status Indicator */}
      <div
        className={`
          absolute ${config.position}
          ${config.indicator} ${statusColor}
          rounded-full border-2 border-white
        `}
      />
    </div>
  )
}
