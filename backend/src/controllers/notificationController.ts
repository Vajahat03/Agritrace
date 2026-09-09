import { Response } from 'express';
import { AuthRequest } from '../types';
import { NotificationService } from '../services/notifications/notificationService';

export class NotificationController {
  static async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const unreadOnly = req.query.unread === 'true';
      const notifications = await NotificationService.getUserNotifications(req.user!.id, unreadOnly, req.token);
      res.status(200).json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_FETCH_ERROR', message: error.message } });
    }
  }

  static async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = (req.params.id || req.params.notificationId) as string;
      await NotificationService.markAsRead(id, req.user!.id, req.token);
      res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATION_UPDATE_ERROR', message: error.message } });
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!.id, req.token);
      res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_UPDATE_ERROR', message: error.message } });
    }
  }
}

export default NotificationController;
