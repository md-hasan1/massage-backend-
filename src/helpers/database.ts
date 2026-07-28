import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB database connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB database connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB database connection disconnected.');
    });

    await mongoose.connect(config.mongodbUri);
  } catch (error) {
    logger.error(`Initial MongoDB connection error: ${error}`);
    process.exit(1);
  }
};
