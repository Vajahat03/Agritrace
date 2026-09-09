import { NotificationRepository } from '../../repositories/weatherNotificationRepository';
import { NotificationItem, NotificationSeverity } from '../../types';

export class NotificationService {
  static async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    token?: string
  ): Promise<NotificationItem[]> {
    return NotificationRepository.findByUser(userId, unreadOnly, token);
  }

  static async sendNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    scheduledFor?: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationItem> {
    return NotificationRepository.create({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      severity: data.severity || 'INFO',
      read: false,
      scheduled_for: data.scheduledFor,
      metadata: data.metadata || {},
    });
  }

  static async markAsRead(notificationId: string, userId: string, token?: string): Promise<void> {
    return NotificationRepository.markAsRead(notificationId, userId, token);
  }

  static async markAllAsRead(userId: string, token?: string): Promise<void> {
    return NotificationRepository.markAllAsRead(userId, token);
  }
}
