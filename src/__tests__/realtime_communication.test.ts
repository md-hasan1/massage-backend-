import request from 'supertest';
import app from '../app';
import { verifyToken } from '../utils/jwt';
import UserRepository from '../app/modules/user/user.repository';
import { activeConnections } from '../socket';

// Mock dependencies
jest.mock('../utils/jwt');
jest.mock('../app/modules/user/user.repository');
jest.mock('../app/modules/friend/friendship.repository');
jest.mock('../app/helpers/notification.helper', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(true),
  sendCallPushNotification: jest.fn().mockResolvedValue(true),
}));

describe('Real-Time Communication & WebRTC Integration Suite', () => {
  const mockUserA = '64e8a1b2c3d4e5f6a7b8c9d0';

  beforeEach(() => {
    jest.clearAllMocks();
    activeConnections.clear();
    (verifyToken as jest.Mock).mockReturnValue({ userId: mockUserA });
    UserRepository.prototype.findById = jest.mocked(UserRepository.prototype.findById).mockResolvedValue({
      _id: mockUserA,
      name: 'User A',
      email: 'usera@example.com',
    } as any);

    const FriendshipRepository = require('../app/modules/friend/friendship.repository').default;
    jest.spyOn(FriendshipRepository.prototype, 'findPendingRequests').mockResolvedValue([
      {
        _id: 'req_1',
        requester: { _id: { toString: () => 'user_b' }, name: 'User B', email: 'b@example.com' },
        recipient: { _id: { toString: () => mockUserA }, name: 'User A', email: 'a@example.com' },
        createdAt: new Date(),
      }
    ] as any);
  });

  describe('Socket Active Connections Registry', () => {
    it('should correctly map user string IDs and active socket sessions', () => {
      activeConnections.set(mockUserA, ['socket_123']);
      expect(activeConnections.get(mockUserA)).toEqual(['socket_123']);
      expect(activeConnections.has(mockUserA)).toBe(true);
    });
  });

  describe('JWT Verification for Socket & REST Handshake', () => {
    it('should verify authentication headers correctly for protected endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/friends/requests/pending')
        .set('Authorization', 'Bearer mock_valid_token');

      expect(response.status).toBe(200);
      expect(verifyToken).toHaveBeenCalledWith('mock_valid_token', expect.any(String));
    });
  });
});
