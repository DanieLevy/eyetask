# Multiple Images Support for Tasks and Subtasks

## Overview

This feature adds support for uploading and managing multiple images for both tasks and subtasks in the EyeTask application. Previously, each task/subtask could only have a single image. Now they can have up to 5 images each.

## Features

### 🖼️ Multiple Image Upload
- **Tasks**: Up to 5 images per task
- **Subtasks**: Up to 5 images per subtask
- **Drag & Drop**: Support for drag and drop image uploads
- **File Validation**: Automatic file type and size validation
- **Preview**: Real-time image preview during upload

### 🎨 Image Gallery Display
- **Grid Layout**: Clean grid display of multiple images
- **Lightbox**: Click to view images in full size
- **Navigation**: Navigate between images with arrow keys
- **Responsive**: Mobile-friendly gallery layout
- **Thumbnails**: Compact thumbnail view with expand option

### 🔄 Dual Storage System
- **Development**: File system storage (`/public/uploads/subtasks/`)
- **Production**: Base64 data URLs embedded in database
- **Automatic Detection**: Environment-based storage selection
- **Fallback Support**: Graceful handling of both storage types

## Technical Implementation

### Database Schema Changes

#### Before (Single Image)
```typescript
interface Task {
  // ... other fields
  image?: string;
}

interface Subtask {
  // ... other fields  
  image?: string;
}
```

#### After (Multiple Images)
```typescript
interface Task {
  // ... other fields
  images?: string[];
}

interface Subtask {
  // ... other fields
  images?: string[];
}
```

### New Components

#### 1. MultipleImageUpload Component
```typescript
interface MultipleImageUploadProps {
  onImagesChange: (images: string[]) => void;
  currentImages?: string[];
  disabled?: boolean;
  maxImages?: number;
}
```

**Features:**
- Drag and drop support
- Multiple file selection
- Image preview with remove option
- Progress indicators
- Error handling
- Maximum image limit enforcement

#### 2. ImageGallery Component
```typescript
interface ImageGalleryProps {
  images: string[];
  className?: string;
  maxDisplay?: number;
}
```

**Features:**
- Grid layout with responsive design
- Lightbox modal for full-size viewing
- Navigation between images
- Image counter display
- Keyboard navigation support

### API Updates

All API endpoints have been updated to handle `images` arrays instead of single `image` fields:

#### Tasks API (`/api/tasks`)
- `GET /api/tasks` - Returns tasks with `images` array
- `POST /api/tasks` - Accepts `images` array in request body
- `PUT /api/tasks/[id]` - Updates task with `images` array

#### Subtasks API (`/api/subtasks`)
- `GET /api/subtasks` - Returns subtasks with `images` array
- `POST /api/subtasks` - Accepts `images` array in request body
- `PUT /api/subtasks/[id]` - Updates subtask with `images` array

### Database Migration

A migration script is provided to convert existing single image fields to images arrays:

```bash
npm run migrate-to-multiple-images
```

**Migration Process:**
1. Finds all tasks/subtasks with single `image` field
2. Converts `image: "url"` to `images: ["url"]`
3. Removes old `image` field
4. Updates collection schemas
5. Provides detailed migration report

## Usage Guide

### For Developers

#### 1. Using MultipleImageUpload Component
```tsx
import { MultipleImageUpload } from '@/components/ImageUpload';

function TaskForm() {
  const [images, setImages] = useState<string[]>([]);
  
  return (
    <MultipleImageUpload
      onImagesChange={setImages}
      currentImages={images}
      maxImages={5}
      disabled={loading}
    />
  );
}
```

#### 2. Using ImageGallery Component
```tsx
import { ImageGallery } from '@/components/ImageUpload';

function TaskDisplay({ task }: { task: Task }) {
  if (!task.images?.length) return null;
  
  return (
    <ImageGallery 
      images={task.images}
      maxDisplay={4}
      className="w-full"
    />
  );
}
```

### For Users

#### 1. Uploading Multiple Images
1. Click the upload area or drag images directly
2. Select multiple images (up to 5)
3. Preview images before saving
4. Remove unwanted images using the X button
5. Save the task/subtask

#### 2. Viewing Image Galleries
1. Images display in a grid layout
2. Click any image to view full size
3. Use arrow keys or buttons to navigate
4. Click outside or press Escape to close
5. Image counter shows current position

## File Structure

```
components/
├── ImageUpload.tsx          # Updated with new components
│   ├── ImageUpload          # Original single image upload
│   ├── MultipleImageUpload  # New multiple image upload
│   ├── ImageGallery         # New image gallery display
│   └── ImageDisplay         # Enhanced single image display

app/api/
├── tasks/
│   ├── route.ts            # Updated for images array
│   └── [id]/route.ts       # Updated for images array
└── subtasks/
    ├── route.ts            # Updated for images array
    └── [id]/route.ts       # Updated for images array

lib/
└── database.ts             # Updated interfaces

migrate-to-multiple-images.js  # Migration script
```

## Environment Configuration

### Development
```env
NODE_ENV=development
# Images stored in /public/uploads/subtasks/
```

### Production (Netlify)
```env
NODE_ENV=production
NETLIFY=true
# Images stored as base64 in database
```

## Performance Considerations

### Image Size Limits
- **Development**: 5MB per image
- **Production**: 2MB per image (base64 storage)
- **Total**: Maximum 5 images per task/subtask

### Storage Optimization
- **Compression**: Automatic image compression
- **Format**: JPEG/PNG/WebP support
- **Lazy Loading**: Images load on demand
- **Caching**: Browser caching for file system images

### Database Impact
- **Base64 Storage**: Increases document size in production
- **Indexing**: No impact on existing indexes
- **Queries**: Minimal performance impact

## Migration Guide

### Automatic Migration
Run the migration script to convert existing data:

```bash
# Load environment variables
source .env.local

# Run migration
npm run migrate-to-multiple-images
```

### Manual Migration
If automatic migration fails, manually update documents:

```javascript
// Convert single image to array
db.tasks.updateMany(
  { image: { $exists: true, $ne: null } },
  [
    {
      $set: {
        images: { $cond: [{ $ne: ["$image", null] }, ["$image"], []] }
      }
    },
    { $unset: "image" }
  ]
);
```

## Testing

### Unit Tests
- Component rendering with multiple images
- Image upload functionality
- Gallery navigation
- Error handling

### Integration Tests
- API endpoints with images arrays
- Database operations
- File upload/storage
- Migration script

### Manual Testing Checklist
- [ ] Upload multiple images for tasks
- [ ] Upload multiple images for subtasks
- [ ] View image galleries
- [ ] Navigate between images
- [ ] Remove individual images
- [ ] Test maximum image limits
- [ ] Test file size limits
- [ ] Test different image formats
- [ ] Test mobile responsiveness
- [ ] Test keyboard navigation

## Troubleshooting

### Common Issues

#### 1. Migration Fails
```bash
# Check database connection
node -e "console.log(process.env.MONGODB_URI)"

# Run with verbose logging
DEBUG=* npm run migrate-to-multiple-images
```

#### 2. Images Not Displaying
- Check if images array exists: `task.images?.length > 0`
- Verify image URLs are valid
- Check browser console for errors
- Ensure proper component imports

#### 3. Upload Errors
- Check file size limits
- Verify supported file types
- Check network connectivity
- Review server logs

### Debug Commands
```bash
# Check database schema
mongosh "mongodb://localhost:27017/eyetask" --eval "db.tasks.findOne()"

# Verify migration
mongosh "mongodb://localhost:27017/eyetask" --eval "db.tasks.find({image: {$exists: true}}).count()"

# Check image storage
ls -la public/uploads/subtasks/
```

## Future Enhancements

### Planned Features
- [ ] Image compression optimization
- [ ] Cloud storage integration (AWS S3, Cloudinary)
- [ ] Image metadata extraction
- [ ] Bulk image operations
- [ ] Image search and filtering
- [ ] Advanced image editing tools
- [ ] Image versioning
- [ ] CDN integration

### Performance Improvements
- [ ] Progressive image loading
- [ ] WebP format support
- [ ] Image lazy loading
- [ ] Thumbnail generation
- [ ] Client-side compression

## Support

For issues or questions regarding the multiple images feature:

1. Check this documentation
2. Review the troubleshooting section
3. Check the browser console for errors
4. Review server logs
5. Test with the migration script

## Changelog

### Version 1.0.0 (Current)
- ✅ Multiple image upload support
- ✅ Image gallery display
- ✅ Database migration script
- ✅ API endpoint updates
- ✅ Responsive design
- ✅ Error handling
- ✅ File validation
- ✅ Dual storage system

---

*Last updated: December 2024* 