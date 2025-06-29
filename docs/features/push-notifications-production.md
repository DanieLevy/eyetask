# Push Notifications Production Guide

## Overview
This document provides a comprehensive guide for the production-ready push notification system implemented in EyeTask.

## System Architecture

### Components
1. **Client-Side**
   - Service Worker (`/public/sw.js`)
   - Push Hook (`/hooks/usePushNotifications.ts`)
   - Mobile Menu Integration
   - Admin UI (`/app/admin/push-notifications`)

2. **Server-Side**
   - VAPID Key Management
   - Push Service (`/lib/services/pushNotificationService.ts`)
   - API Routes (`/app/api/push/*`)
   - MongoDB Storage

3. **External Services**
   - FCM (Firebase Cloud Messaging) for Android/Chrome
   - APNS (Apple Push Notification Service) for Safari/iOS

## Setup Requirements

### 1. VAPID Keys
Generate VAPID keys for production:
```bash
npm run generate-vapid-keys
```

Add to `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:admin@yourdomain.com
```

**Important**: Keys must be on a single line with no line breaks.

### 2. Service Worker Registration
The service worker is automatically registered in `/app/layout.tsx`.

### 3. Database Schema
Push subscriptions are stored in MongoDB with the following structure:
```javascript
{
  userId: string,
  username: string,
  email: string,
  role: string,
  subscription: {
    endpoint: string,
    keys: {
      p256dh: string,
      auth: string
    }
  },
  deviceType: 'ios' | 'android' | 'desktop',
  userAgent: string,
  isActive: boolean,
  createdAt: Date,
  lastActive: Date
}
```

## Platform-Specific Requirements

### iOS/Safari
1. **PWA Installation Required**: Push notifications only work when the app is installed to home screen
2. **P-256 Key Format**: VAPID keys must be valid P-256 curve keys (65 or 33 bytes)
3. **Limited Features**: No vibration, limited action support

### Android/Chrome
1. **Direct Browser Support**: Works in browser without PWA installation
2. **Full Feature Support**: Vibration, actions, images supported

### Desktop
1. **Browser Support**: Chrome, Edge, Firefox supported
2. **OS Integration**: Native OS notification centers

## User Flow

### Enabling Notifications
1. User clicks hamburger menu
2. Clicks "הפעל התראות" (Enable Notifications)
3. Browser permission prompt appears
4. User grants permission
5. Subscription saved to server
6. Test notification sent automatically

### Sending Notifications (Admin)
1. Navigate to `/admin/push-notifications`
2. Fill in notification details:
   - Title (required, max 50 chars)
   - Body (required, max 200 chars)
   - URL (optional)
   - Image (optional)
   - Target audience
3. Click "שלח התראה"

## API Endpoints

### GET /api/push/vapid-key
Returns public VAPID key for client subscription.

### POST /api/push/subscribe
Creates/updates push subscription.
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

### DELETE /api/push/subscribe
Removes push subscription.
```json
{
  "endpoint": "https://fcm.googleapis.com/..."
}
```

### POST /api/push/send (Admin only)
Sends push notification.
```json
{
  "title": "Notification Title",
  "body": "Notification body text",
  "url": "/path/to/content",
  "image": "https://example.com/image.jpg",
  "requireInteraction": false,
  "targetRoles": ["admin", "data_manager"]
}
```

## Debugging

### Client-Side Logs
Look for console logs with these prefixes:
- `[Push Client]` - Client-side subscription flow
- `[MobileMenu]` - Menu interaction logs
- `[SW Push]` - Service worker push events

### Server-Side Logs
- `[Push Subscribe]` - Subscription requests
- `[VAPID Key]` - VAPID key requests
- `[PUSH_SERVICE]` - Push sending logs

### Common Issues

1. **"applicationServerKey must contain a valid P-256 public key" (iOS)**
   - Check VAPID key format
   - Ensure no line breaks in .env file
   - Regenerate keys if needed

2. **Push not received**
   - Check subscription is active in database
   - Verify service worker is registered
   - Check browser console for errors

3. **Wrong title/body displayed**
   - Service worker caches may need clearing
   - Check payload structure in service worker

## Performance Considerations

1. **Batch Sending**: Notifications are sent in parallel to all subscribers
2. **Automatic Cleanup**: Expired subscriptions (410 errors) are automatically removed
3. **Delivery Tracking**: Success/failure stats stored for each notification

## Security

1. **Authentication Required**: All push endpoints require valid JWT
2. **Admin-Only Sending**: Only admin users can send notifications
3. **VAPID Authentication**: Ensures notifications come from authorized server
4. **No Personal Data**: Push subscriptions don't contain user emails/passwords

## Best Practices

1. **Content Guidelines**
   - Keep titles under 50 characters
   - Body text under 200 characters
   - Use clear, actionable language
   - Include relevant URLs

2. **Timing**
   - Avoid sending during off-hours
   - Consider user time zones
   - Don't over-notify

3. **Testing**
   - Always test on multiple platforms
   - Verify URLs work correctly
   - Check notification appearance

## Monitoring

Track these metrics:
- Subscription count by platform
- Delivery success rate
- Click-through rate
- Unsubscribe rate

## Future Enhancements

1. **Scheduled Notifications**: Send at specific times
2. **User Preferences**: Let users choose notification types
3. **Analytics Integration**: Track engagement metrics
4. **A/B Testing**: Test different notification formats
 