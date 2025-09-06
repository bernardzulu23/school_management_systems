# Cloudinary Integration for School Management System

This document explains how to use Cloudinary for profile picture management across all user roles in the school management system.

## Overview

The Cloudinary integration provides:
- **Secure image uploads** for profile pictures
- **Automatic optimization** and format conversion
- **Role-based folder organization**
- **Responsive image delivery**
- **Face detection and smart cropping**
- **File validation and security**

## Setup

### 1. Environment Variables

Add these variables to your `.env.local` file:

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=difpnhgwx
NEXT_PUBLIC_CLOUDINARY_API_KEY=516477923444212
CLOUDINARY_API_SECRET=P8zfzUuUw7a--mcgJVc01iQAz8c
CLOUDINARY_URL=cloudinary://516477923444212:P8zfzUuUw7a--mcgJVc01iQAz8c@difpnhgwx
```

### 2. Install Dependencies

```bash
npm install cloudinary next-cloudinary
```

### 3. Create Upload Preset

In your Cloudinary dashboard, create an unsigned upload preset named `school_management_profiles` with these settings:
- **Signing Mode**: Unsigned
- **Folder**: `school_management`
- **Auto-tagging**: `profile_picture`
- **Allowed formats**: `jpg,png,webp`
- **Max file size**: 5MB
- **Transformation**: Auto-crop to face, quality auto

## Usage

### Basic Profile Picture Upload

```jsx
import ProfilePictureUpload from '@/components/ui/ProfilePictureUpload'
import { uploadProfilePicture } from '@/lib/cloudinary-client'

function UserForm({ role = 'student' }) {
  const [profileFile, setProfileFile] = useState(null)
  
  const handleImageSelect = (file) => {
    setProfileFile(file)
  }
  
  const handleSubmit = async () => {
    if (profileFile) {
      const result = await uploadProfilePicture(profileFile, userId, role)
      if (result.success) {
        // Save result.url to database
        console.log('Profile picture URL:', result.url)
      }
    }
  }
  
  return (
    <ProfilePictureUpload
      onImageSelect={handleImageSelect}
      role={role}
      size="large"
    />
  )
}
```

### Display Profile Pictures

```jsx
import ProfilePictureDisplay from '@/components/ui/ProfilePictureDisplay'

function UserCard({ user }) {
  return (
    <ProfilePictureDisplay
      src={user.profile_picture_url}
      alt={user.name}
      name={user.name}
      role={user.role}
      size="medium"
    />
  )
}
```

### Optimized Image URLs

```jsx
import { getOptimizedImageUrl } from '@/lib/cloudinary-client'

// Generate different sizes
const thumbnailUrl = getOptimizedImageUrl(publicId, { width: 50, height: 50 })
const profileUrl = getOptimizedImageUrl(publicId, { width: 200, height: 200 })
```

## Components

### ProfilePictureUpload

Upload component with drag-and-drop, validation, and preview.

**Props:**
- `currentImage` - Current image URL
- `onImageSelect` - Callback when image is selected
- `onImageRemove` - Callback when image is removed
- `role` - User role for optimization
- `disabled` - Disable upload
- `size` - Component size (small, medium, large)

### ProfilePictureDisplay

Display component with fallbacks and role-based styling.

**Props:**
- `src` - Image URL
- `alt` - Alt text
- `size` - Display size (xs, sm, medium, large, xl, 2xl)
- `role` - User role for styling
- `name` - User name for initials fallback
- `showFallback` - Show fallback when no image
- `onClick` - Click handler

## Role-Based Features

### Folder Organization
- **Students**: `school_management/students/`
- **Teachers**: `school_management/teachers/`
- **HODs**: `school_management/hods/`
- **Headteachers**: `school_management/headteachers/`
- **Deputies**: `school_management/deputies/`
- **Admins**: `school_management/admins/`

### Size Optimization
- **Students**: 300x300px
- **Teachers**: 350x350px
- **HODs**: 400x400px
- **Headteachers/Deputies**: 500x500px

### Role Styling
- **Headteacher**: Purple ring, gradient background
- **Deputy**: Purple ring, lighter gradient
- **HOD**: Blue ring, blue gradient
- **Teacher**: Green ring, green gradient
- **Student**: Gray ring, gray gradient
- **Admin**: Red ring, red gradient

## File Validation

The system validates:
- **File size**: Maximum 5MB
- **File types**: JPG, PNG, WebP only
- **Content type**: Must be image/*
- **Security**: Client and server-side validation

## API Integration

### Upload Endpoint
```javascript
// POST /api/cloudinary/upload
const formData = new FormData()
formData.append('file', file)
formData.append('userId', userId)
formData.append('role', role)

const response = await fetch('/api/cloudinary/upload', {
  method: 'POST',
  body: formData
})
```

### Delete Endpoint
```javascript
// POST /api/cloudinary/delete
const response = await fetch('/api/cloudinary/delete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ publicId })
})
```

## Database Integration

Update your user tables to include:
```sql
ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(255);
ALTER TABLE users ADD COLUMN profile_picture_public_id VARCHAR(255);
```

## Security Features

1. **Unsigned uploads** with preset restrictions
2. **File type validation** on client and server
3. **Size limits** enforced
4. **Content scanning** via Cloudinary
5. **Role-based access** control
6. **Secure URLs** with transformations

## Performance Optimization

1. **Auto-format** delivery (WebP when supported)
2. **Auto-quality** optimization
3. **Progressive JPEG** loading
4. **CDN delivery** worldwide
5. **Responsive images** for different screen sizes
6. **Lazy loading** support

## Error Handling

```jsx
const handleUpload = async (file) => {
  try {
    const result = await uploadProfilePicture(file, userId, role)
    if (result.success) {
      // Handle success
    } else {
      // Handle upload error
      console.error('Upload failed:', result.error)
    }
  } catch (error) {
    // Handle network/system error
    console.error('System error:', error)
  }
}
```

## Testing

Use the demo component to test the integration:
```jsx
import CloudinaryDemo from '@/components/examples/CloudinaryDemo'

// Add to a test page
<CloudinaryDemo />
```

## Troubleshooting

### Common Issues

1. **Upload fails**: Check upload preset configuration
2. **Images not displaying**: Verify public_id format
3. **Slow loading**: Enable auto-format and auto-quality
4. **CORS errors**: Configure allowed domains in Cloudinary
5. **Size limits**: Check both client and Cloudinary limits

### Debug Mode

Enable debug logging:
```javascript
// In cloudinary-client.js
const DEBUG = process.env.NODE_ENV === 'development'
if (DEBUG) console.log('Upload result:', result)
```

## Best Practices

1. **Always validate** files before upload
2. **Use appropriate sizes** for different contexts
3. **Implement fallbacks** for missing images
4. **Cache optimized URLs** when possible
5. **Monitor usage** and costs
6. **Regular cleanup** of unused images
7. **Test across devices** and browsers

## Support

For issues with this integration:
1. Check Cloudinary dashboard for upload logs
2. Verify environment variables
3. Test with the demo component
4. Check browser console for errors
5. Review network requests in dev tools
