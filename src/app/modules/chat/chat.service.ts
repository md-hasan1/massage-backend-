import { ChatRepository } from './chat.repository';
import UserRepository from '../user/user.repository';
import { AppError } from '../../../utils/AppError';
import { IChat } from './chat.model';

export class ChatService {
  private chatRepository = new ChatRepository();
  private userRepository = new UserRepository();

  /// Retrieve a chat and ensure the user is a participant
  async getChatById(chatId: string, userId: string): Promise<IChat> {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    // Check if the user is a participant in the chat
    const isParticipant = chat.participants.some(
      (participant: any) => participant._id.toString() === userId
    );
    if (!isParticipant) {
      throw new AppError('You are not a participant in this chat', 403);
    }

    return chat;
  }

  /// Get or create a private chat between two users
  async getOrCreatePrivateChat(userA: string, userB: string): Promise<IChat> {
    if (userA === userB) {
      throw new AppError('You cannot create a chat with yourself', 400);
    }

    // Ensure the other user exists
    const recipient = await this.userRepository.findById(userB);
    if (!recipient) {
      throw new AppError('Recipient user not found', 404);
    }

    // Check if private chat already exists
    let chat = await this.chatRepository.findPrivateChat(userA, userB);
    if (!chat) {
      chat = await this.chatRepository.createPrivateChat(userA, userB);
    }

    return chat;
  }

  /// Get all active chats for a user
  async getUserChats(userId: string): Promise<IChat[]> {
    return this.chatRepository.findUserChats(userId);
  }

  /// Reset the unread count in a chat for a specific user
  async resetUnreadCount(chatId: string, userId: string): Promise<IChat> {
    // Validate participation
    await this.getChatById(chatId, userId);
    const updatedChat = await this.chatRepository.resetUnreadCount(chatId, userId);
    if (!updatedChat) {
      throw new AppError('Failed to reset unread count', 500);
    }
    return updatedChat;
  }

  /// Pin a chat for a user
  async pinChat(chatId: string, userId: string): Promise<IChat> {
    await this.getChatById(chatId, userId);
    const updatedChat = await this.chatRepository.pinChat(chatId, userId);
    if (!updatedChat) {
      throw new AppError('Failed to pin chat', 500);
    }
    return updatedChat;
  }

  /// Unpin a chat for a user
  async unpinChat(chatId: string, userId: string): Promise<IChat> {
    await this.getChatById(chatId, userId);
    const updatedChat = await this.chatRepository.unpinChat(chatId, userId);
    if (!updatedChat) {
      throw new AppError('Failed to unpin chat', 500);
    }
    return updatedChat;
  }
}

export default ChatService;
