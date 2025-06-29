import webpush from 'web-push';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { PushSubscription } from '@/lib/database';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
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
        targetRoles: options.targetRoles,
        targetUsers: options.targetUsers
      });

      // Get target subscriptions
      const subscriptions = await db.getActivePushSubscriptions({
        roles: options.targetRoles,
        userIds: options.targetUsers
      });

      if (subscriptions.length === 0) {
        logger.warn('No active subscriptions found', 'PUSH_SERVICE');
        return { success: false, sent: 0, failed: 0, errors: ['No active subscriptions found'] };
      }

      // Create notification record if needed
      let notificationId: string | undefined;
      if (options.saveToHistory !== false) {
        notificationId = await db.createPushNotification({
          ...payload,
          targetRoles: options.targetRoles,
          targetUsers: options.targetUsers,
          sentBy
        });
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

      // Send to each subscription
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription as any, notificationPayload);
          sent++;
          logger.info('Push sent successfully', 'PUSH_SERVICE', {
            userId: sub.userId,
            endpoint: sub.subscription.endpoint.substring(0, 50) + '...'
          });
        } catch (error: any) {
          failed++;
          const errorMessage = `Failed to send to ${sub.username}: ${error.message}`;
          errors.push(errorMessage);
          
          logger.error('Push send failed', 'PUSH_SERVICE', {
            userId: sub.userId,
            error: error.message,
            statusCode: error.statusCode
          });

          // Handle subscription errors
          if (error.statusCode === 410) {
            // Subscription expired, mark as inactive
            await db.removePushSubscription(sub.subscription.endpoint);
            logger.info('Removed expired subscription', 'PUSH_SERVICE', {
              userId: sub.userId
            });
          }
        }
      });

      // Wait for all sends to complete
      await Promise.allSettled(sendPromises);

      // Update notification stats
      if (notificationId) {
        await db.updatePushNotificationStats(
          notificationId,
          { sent, failed },
          sent > 0 ? 'sent' : 'failed'
        );
      }

      logger.info('Push notification campaign completed', 'PUSH_SERVICE', {
        sent,
        failed,
        total: subscriptions.length
      });

      return {
        success: sent > 0,
        sent,
        failed,
        errors
      };
    } catch (error) {
      logger.error('Push notification service error', 'PUSH_SERVICE', undefined, error as Error);
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
    return this.sendNotification(payload, { targetUsers: [userId] }, sentBy);
  }

  /**
   * Send notification to specific roles
   */
  async sendToRoles(roles: string[], payload: PushPayload, sentBy: string) {
    return this.sendNotification(payload, { targetRoles: roles }, sentBy);
  }

  /**
   * Send notification to all active users
   */
  async sendToAll(payload: PushPayload, sentBy: string) {
    return this.sendNotification(payload, {}, sentBy);
  }

  /**
   * Test notification sending
   */
  async sendTestNotification(subscription: PushSubscription['subscription']) {
    try {
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
      return { success: true, error: null };
    } catch (error) {
      logger.error('Test notification failed', 'PUSH_SERVICE', undefined, error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate VAPID keys (for initial setup)
   */
  generateVAPIDKeys() {
    const vapidKeys = webpush.generateVAPIDKeys();
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey
    };
  }

  /**
   * Get public VAPID key for client
   */
  getPublicKey() {
    return vapidPublicKey;
  }
}

export const pushService = new PushNotificationService(); 