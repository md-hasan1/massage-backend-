import { Request, Response, NextFunction } from 'express';
import AuthService from './auth.service';
import { AppError } from '../../../utils/AppError';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ipAddress = req.ip || '';
      const deviceInfo = req.headers['user-agent'] || '';
      const result = await this.authService.registerUser(req.body, ipAddress, deviceInfo);

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ipAddress = req.ip || '';
      const deviceInfo = req.headers['user-agent'] || '';
      const result = await this.authService.loginUser(req.body, ipAddress, deviceInfo);

      res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await this.authService.logoutUser(refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idToken } = req.body;
      const ipAddress = req.ip || '';
      const deviceInfo = req.headers['user-agent'] || '';
      const result = await this.authService.googleLogin(idToken, ipAddress, deviceInfo);

      res.status(200).json({
        status: 'success',
        message: 'Logged in with Google successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  saveFcmToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      if (!token) {
        throw new AppError('FCM token is required', 400);
      }

      await this.authService.saveFcmToken(userId, token);

      res.status(200).json({
        status: 'success',
        message: 'FCM token registered successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  removeFcmToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      if (!token) {
        throw new AppError('FCM token is required', 400);
      }

      await this.authService.removeFcmToken(userId, token);

      res.status(200).json({
        status: 'success',
        message: 'FCM token removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
export default AuthController;
