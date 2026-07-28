import { Types } from 'mongoose';
import Message, { IMessage } from './message.model';

export class MessageRepository {
  /// Find a message by ID
  async findById(id: string): Promise<IMessage | null> {
    return Message.findById(id).populate('senderId', 'name email photoUrl').exec();
  }

  /// Create a new message
  async create(messageData: {
    chatId: string;
    senderId: string;
    messageType: 'text' | 'image' | 'audio' | 'file';
    content: string;
    fileInfo?: { name: string; size: number; mimeType: string };
    replyTo?: string;
  }): Promise<IMessage> {
    const message = await Message.create({
      chatId: new Types.ObjectId(messageData.chatId),
      senderId: new Types.ObjectId(messageData.senderId),
      messageType: messageData.messageType,
      content: messageData.content,
      fileInfo: messageData.fileInfo,
      replyTo: messageData.replyTo ? new Types.ObjectId(messageData.replyTo) : undefined,
      status: 'sent',
    });
    return message.populate('senderId', 'name email photoUrl');
  }

  /// Find chat messages history (paginated, excluding messages deleted for this user)
  async findMessagesInChat(
    chatId: string,
    userId: string,
    limit = 30,
    skip = 0
  ): Promise<IMessage[]> {
    return Message.find({
      chatId: new Types.ObjectId(chatId),
      deletedBy: { $ne: new Types.ObjectId(userId) },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name email photoUrl')
      .populate({
        path: 'replyTo',
        select: 'content senderId messageType',
        populate: { path: 'senderId', select: 'name' }
      })
      .exec();
  }

  /// Mark all messages in a chat from other senders as delivered
  async markAsDelivered(chatId: string, recipientId: string): Promise<any> {
    return Message.updateMany(
      {
        chatId: new Types.ObjectId(chatId),
        senderId: { $ne: new Types.ObjectId(recipientId) },
        status: 'sent',
      },
      {
        $set: {
          status: 'delivered',
          deliveredAt: new Date()
        }
      }
    ).exec();
  }

  /// Mark all messages in a chat from other senders as seen
  async markAsSeen(chatId: string, recipientId: string): Promise<any> {
    const now = new Date();
    // 1. From sent -> seen (needs both deliveredAt and seenAt set)
    await Message.updateMany(
      {
        chatId: new Types.ObjectId(chatId),
        senderId: { $ne: new Types.ObjectId(recipientId) },
        status: 'sent',
      },
      {
        $set: {
          status: 'seen',
          deliveredAt: now,
          seenAt: now
        }
      }
    ).exec();

    // 2. From delivered -> seen (just seenAt)
    return Message.updateMany(
      {
        chatId: new Types.ObjectId(chatId),
        senderId: { $ne: new Types.ObjectId(recipientId) },
        status: 'delivered',
      },
      {
        $set: {
          status: 'seen',
          seenAt: now
        }
      }
    ).exec();
  }

  /// Edit message content
  async edit(messageId: string, senderId: string, newContent: string): Promise<IMessage | null> {
    return Message.findOneAndUpdate(
      {
        _id: new Types.ObjectId(messageId),
        senderId: new Types.ObjectId(senderId),
        isDeletedForEveryone: false,
      },
      {
        content: newContent,
        isEdited: true,
      },
      { new: true }
    ).populate('senderId', 'name email photoUrl').exec();
  }

  /// Delete message for everyone (replaces content with placeholder text)
  async deleteForEveryone(messageId: string, senderId: string): Promise<IMessage | null> {
    return Message.findOneAndUpdate(
      {
        _id: new Types.ObjectId(messageId),
        senderId: new Types.ObjectId(senderId),
      },
      {
        content: 'This message was deleted',
        isDeletedForEveryone: true,
      },
      { new: true }
    ).populate('senderId', 'name email photoUrl').exec();
  }

  /// Delete message for a specific user (soft delete for me)
  async deleteForMe(messageId: string, userId: string): Promise<IMessage | null> {
    return Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedBy: new Types.ObjectId(userId) } },
      { new: true }
    ).populate('senderId', 'name email photoUrl').exec();
  }
}

export default MessageRepository;
