import request from 'supertest';
import app from '../app';
import { AuthService } from '../app/modules/auth/auth.service';

// Mock the AuthService
jest.mock('../app/modules/auth/auth.service');

describe('Auth Controller Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully signup a new user', async () => {
      // Setup the mock response
      const mockUser = {
        _id: 'mock_user_id',
        username: 'testuser',
        email: 'test@example.com',
        avatar: 'avatar_url',
      };
      
      const mockTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      };

      (AuthService.prototype.registerUser as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBe('mock_access_token');
    });

    it('should return 400 for invalid inputs', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'te', // Too short
          email: 'invalid-email', // Invalid email
          password: 'pwd', // Too short
        });

      // Zod validation should catch this
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully login an existing user', async () => {
      const mockUser = {
        _id: 'mock_user_id',
        username: 'testuser',
        email: 'test@example.com',
      };
      
      const mockTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      };

      (AuthService.prototype.loginUser as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBe('mock_access_token');
    });
  });
});
