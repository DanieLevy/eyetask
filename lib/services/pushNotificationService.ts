import webpush from 'web-push';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { PushSubscription } from '@/lib/database';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

// Log VAPID configuration status
logger.info('Push Service Initialization', 'PUSH_SERVICE', {
  hasPublicKey: !!vapidPublicKey,
  hasPrivateKey: !!vapidPrivateKey,
  vapidEmail,
  publicKeyLength: vapidPublicKey.length,
  privateKeyLength: vapidPrivateKey.length
});

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    logger.info('VAPID keys configured successfully', 'PUSH_SERVICE');
  } catch (error) {
    logger.error('Failed to configure VAPID keys', 'PUSH_SERVICE', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
  }
} else {
  logger.error('VAPID keys missing', 'PUSH_SERVICE', {
    hasPublicKey: !!vapidPublicKey,
    hasPrivateKey: !!vapidPrivateKey
  });
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

export interface SendOptions {
  targetRoles?: string[];
  targetUsers?: string[];
  saveToHistory?: boolean;
}

class PushNotificationService {
  /**
   * Send push notification to specified users
   */
  async sendNotification(
    payload: PushPayload,
    options: SendOptions = {},
    sentBy: string
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    try {
      logger.info('Sending push notification', 'PUSH_SERVICE', {
        title: payload.title,
        body: payload.body,
        targetRoles: options.targetRoles,
        targetUsers: options.targetUsers,
        sentBy,
        hasVapidKeys: !!vapidPublicKey && !!vapidPrivateKey
      });

      // Check VAPID keys
      if (!vapidPublicKey || !vapidPrivateKey) {
        const error = 'VAPID keys not configured';
        logger.error(error, 'PUSH_SERVICE');
        errors.push(error);
        return { success: false, sent: 0, failed: 0, errors };
      }

      // Get target subscriptions
      logger.info('Fetching target subscriptions', 'PUSH_SERVICE', {
        filters: { roles: options.targetRoles, users: options.targetUsers }
      });
      
      const subscriptions = await db.getActivePushSubscriptions({
        roles: options.targetRoles,
        userIds: options.targetUsers
      });

      logger.info('Subscriptions fetched', 'PUSH_SERVICE', {
        count: subscriptions.length,
        subscriptions: subscriptions.map(s => ({
          userId: s.userId,
          username: s.username,
          deviceType: s.deviceType,
          endpoint: s.subscription.endpoint.substring(0, 50) + '...'
        }))
      });

      if (subscriptions.length === 0) {
        logger.warn('No active subscriptions found', 'PUSH_SERVICE', {
          targetRoles: options.targetRoles,
          targetUsers: options.targetUsers
        });
        return { success: false, sent: 0, failed: 0, errors: ['No active subscriptions found'] };
      }

      // Create notification record if needed
      let notificationId: string | undefined;
      if (options.saveToHistory !== false) {
        try {
          notificationId = await db.createPushNotification({
            ...payload,
            targetRoles: options.targetRoles,
            targetUsers: options.targetUsers,
            sentBy
          });
          logger.info('Notification record created', 'PUSH_SERVICE', { notificationId });
        } catch (error) {
          logger.error('Failed to create notification record', 'PUSH_SERVICE', {
            error: (error as Error).message
          });
        }
      }

      // Prepare notification payload
      const notificationPayload = JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-72x72.png',
          image: payload.image,
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction || false,
          actions: payload.actions,
          data: {
            ...payload.data,
            url: payload.url || '/',
            notificationId
          }
        }
      });

      logger.info('Notification payload prepared', 'PUSH_SERVICE', {
        payloadSize: notificationPayload.length,
        hasImage: !!payload.image,
        hasActions: !!(payload.actions && payload.actions.length > 0)
      });

      // Send to each subscription
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          logger.info('Sending to subscription', 'PUSH_SERVICE', {
            userId: sub.userId,
            username: sub.username,
            deviceType: sub.deviceType,
            endpointPreview: sub.subscription.endpoint.substring(0, 50) + '...'
          });

          await webpush.sendNotification(sub.subscription as any, notificationPayload);
          sent++;
          
          logger.info('Push sent successfully', 'PUSH_SERVICE', {
            userId: sub.userId,
            username: sub.username,
            deviceType: sub.deviceType
          });
        } catch (error: any) {
          failed++;
          const errorMessage = `Failed to send to ${sub.username}: ${error.message}`;
          errors.push(errorMessage);
          
          logger.error('Push send failed', 'PUSH_SERVICE', {
            userId: sub.userId,
            username: sub.username,
            error: error.message,
            statusCode: error.statusCode,
            headers: error.headers,
            body: error.body,
            endpoint: sub.subscription.endpoint.substring(0, 50) + '...'
          });

          // Handle subscription errors
          if (error.statusCode === 410) {
            // Subscription expired, mark as inactive
            await db.removePushSubscription(sub.subscription.endpoint);
            logger.info('Removed expired subscription', 'PUSH_SERVICE', {
              userId: sub.userId,
              username: sub.username
            });
          } else if (error.statusCode === 400) {
            logger.error('Bad request - check VAPID keys and subscription', 'PUSH_SERVICE', {
              userId: sub.userId,
              errorBody: error.body
            });
          } else if (error.statusCode === 401) {
            logger.error('Unauthorized - VAPID keys may be invalid', 'PUSH_SERVICE', {
              userId: sub.userId,
              errorBody: error.body
            });
          }
        }
      });

      // Wait for all sends to complete
      await Promise.allSettled(sendPromises);

      // Update notification stats
      if (notificationId) {
        try {
          await db.updatePushNotificationStats(
            notificationId,
            { sent, failed },
            sent > 0 ? 'sent' : 'failed'
          );
          logger.info('Notification stats updated', 'PUSH_SERVICE', {
            notificationId,
            sent,
            failed
          });
        } catch (error) {
          logger.error('Failed to update notification stats', 'PUSH_SERVICE', {
            notificationId,
            error: (error as Error).message
          });
        }
      }

      logger.info('Push notification campaign completed', 'PUSH_SERVICE', {
        sent,
        failed,
        total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined
      });

      return {
        success: sent > 0,
        sent,
        failed,
        errors
      };
    } catch (error) {
      logger.error('Push notification service error', 'PUSH_SERVICE', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        sentBy,
        title: payload.title
      });
      return {
        success: false,
        sent,
        failed,
        errors: [...errors, (error as Error).message]
      };
    }
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(userId: string, payload: PushPayload, sentBy: string) {
    logger.info('Sending notification to specific user', 'PUSH_SERVICE', {
      userId,
      title: payload.title
    });
    return this.sendNotification(payload, { targetUsers: [userId] }, sentBy);
  }

  /**
   * Send notification to specific roles
   */
  async sendToRoles(roles: string[], payload: PushPayload, sentBy: string) {
    logger.info('Sending notification to roles', 'PUSH_SERVICE', {
      roles,
      title: payload.title
    });
    return this.sendNotification(payload, { targetRoles: roles }, sentBy);
  }

  /**
   * Send notification to all active users
   */
  async sendToAll(payload: PushPayload, sentBy: string) {
    logger.info('Sending notification to all users', 'PUSH_SERVICE', {
      title: payload.title
    });
    return this.sendNotification(payload, {}, sentBy);
  }

  /**
   * Test notification sending
   */
  async sendTestNotification(subscription: PushSubscription['subscription']) {
    try {
      logger.info('Sending test notification', 'PUSH_SERVICE', {
        endpoint: subscription.endpoint.substring(0, 50) + '...'
      });

      const payload = JSON.stringify({
        notification: {
          title: 'בדיקת התראה 🔔',
          body: 'זוהי התראת בדיקה מהמערכת',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'test',
          data: {
            url: '/',
            test: true
          }
        }
      });

      await webpush.sendNotification(subscription as any, payload);
      logger.info('Test notification sent successfully', 'PUSH_SERVICE');
      return { success: true, error: null };
    } catch (error) {
      logger.error('Test notification failed', 'PUSH_SERVICE', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate VAPID keys (for initial setup)
   */
  generateVAPIDKeys() {
    const vapidKeys = webpush.generateVAPIDKeys();
    logger.info('Generated new VAPID keys', 'PUSH_SERVICE', {
      publicKeyLength: vapidKeys.publicKey.length,
      privateKeyLength: vapidKeys.privateKey.length
    });
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey
    };
  }

  /**
   * Get public VAPID key for client
   */
  getPublicKey() {
    if (!vapidPublicKey) {
      logger.warn('Public VAPID key requested but not configured', 'PUSH_SERVICE');
    }
    return vapidPublicKey;
  }
}

export const pushService = new PushNotificationService(); 