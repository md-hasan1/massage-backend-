import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';
import apiRouter from './app/routes';
import errorHandler from './app/middlewares/error';
import { config } from './config';
import { AppError } from './utils/AppError';

const app: Application = express();

// Set HTTP Security Headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Apply Rate Limiting to prevent brute-force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// JSON and URL-encoded parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder locally
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount consolidated API Routes under /api/v1
app.use('/api/v1', apiRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Chat App Backend API is running',
    environment: config.env,
    timestamp: new Date(),
  });
});

// Basic health check endpoint for monitoring
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    environment: config.env,
    timestamp: new Date(),
  });
});

// Handle undefined endpoints
app.use((req: Request, _res: Response, next) => {
  next(new AppError(`Endpoint ${req.originalUrl} does not exist`, 404));
});

// Global Error Handler Middleware (MUST be registered last)
app.use(errorHandler);

export default app;
