import { Types } from 'mongoose';
import Chat, { IChat } from './chat.model';

export class ChatRepository {
  /// Find a chat by its ID
  async findById(id: string): Promise<IChat | null> {
    return Chat.findById(id)
      .populate('participants', 'name email photoUrl bio isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name email photoUrl' },
      })
      .exec();
  }

  /// Find an active private chat between two users
  async findPrivateChat(userA: string, userB: string): Promise<IChat | null> {
    return Chat.findOne({
      isGroup: false,
      isDeleted: false,
      participants: { $all: [new Types.ObjectId(userA), new Types.ObjectId(userB)] },
    })
      .populate('participants', 'name email photoUrl bio isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name email photoUrl' },
      })
      .exec();
  }

  /// Create a new private chat
  async createPrivateChat(userA: string, userB: string): Promise<IChat> {
    const chat = await Chat.create({
      participants: [new Types.ObjectId(userA), new Types.ObjectId(userB)],
      isGroup: false,
      unreadCount: new Map([
        [userA, 0],
        [userB, 0],
      ]),
    });
    return chat.populate('participants', 'name email photoUrl bio isOnline lastSeen');
  }

  /// Find all chats for a specific user (ordered by last activity)
  async findUserChats(userId: string): Promise<IChat[]> {
    const userObjectId = new Types.ObjectId(userId);
    return Chat.find({
      participants: userObjectId,
      isDeleted: false,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name email photoUrl bio isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name email photoUrl' },
      })
      .exec();
  }

  /// Update the last message in a chat
  async updateLastMessage(chatId: string, messageId: string): Promise<IChat | null> {
    return Chat.findByIdAndUpdate(
      chatId,
      { lastMessage: new Types.ObjectId(messageId) },
      { new: true }
    ).exec();
  }

  /// Increment the unread count for a specific user in a chat
  async incrementUnreadCount(chatId: string, userId: string): Promise<IChat | null> {
    const fieldKey = `unreadCount.${userId}`;
    return Chat.findByIdAndUpdate(
      chatId,
      { $inc: { [fieldKey]: 1 } },
      { new: true }
    ).exec();
  }

  /// Reset the unread count for a specific user in a chat
  async resetUnreadCount(chatId: string, userId: string): Promise<IChat | null> {
    const fieldKey = `unreadCount.${userId}`;
    return Chat.findByIdAndUpdate(
      chatId,
      { $set: { [fieldKey]: 0 } },
      { new: true }
    ).exec();
  }

  /// Pin a chat for a user
  async pinChat(chatId: string, userId: string): Promise<IChat | null> {
    return Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { pinnedBy: new Types.ObjectId(userId) } },
      { new: true }
    ).exec();
  }

  /// Unpin a chat for a user
  async unpinChat(chatId: string, userId: string): Promise<IChat | null> {
    return Chat.findByIdAndUpdate(
      chatId,
      { $pull: { pinnedBy: new Types.ObjectId(userId) } },
      { new: true }
    ).exec();
  }

  /// Soft delete a chat (e.g. mark it as deleted for database hygiene)
  async softDelete(chatId: string): Promise<IChat | null> {
    return Chat.findByIdAndUpdate(chatId, { isDeleted: true }, { new: true }).exec();
  }
}

export default ChatRepository;
