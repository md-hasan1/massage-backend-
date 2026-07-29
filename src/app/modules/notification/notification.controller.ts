import { Request, Response, NextFunction } from 'express';
import NotificationService from './notification.service';

export class NotificationController {
  private notificationService = new NotificationService();

  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const notifications = await this.notificationService.getNotifications(userId);

      res.status(200).json({
        status: 'success',
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id as string;
      const notification = await this.notificationService.markAsRead(notificationId, userId);

      res.status(200).json({
        status: 'success',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await this.notificationService.markAllAsRead(userId);

      res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id as string;
      const notification = await this.notificationService.deleteNotification(notificationId, userId);

      res.status(200).json({
        status: 'success',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  };

  clearAllNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await this.notificationService.clearAllNotifications(userId);

      res.status(200).json({
        status: 'success',
        message: 'All notifications cleared',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default NotificationController;
