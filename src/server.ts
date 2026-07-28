import dns from 'dns';
// Force Node.js to use Google and Cloudflare DNS to avoid local router SRV resolution failures
dns.setServers(['8.8.8.8', '1.1.1.1']);

import http from 'http';
import app from './app';
import { config } from './config';
import { connectDatabase } from './helpers/database';
import { initializeSocket } from './socket';
import { logger } from './utils/logger';

// Handle Uncaught Exceptions (synchronous errors)
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Server is shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack || '');
  process.exit(1);
});

const server = http.createServer(app);

const startServer = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDatabase();

  // Initialize Socket.IO Server
  initializeSocket(server);

  // Start Server Listener
  server.listen(config.port, () => {
    logger.info(`Backend server running in [${config.env}] mode on port: ${config.port}`);
  });
};

startServer();

// Handle Unhandled Rejections (asynchronous errors/unhandled promises)
process.on('unhandledRejection', (err: any) => {
  logger.error('UNHANDLED REJECTION! Gracefully shutting down server...');
  logger.error(`${err.name}: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Triggering server reload to initialize Firebase Admin SDK

