import { Request, Response, NextFunction } from 'express';
import FriendService from './friend.service';

export class FriendController {
  private friendService = new FriendService();

  /// Send a friend request
  sendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requesterId = req.user!.id;
      const { recipientId } = req.body;
      
      const result = await this.friendService.sendFriendRequest(requesterId, recipientId);

      res.status(201).json({
        status: 'success',
        message: 'Friend request sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Respond to a pending friend request
  respondRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { requestId, action } = req.body; // action: 'accept' | 'reject'

      const result = await this.friendService.respondToFriendRequest(userId, requestId, action);

      res.status(200).json({
        status: 'success',
        message: `Friend request ${action}ed successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Get list of accepted friends
  getFriends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.friendService.getActiveFriends(userId);

      res.status(200).json({
        status: 'success',
        message: 'Friends list retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Get list of pending incoming and outgoing requests
  getPendingRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.friendService.getPendingRequests(userId);

      res.status(200).json({
        status: 'success',
        message: 'Pending requests retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /// Unfriend a user
  removeFriend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { friendId } = req.body;

      await this.friendService.removeFriend(userId, friendId);

      res.status(200).json({
        status: 'success',
        message: 'Friend removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /// Search users
  searchUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const query = (req.query.q as string) || '';

      const result = await this.friendService.searchUsers(userId, query);

      res.status(200).json({
        status: 'success',
        message: 'Users search completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default FriendController;
