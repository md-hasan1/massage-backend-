import { Request, Response, NextFunction } from 'express';
import ChatService from './chat.service';

export class ChatController {
  private chatService = new ChatService();

  /// Retrieve all chats of the current user
  getUserChats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const chats = await this.chatService.getUserChats(userId);

      res.status(200).json({
        status: 'success',
        data: chats,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Start or retrieve a private conversation with a friend
  getOrCreatePrivateChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { recipientId } = req.body;
      const chat = await this.chatService.getOrCreatePrivateChat(userId, recipientId as string);

      res.status(201).json({
        status: 'success',
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Mark all messages in a conversation as read
  resetUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const chatId = req.params.id as string;
      const chat = await this.chatService.resetUnreadCount(chatId, userId);

      res.status(200).json({
        status: 'success',
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Pin a conversation
  pinChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const chatId = req.params.id as string;
      const chat = await this.chatService.pinChat(chatId, userId);

      res.status(200).json({
        status: 'success',
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Unpin a conversation
  unpinChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const chatId = req.params.id as string;
      const chat = await this.chatService.unpinChat(chatId, userId);

      res.status(200).json({
        status: 'success',
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ChatController;
