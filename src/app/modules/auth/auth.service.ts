import UserRepository from '../user/user.repository';
import SessionRepository from './session.repository';
import { AppError } from '../../../utils/AppError';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../../utils/jwt';
import { config } from '../../../config';
import { OAuth2Client } from 'google-auth-library';

export class AuthService {
  private userRepository = new UserRepository();
  private sessionRepository = new SessionRepository();
  private googleClient = new OAuth2Client(config.googleClientId);

  async registerUser(userData: any, ipAddress = '', deviceInfo = '') {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError('Email is already registered', 400);
    }

    const user = await this.userRepository.create(userData);

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Save refresh token session in database (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionRepository.create({
      userId: user._id.toString(),
      token: refreshToken,
      ipAddress,
      deviceInfo,
      expiresAt,
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        photoUrl: user.photoUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  async loginUser(credentials: any, ipAddress = '', deviceInfo = '') {
    const user = await this.userRepository.findByEmail(credentials.email, true);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordMatch = await user.comparePassword(credentials.password);
    if (!isPasswordMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionRepository.create({
      userId: user._id.toString(),
      token: refreshToken,
      ipAddress,
      deviceInfo,
      expiresAt,
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        photoUrl: user.photoUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(token: string) {
    const decoded = verifyToken(token, config.jwt.refreshSecret);
    if (!decoded) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const session = await this.sessionRepository.findByToken(token);
    if (!session) {
      throw new AppError('Session not found or invalidated', 401);
    }

    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    const newAccessToken = generateAccessToken(user._id.toString());

    return {
      accessToken: newAccessToken,
    };
  }

  async logoutUser(token: string) {
    await this.sessionRepository.deleteByToken(token);
  }

  async googleLogin(idToken: string, ipAddress = '', deviceInfo = '') {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new AppError('Invalid Google token payload', 400);
      }

      const { email, name, picture, sub } = payload;

      let user = await this.userRepository.findByEmail(email);
      if (!user) {
        user = await this.userRepository.create({
          name: name || 'Google User',
          email,
          photoUrl: picture || '',
          googleId: sub,
        });
      } else {
        if (!user.googleId) {
          user.googleId = sub;
          await user.save();
        }
      }

      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.sessionRepository.create({
        userId: user._id.toString(),
        token: refreshToken,
        ipAddress,
        deviceInfo,
        expiresAt,
      });

      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio,
          phone: user.phone,
          photoUrl: user.photoUrl,
        },
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Google authentication failed: ${error.message}`, 401);
    }
  }

  async saveFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepository.update(userId, {
      $addToSet: { fcmTokens: fcmToken }
    });
  }

  async removeFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepository.update(userId, {
      $pull: { fcmTokens: fcmToken }
    });
  }
}
export default AuthService;
