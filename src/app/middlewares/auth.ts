import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt';
import { config } from '../../config';
import { AppError } from '../../utils/AppError';
import UserRepository from '../modules/user/user.repository';

// Extend Express Request interface to store authenticated user details
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const auth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication failed: Missing token', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, config.jwt.accessSecret);

    if (!decoded || !decoded.userId) {
      throw new AppError('Authentication failed: Invalid or expired token', 401);
    }

    const userRepository = new UserRepository();
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError('Authentication failed: User not found', 401);
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default auth;
