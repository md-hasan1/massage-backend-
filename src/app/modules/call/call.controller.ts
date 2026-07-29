import { Request, Response, NextFunction } from 'express';
import CallService from './call.service';

export class CallController {
  private callService = new CallService();

  createCallLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const callerId = req.user!.id;
      const { receiverId, type, status, duration } = req.body;

      const call = await this.callService.createCallLog(callerId, receiverId, type, status, duration);

      res.status(201).json({
        status: 'success',
        data: call,
      });
    } catch (error) {
      next(error);
    }
  };

  getCallHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const history = await this.callService.getCallHistory(userId);

      res.status(200).json({
        status: 'success',
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCallLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const callId = req.params.id as string;

      const call = await this.callService.deleteCallLog(callId, userId);

      res.status(200).json({
        status: 'success',
        data: call,
      });
    } catch (error) {
      next(error);
    }
  };

  clearCallHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await this.callService.clearCallHistory(userId);

      res.status(200).json({
        status: 'success',
        message: 'Call history cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default CallController;
