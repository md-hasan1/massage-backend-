import Friendship, { IFriendship } from './friendship.model';

export class FriendshipRepository {
  /// Create a new pending friend request
  async create(requesterId: string, recipientId: string): Promise<IFriendship> {
    return Friendship.create({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    });
  }

  /// Find a friendship record between two users (order-independent)
  async findFriendship(userA: string, userB: string): Promise<IFriendship | null> {
    return Friendship.findOne({
      $or: [
        { requester: userA, recipient: userB },
        { requester: userB, recipient: userA },
      ],
    }).exec();
  }

  /// Find all pending requests involving this user
  async findPendingRequests(userId: string): Promise<IFriendship[]> {
    return Friendship.find({
      status: 'pending',
      $or: [{ requester: userId }, { recipient: userId }],
    })
      .populate('requester', 'name email photoUrl bio')
      .populate('recipient', 'name email photoUrl bio')
      .exec();
  }

  /// Find all accepted friendships for a user
  async findActiveFriendships(userId: string): Promise<IFriendship[]> {
    return Friendship.find({
      status: 'accepted',
      $or: [{ requester: userId }, { recipient: userId }],
    })
      .populate('requester', 'name email photoUrl bio isOnline lastSeen')
      .populate('recipient', 'name email photoUrl bio isOnline lastSeen')
      .exec();
  }

  /// Find a friendship record by its ObjectId
  async findById(id: string): Promise<IFriendship | null> {
    return Friendship.findById(id).exec();
  }

  /// Update the status of a request
  async updateStatus(id: string, status: 'accepted' | 'rejected'): Promise<IFriendship | null> {
    return Friendship.findByIdAndUpdate(id, { status }, { new: true }).exec();
  }

  /// Delete a friendship record
  async delete(id: string): Promise<any> {
    return Friendship.findByIdAndDelete(id).exec();
  }

  /// Get all relationships for a specific user (to determine relationship status during search)
  async findFriendshipsByUser(userId: string): Promise<IFriendship[]> {
    return Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
    }).exec();
  }
}
export default FriendshipRepository;
