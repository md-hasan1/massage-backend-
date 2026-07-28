import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from './logger';

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry as any,
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry as any,
  });
};

export const verifyToken = (token: string, secret: string): any => {
  try {
    return jwt.verify(token, secret);
  } catch (error: any) {
    logger.error(`JWT verification error: ${error.message}`);
    return null;
  }
};
