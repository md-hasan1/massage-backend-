import FriendshipRepository from './friendship.repository';
import UserRepository from '../user/user.repository';
import User from '../user/user.model';
import { AppError } from '../../../utils/AppError';
import { sendPushNotification } from '../../helpers/notification.helper';
import { emitToUser } from '../../../socket';

export class FriendService {
  private friendshipRepository = new FriendshipRepository();
  private userRepository = new UserRepository();

  /// Send a friend request to a user
  async sendFriendRequest(requesterId: string, recipientId: string) {
    if (requesterId === recipientId) {
      throw new AppError('You cannot send a friend request to yourself', 400);
    }

    const recipient = await this.userRepository.findById(recipientId);
    if (!recipient) {
      throw new AppError('Recipient user not found', 404);
    }

    // Check if either user has blocked the other
    const recipientUser = await User.findById(recipientId);
    const requesterUser = await User.findById(requesterId);

    const isRequesterBlocked = recipientUser?.blockedUsers?.some((id: any) => id.toString() === requesterId);
    const isRecipientBlocked = requesterUser?.blockedUsers?.some((id: any) => id.toString() === recipientId);

    if (isRequesterBlocked || isRecipientBlocked) {
      throw new AppError('Action blocked by security settings', 400);
    }

    const requesterName = requesterUser ? requesterUser.name : 'Someone';

    const existing = await this.friendshipRepository.findFriendship(requesterId, recipientId);
    if (existing) {
      if (existing.status === 'accepted') {
        throw new AppError('You are already friends with this user', 400);
      }
      if (existing.status === 'pending') {
        throw new AppError('A friend request is already pending between you two', 400);
      }
      
      // If the request was previously rejected, let's reset it to pending
      existing.status = 'pending';
      existing.requester = requesterId as any;
      existing.recipient = recipientId as any;
      await existing.save();

      // Trigger push notification (fire-and-forget background operation)
      sendPushNotification(recipientId, {
        title: 'New Friend Request',
        body: `${requesterName} sent you a friend request!`,
        data: { type: 'friend_request' },
      }).catch((err: any) => console.error(`[error]: Friend request notification failed: ${err.message}`));

      // Emit socket events
      const friendshipId = existing._id.toString();
      emitToUser(recipientId, 'friend_request_event', {
        action: 'sent',
        friendshipId,
        requesterId,
        recipientId,
        requesterName,
      });
      emitToUser(requesterId, 'friend_request_event', {
        action: 'sent',
        friendshipId,
        requesterId,
        recipientId,
        requesterName,
      });

      return existing;
    }

    const friendship = await this.friendshipRepository.create(requesterId, recipientId);

    // Trigger push notification
    sendPushNotification(recipientId, {
      title: 'New Friend Request',
      body: `${requesterName} sent you a friend request!`,
      data: { type: 'friend_request' },
    }).catch((err: any) => console.error(`[error]: Friend request notification failed: ${err.message}`));

    // Emit socket events
    const friendshipId = friendship._id.toString();
    emitToUser(recipientId, 'friend_request_event', {
      action: 'sent',
      friendshipId,
      requesterId,
      recipientId,
      requesterName,
    });
    emitToUser(requesterId, 'friend_request_event', {
      action: 'sent',
      friendshipId,
      requesterId,
      recipientId,
      requesterName,
    });

    return friendship;
  }

  /// Respond to a friend request (Accept, Reject, or Cancel)
  async respondToFriendRequest(userId: string, requestId: string, action: 'accept' | 'reject' | 'cancel') {
    const friendship = await this.friendshipRepository.findById(requestId);
    if (!friendship) {
      throw new AppError('Friend request not found', 404);
    }

    const requesterId = friendship.requester.toString();
    const recipientId = friendship.recipient.toString();

    if (action === 'cancel') {
      if (requesterId !== userId) {
        throw new AppError('You cannot cancel a request you did not send', 403);
      }

      const requester = await this.userRepository.findById(requesterId);
      const requesterName = requester ? requester.name : 'Someone';

      await this.friendshipRepository.delete(requestId);

      // Trigger push notification to recipient
      sendPushNotification(recipientId, {
        title: 'Friend Request Cancelled',
        body: `${requesterName} cancelled the friend request.`,
        data: { type: 'friend_request' },
      }).catch((err: any) => console.error(`[error]: Cancel friend request notification failed: ${err.message}`));

      // Emit socket events
      emitToUser(recipientId, 'friend_request_event', {
        action: 'cancelled',
        friendshipId: requestId,
        requesterId,
        recipientId,
      });
      emitToUser(userId, 'friend_request_event', {
        action: 'cancelled',
        friendshipId: requestId,
        requesterId,
        recipientId,
      });

      return { success: true };
    }

    // Ensure the user responding is the recipient of the request
    if (recipientId !== userId) {
      throw new AppError('You are not authorized to respond to this request', 403);
    }

    if (friendship.status !== 'pending') {
      throw new AppError(`Request has already been ${friendship.status}`, 400);
    }

    if (action === 'accept') {
      const updated = await this.friendshipRepository.updateStatus(requestId, 'accepted');

      const recipient = await this.userRepository.findById(recipientId);
      const recipientName = recipient ? recipient.name : 'Someone';

      // Trigger push notification to requester
      sendPushNotification(requesterId, {
        title: 'Friend Request Accepted',
        body: `${recipientName} accepted your friend request!`,
        data: { type: 'friend_request' },
      }).catch((err: any) => console.error(`[error]: Accept friend request notification failed: ${err.message}`));

      // Emit socket events
      emitToUser(requesterId, 'friend_request_event', {
        action: 'accepted',
        friendshipId: requestId,
        requesterId,
        recipientId,
        recipientName,
      });
      emitToUser(userId, 'friend_request_event', {
        action: 'accepted',
        friendshipId: requestId,
        requesterId,
        recipientId,
        recipientName,
      });

      return updated;
    } else {
      // Rejections will delete the relationship block so they can request again later
      await this.friendshipRepository.delete(requestId);

      // Emit socket events
      emitToUser(requesterId, 'friend_request_event', {
        action: 'rejected',
        friendshipId: requestId,
        requesterId,
        recipientId,
      });
      emitToUser(recipientId, 'friend_request_event', {
        action: 'rejected',
        friendshipId: requestId,
        requesterId,
        recipientId,
      });

      return { success: true };
    }
  }

  /// Retrieve the list of active friends for a user
  async getActiveFriends(userId: string) {
    const friendships = await this.friendshipRepository.findActiveFriendships(userId);
    
    return friendships.map((f) => {
      // Return the other user's profile details
      const friend = f.requester._id.toString() === userId ? f.recipient : f.requester;
      return {
        friendshipId: f._id,
        id: friend._id,
        name: (friend as any).name,
        email: (friend as any).email,
        bio: (friend as any).bio,
        photoUrl: (friend as any).photoUrl,
        isOnline: (friend as any).isOnline,
        lastSeen: (friend as any).lastSeen,
      };
    });
  }

  /// Retrieve incoming and outgoing pending requests for a user
  async getPendingRequests(userId: string) {
    const requests = await this.friendshipRepository.findPendingRequests(userId);
    
    const incoming: any[] = [];
    const outgoing: any[] = [];

    requests.forEach((r: any) => {
      const recipientId = (r.recipient?._id || r.recipient)?.toString();
      const requesterId = (r.requester?._id || r.requester)?.toString();
      const currentUserId = userId.toString();

      if (recipientId === currentUserId) {
        const senderObj = typeof r.requester === 'object' && r.requester !== null ? r.requester : {};
        incoming.push({
          requestId: r._id.toString(),
          sender: {
            id: senderObj._id?.toString() || requesterId,
            name: senderObj.name || 'User',
            email: senderObj.email || '',
            bio: senderObj.bio,
            photoUrl: senderObj.photoUrl,
          },
          createdAt: r.createdAt,
        });
      } else if (requesterId === currentUserId) {
        const recipientObj = typeof r.recipient === 'object' && r.recipient !== null ? r.recipient : {};
        outgoing.push({
          requestId: r._id.toString(),
          receiver: {
            id: recipientObj._id?.toString() || recipientId,
            name: recipientObj.name || 'User',
            email: recipientObj.email || '',
            bio: recipientObj.bio,
            photoUrl: recipientObj.photoUrl,
          },
          createdAt: r.createdAt,
        });
      }
    });

    return { incoming, outgoing };
  }

  /// Remove a friend (unfriend)
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.friendshipRepository.findFriendship(userId, friendId);
    if (!friendship || friendship.status !== 'accepted') {
      throw new AppError('Friendship connection not found', 404);
    }
    const result = await this.friendshipRepository.delete(friendship._id.toString());

    // Emit socket events
    emitToUser(friendId, 'friend_request_event', {
      action: 'unfriended',
      friendshipId: friendship._id.toString(),
      requesterId: friendship.requester.toString(),
      recipientId: friendship.recipient.toString(),
    });
    emitToUser(userId, 'friend_request_event', {
      action: 'unfriended',
      friendshipId: friendship._id.toString(),
      requesterId: friendship.requester.toString(),
      recipientId: friendship.recipient.toString(),
    });

    return result;
  }

  /// Search users and return their relationship status relative to the current user
  async searchUsers(userId: string, searchVal: string) {
    const cleanQuery = searchVal ? searchVal.trim() : '';
    
    // Find matching users (limit to 50), excluding deleted, self, and blocked ones
    const currentUser = await User.findById(userId);
    const blockedIds = currentUser?.blockedUsers || [];
    
    const queryObj: any = {
      _id: { $ne: userId, $nin: blockedIds },
      blockedUsers: { $ne: userId },
      isDeleted: false,
    };

    if (cleanQuery !== '') {
      queryObj.$or = [
        { name: { $regex: cleanQuery, $options: 'i' } },
        { email: { $regex: cleanQuery, $options: 'i' } },
      ];
    }

    const users = await User.find(queryObj).limit(50);

    const relationships = await this.friendshipRepository.findFriendshipsByUser(userId);

    return users.map((u: any) => {
      const rel = relationships.find(
        (r) => r.requester.toString() === u._id.toString() || r.recipient.toString() === u._id.toString()
      );

      let relationshipStatus: 'none' | 'sent_pending' | 'received_pending' | 'friends' = 'none';
      let friendshipId: string | undefined;

      if (rel) {
        friendshipId = rel._id.toString();
        if (rel.status === 'accepted') {
          relationshipStatus = 'friends';
        } else if (rel.status === 'pending') {
          if (rel.requester.toString() === userId) {
            relationshipStatus = 'sent_pending';
          } else {
            relationshipStatus = 'received_pending';
          }
        }
      }

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        bio: u.bio,
        photoUrl: u.photoUrl,
        relationshipStatus,
        friendshipId,
      };
    });
  }

  /// Block a user
  async blockUser(userId: string, blockUserId: string) {
    if (userId === blockUserId) {
      throw new AppError('You cannot block yourself', 400);
    }

    const userToBlock = await this.userRepository.findById(blockUserId);
    if (!userToBlock) {
      throw new AppError('User to block not found', 404);
    }

    // 1. Add to blockedUsers array in User document
    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: blockUserId },
    });

    // 2. Delete any existing friendship or pending request between the two users
    const friendship = await this.friendshipRepository.findFriendship(userId, blockUserId);
    if (friendship) {
      await this.friendshipRepository.delete(friendship._id.toString());

      // Emit socket events to notify the client-side UI of friendship removal
      emitToUser(blockUserId, 'friend_request_event', {
        action: 'unfriended',
        friendshipId: friendship._id.toString(),
        requesterId: friendship.requester.toString(),
        recipientId: friendship.recipient.toString(),
      });
      emitToUser(userId, 'friend_request_event', {
        action: 'unfriended',
        friendshipId: friendship._id.toString(),
        requesterId: friendship.requester.toString(),
        recipientId: friendship.recipient.toString(),
      });
    }

    return { success: true };
  }

  /// Unblock a user
  async unblockUser(userId: string, unblockUserId: string) {
    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: unblockUserId },
    });
    return { success: true };
  }

  /// Retrieve the list of blocked users for a user
  async getBlockedUsers(userId: string) {
    const user = await User.findById(userId).populate('blockedUsers', 'name email photoUrl bio');
    return user?.blockedUsers || [];
  }
}
export default FriendService;
