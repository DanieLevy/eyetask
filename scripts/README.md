# Scripts Directory

This directory contains utility scripts for the Driver Tasks application.

## Production Scripts

### generate-vapid-keys.js
Generates VAPID keys for web push notifications. Run this when setting up push notifications for the first time.

```bash
node scripts/generate-vapid-keys.js
```

### generate-jwt-secret.js
Generates a secure JWT secret for authentication. Use this when deploying to production.

```bash
node scripts/generate-jwt-secret.js
```

## Development Scripts (in `dev/` subfolder)

### dev/check-mongodb.js
Utility to check MongoDB connection and inspect collections. Useful for debugging database issues.

```bash
node scripts/dev/check-mongodb.js
```

### dev/migrate-analytics.js
One-time migration script for analytics data structure. Only needed when migrating from old analytics format.

```bash
node scripts/dev/migrate-analytics.js
```

## Notes

- Always set proper environment variables before running these scripts
- Production scripts should be run with care as they generate sensitive keys
- Development scripts are for debugging and migration purposes only 