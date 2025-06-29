# Analytics System Implementation

## Overview
The EyeTask analytics system provides comprehensive tracking of user activities, page visits, and system usage patterns. It's designed to help administrators understand how the system is being used and identify areas for improvement.

## Architecture

### Database Collections
1. **analytics** - Main analytics data with counters and statistics
2. **userSessions** - Active user session tracking
3. **activityLogs** - Detailed activity logs with timestamps and metadata

### API Endpoints

#### POST /api/analytics
- **Purpose**: Track user visits and page views
- **Authentication**: Required (any authenticated user)
- **Usage**: Called automatically when users visit pages
- **Request Body**:
  ```json
  {
    "page": "homepage",
    "action": "page_view"
  }
  ```

#### GET /api/analytics
- **Purpose**: Retrieve analytics dashboard data
- **Authentication**: Admin only
- **Query Parameters**:
  - `range`: Time range (1d, 7d, 30d)
- **Response**: Comprehensive analytics data including visits, users, and activities

## Implementation Details

### Page Visit Tracking
All major pages include automatic analytics tracking:

```typescript
// Example from app/page.tsx
useEffect(() => {
  const trackVisit = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            page: 'homepage',
            action: 'page_view'
          })
        });
      } catch (error) {
        console.error('Failed to track visit:', error);
      }
    }
  };

  trackVisit();
}, []);
```

### Pages with Analytics Tracking
1. **Public Pages**:
   - Homepage (`/`)
   - Project pages (`/project/[projectName]`)
   - Feedback page (`/feedback`)

2. **Admin Pages**:
   - Dashboard (`/admin/dashboard`)
   - Projects (`/admin/projects`)
   - Users (`/admin/users`)
   - Analytics (`/admin/analytics`)

### Activity Logging
The system automatically logs various user actions:

1. **Authentication Events**:
   - User login
   - User logout
   - Failed login attempts

2. **Data Management**:
   - Project creation/update/deletion
   - Task creation/update/deletion
   - User management actions

3. **Page Views**:
   - All page visits are tracked with timestamps
   - User role and ID are recorded

### Analytics Dashboard Features

The analytics dashboard (`/admin/analytics`) provides:

1. **Overview Tab**:
   - Total visits (today, 7 days, 30 days)
   - Unique visitors
   - Page views
   - Manager actions count

2. **Activities Tab**:
   - Recent user activities
   - Activity categorization
   - User action history

3. **Users Tab**:
   - Active users list
   - User activity rankings
   - Last activity timestamps

4. **Daily Tab**:
   - Daily visit trends
   - Activity patterns
   - User engagement metrics

## Security Considerations

1. **Authentication Required**: All analytics tracking requires user authentication
2. **Admin-Only Access**: Analytics dashboard is restricted to admin users
3. **Data Privacy**: No sensitive user data is exposed in analytics
4. **Rate Limiting**: Analytics endpoints are protected against abuse

## Performance Optimizations

1. **Efficient Queries**: MongoDB aggregation pipelines for fast data retrieval
2. **Indexed Collections**: Proper indexing on timestamp and user fields
3. **Data Retention**: Automatic cleanup of data older than 30 days
4. **Caching**: Analytics data is cached to reduce database load

## Troubleshooting

### Common Issues

1. **404 Error on /api/analytics/track**:
   - This endpoint doesn't exist - use `/api/analytics` instead
   - Fixed in all pages to use the correct endpoint

2. **401 Unauthorized**:
   - User must be logged in to track analytics
   - Check if adminToken exists in localStorage

3. **403 Forbidden**:
   - Analytics dashboard requires admin role
   - Verify user has admin permissions

### Testing Analytics

To test if analytics is working:

1. Log in to the admin panel
2. Visit various pages
3. Check the analytics dashboard for updated data
4. Verify activities are being logged

### MongoDB Queries

Useful queries for debugging:

```javascript
// Check analytics data
db.analytics.findOne({})

// View recent activities
db.activityLogs.find({}).sort({ timestamp: -1 }).limit(10)

// Check active sessions
db.userSessions.find({ isActive: true })
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live analytics
2. **Custom Reports**: Allow admins to create custom analytics reports
3. **Export Functionality**: Export analytics data to CSV/Excel
4. **Advanced Filtering**: More granular filtering options
5. **Performance Metrics**: Page load times and API response times 