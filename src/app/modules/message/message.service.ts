import { MessageRepository } from './message.repository';
import { ChatRepository } from '../chat/chat.repository';
import { ChatService } from '../chat/chat.service';
import { AppError } from '../../../utils/AppError';
import { IMessage } from './message.model';

export class MessageService {
  private messageRepository = new MessageRepository();
  private chatRepository = new ChatRepository();
  private chatService = new ChatService();

  /// Send a new message
  async sendMessage(
    senderId: string,
    messageData: {
      chatId: string;
      messageType: 'text' | 'image' | 'audio' | 'file';
      content: string;
      fileInfo?: { name: string; size: number; mimeType: string };
      replyTo?: string;
    }
  ): Promise<IMessage> {
    const { chatId } = messageData;

    // Validate that sender is a participant of the chat
    const chat = await this.chatService.getChatById(chatId, senderId);

    // Save message to database
    const message = await this.messageRepository.create({
      chatId,
      senderId,
      messageType: messageData.messageType,
      content: messageData.content,
      fileInfo: messageData.fileInfo,
      replyTo: messageData.replyTo,
    });

    // Update last message in the chat
    await this.chatRepository.updateLastMessage(chatId, message._id.toString());

    // Increment unread count for other participants in the chat
    const incrementPromises = chat.participants
      .filter((p: any) => p._id.toString() !== senderId)
      .map((p: any) => this.chatRepository.incrementUnreadCount(chatId, p._id.toString()));
    
    await Promise.all(incrementPromises);

    return message;
  }

  /// Retrieve chat messages history with pagination
  async getChatMessages(
    userId: string,
    chatId: string,
    limit = 30,
    skip = 0
  ): Promise<IMessage[]> {
    // Validate participation
    await this.chatService.getChatById(chatId, userId);

    // Fetch messages
    return this.messageRepository.findMessagesInChat(chatId, userId, limit, skip);
  }

  /// Edit a message
  async editMessage(userId: string, messageId: string, newContent: string): Promise<IMessage> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId._id.toString() !== userId) {
      throw new AppError('You are not authorized to edit this message', 403);
    }

    if (message.isDeletedForEveryone) {
      throw new AppError('Cannot edit a deleted message', 400);
    }

    const updatedMessage = await this.messageRepository.edit(messageId, userId, newContent);
    if (!updatedMessage) {
      throw new AppError('Failed to edit message', 500);
    }

    return updatedMessage;
  }

  /// Delete a message for everyone
  async deleteMessageForEveryone(userId: string, messageId: string): Promise<IMessage> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId._id.toString() !== userId) {
      throw new AppError('You are not authorized to delete this message', 403);
    }

    const updatedMessage = await this.messageRepository.deleteForEveryone(messageId, userId);
    if (!updatedMessage) {
      throw new AppError('Failed to delete message', 500);
    }

    return updatedMessage;
  }

  /// Delete a message only for the requesting user (soft delete for me)
  async deleteMessageForMe(userId: string, messageId: string): Promise<IMessage> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const updatedMessage = await this.messageRepository.deleteForMe(messageId, userId);
    if (!updatedMessage) {
      throw new AppError('Failed to delete message for me', 500);
    }

    return updatedMessage;
  }

  /// Mark all messages in a chat from other senders as delivered
  async markAsDelivered(chatId: string, recipientId: string): Promise<void> {
    await this.messageRepository.markAsDelivered(chatId, recipientId);
  }
}

export default MessageService;
