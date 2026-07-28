import request from 'supertest';
import app from '../app';
import { MessageService } from '../app/modules/message/message.service';
import { verifyToken } from '../utils/jwt';
import UserRepository from '../app/modules/user/user.repository';

// Mock dependencies
jest.mock('../app/modules/message/message.service');
jest.mock('../utils/jwt');
jest.mock('../app/modules/user/user.repository');

describe('Message Controller Tests', () => {
  const mockUserId = '64e8a1b2c3d4e5f6a7b8c9d0';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Authentication Middleware
    (verifyToken as jest.Mock).mockReturnValue({ userId: mockUserId });
    UserRepository.prototype.findById = jest.mocked(UserRepository.prototype.findById).mockResolvedValue({
      _id: mockUserId,
      email: 'test@example.com',
    } as any);
  });

  describe('GET /api/v1/messages/:chatId', () => {
    it('should successfully retrieve messages', async () => {
      const mockMessages = [
        { _id: 'msg1', text: 'Hello', sender: mockUserId },
        { _id: 'msg2', text: 'Hi', sender: 'other_user' }
      ];

      (MessageService.prototype.getChatMessages as jest.Mock).mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/api/v1/messages/64e8a1b2c3d4e5f6a7b8c9d1')
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBe(2);
      expect(MessageService.prototype.getChatMessages).toHaveBeenCalledWith(mockUserId, '64e8a1b2c3d4e5f6a7b8c9d1', 30, 0);
    });
  });

});
