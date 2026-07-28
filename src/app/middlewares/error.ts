import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  // Log the detailed error
  logger.error(
    `[${req.method}] ${req.originalUrl} - StatusCode: ${statusCode} - Message: ${message}`
  );
  if (statusCode === 500) {
    logger.error(err.stack || '');
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  });
};
export default errorHandler;
