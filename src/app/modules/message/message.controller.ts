import { Request, Response, NextFunction } from 'express';
import MessageService from './message.service';
import { uploadFile } from '../../helpers/upload';
import { AppError } from '../../../utils/AppError';
import { getIO } from '../../../socket';

export class MessageController {
  private messageService = new MessageService();

  /// Fetch chat messages history
  getChatMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const chatId = req.params.chatId as string;
      const limit = Number(req.query.limit) || 30;
      const skip = Number(req.query.skip) || 0;

      const messages = await this.messageService.getChatMessages(userId, chatId, limit, skip);

      res.status(200).json({
        status: 'success',
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Edit a text message
  editMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const messageId = req.params.id as string;
      const { content } = req.body;

      if (!content || content.trim() === '') {
        throw new AppError('Message content is required to edit', 400);
      }

      const message = await this.messageService.editMessage(userId, messageId, content);

      try {
        const io = getIO();
        io.to(message.chatId.toString()).emit('message_edited', message);
      } catch (err) {
        // Log socket error but do not fail the request
      }

      res.status(200).json({
        status: 'success',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Delete a message for everyone
  deleteForEveryone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const messageId = req.params.id as string;

      const message = await this.messageService.deleteMessageForEveryone(userId, messageId);

      try {
        const io = getIO();
        io.to(message.chatId.toString()).emit('message_deleted_everyone', {
          messageId: message._id.toString(),
          chatId: message.chatId.toString(),
        });
      } catch (err) {
        // Log socket error but do not fail the request
      }

      res.status(200).json({
        status: 'success',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Delete a message only for the requesting user (soft delete)
  deleteForMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const messageId = req.params.id as string;

      const message = await this.messageService.deleteMessageForMe(userId, messageId);

      res.status(200).json({
        status: 'success',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Handle media attachments upload
  uploadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const reqHost = `${req.protocol}://${req.get('host')}`;
      const fileUrl = await uploadFile(req.file.path, req.file.originalname, reqHost);

      res.status(200).json({
        status: 'success',
        data: {
          url: fileUrl,
          name: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /// Mark messages as delivered
  markAsDelivered = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const chatId = req.params.chatId as string;

      await this.messageService.markAsDelivered(chatId, userId);

      try {
        const io = getIO();
        const now = new Date();
        const payload = { chatId, userId, deliveredAt: now.toISOString() };
        io.to(chatId).emit('message_delivered', payload);
      } catch (err) {
        // Log socket error but do not fail
      }

      res.status(200).json({
        status: 'success',
        message: 'Messages marked as delivered',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default MessageController;
