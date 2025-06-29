# Push Notifications Troubleshooting Guide

## iOS-Specific Issues

### Error: "iOS push notification setup failed: Invalid VAPID key format"

This error occurs when the VAPID key cannot be properly converted for iOS Safari. Common causes:

1. **Environment Variable Issues**
   - Check that your `.env.local` file doesn't have line breaks in the VAPID key
   - Ensure no extra spaces before or after the key
   - The key should be on a single line

2. **Key Format Issues**
   - iOS requires P-256 curve keys (65 bytes uncompressed or 33 bytes compressed)
   - Use the provided script to generate iOS-compatible keys: `node scripts/generate-vapid-keys.js`

### Admin Debug Mode

For admin users, detailed console logs are available:
- Look for `[Push Admin]` prefixed messages in browser console
- Check server logs for `[VAPID Admin]` messages
- Visit `/api/push/test-vapid` to test key conversion

### iOS PWA Requirements

1. **Installation**: App must be installed to home screen
2. **iOS Version**: 16.4+ required
3. **HTTPS**: Must be served over HTTPS (localhost is exception)

## Common Issues

### Push notifications stop working after 3 notifications

This is a known iOS issue. The subscription may be terminated. Solutions:
1. Implement proper `event.waitUntil()` in service worker
2. Ensure all push events complete successfully
3. Re-subscribe if subscription is lost

### "applicationServerKey must contain a valid P-256 public key"

This means the VAPID key conversion failed. Check:
1. Key is properly base64url encoded
2. No whitespace or line breaks in the key
3. Key is exactly 87 characters (uncompressed) or 43 characters (compressed)

## Testing

1. **Test VAPID Key**: `curl http://localhost:3000/api/push/test-vapid`
2. **Generate New Keys**: `node scripts/generate-vapid-keys.js`
3. **Check Subscription**: Open browser console and look for `[Push]` logs

## Server Configuration

Ensure these environment variables are set:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_EMAIL=mailto:your-email@example.com
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari iOS**: 16.4+ (PWA only)
- **Safari macOS**: 16.1+ 