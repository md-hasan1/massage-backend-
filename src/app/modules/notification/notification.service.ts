import NotificationRepository from './notification.repository';
import { INotification } from './notification.model';
import { sendPushNotification } from '../../helpers/notification.helper';
import { AppError } from '../../../utils/AppError';

export class NotificationService {
  private notificationRepository: NotificationRepository;

  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  async createNotification(
    recipientId: string,
    senderId: string | undefined,
    type: 'friend_request' | 'friend_accept' | 'message' | 'call' | 'system',
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<INotification> {
    // 1. Persist notification in local MongoDB
    const notification = await this.notificationRepository.create({
      recipient: recipientId as any,
      sender: senderId as any,
      type,
      title,
      body,
      data,
    });

    // 2. Deliver push notification asynchronously via FCM
    // Serialize data values to strings as FCM payload only accepts string values
    const stringifiedData: Record<string, string> = {
      type,
      id: notification._id.toString(),
    };
    if (data) {
      Object.keys(data).forEach((key) => {
        stringifiedData[key] = String(data[key]);
      });
    }

    // Trigger push notification (non-blocking)
    sendPushNotification(recipientId, {
      title,
      body,
      data: stringifiedData,
    }).catch((err) => {
      console.error(`[error]: Failed to deliver push notification for notification ${notification._id}: ${err.message}`);
    });

    return notification;
  }

  async getNotifications(recipientId: string): Promise<INotification[]> {
    return this.notificationRepository.findByRecipient(recipientId);
  }

  async markAsRead(id: string, recipientId: string): Promise<INotification> {
    const notification = await this.notificationRepository.update(id, recipientId, { isRead: true });
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    return notification;
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(recipientId);
  }

  async deleteNotification(id: string, recipientId: string): Promise<INotification> {
    const notification = await this.notificationRepository.update(id, recipientId, { isDeleted: true });
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    return notification;
  }

  async clearAllNotifications(recipientId: string): Promise<void> {
    await this.notificationRepository.softDeleteAll(recipientId);
  }
}

export default NotificationService;
