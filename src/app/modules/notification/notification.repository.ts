import { Notification, INotification } from './notification.model';
import { UpdateQuery } from 'mongoose';

export class NotificationRepository {
  async create(notificationData: Partial<INotification>): Promise<INotification> {
    return Notification.create(notificationData);
  }

  async findByRecipient(recipientId: string): Promise<INotification[]> {
    return Notification.find({ recipient: recipientId, isDeleted: false })
      .populate('sender', 'name email photoUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<INotification | null> {
    return Notification.findOne({ _id: id, isDeleted: false }).exec();
  }

  async update(id: string, recipientId: string, updateData: UpdateQuery<INotification>): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      { _id: id, recipient: recipientId, isDeleted: false },
      updateData,
      { returnDocument: 'after' }
    ).exec();
  }

  async markAllAsRead(recipientId: string): Promise<any> {
    return Notification.updateMany(
      { recipient: recipientId, isRead: false, isDeleted: false },
      { isRead: true }
    ).exec();
  }

  async softDeleteAll(recipientId: string): Promise<any> {
    return Notification.updateMany(
      { recipient: recipientId, isDeleted: false },
      { isDeleted: true }
    ).exec();
  }
}

export default NotificationRepository;
