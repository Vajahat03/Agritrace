import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes';
import farmerRoutes from './routes/farmerRoutes';
import vendorRoutes from './routes/vendorRoutes';
import customerRoutes from './routes/customerRoutes';
import { weatherRoutes, traceRoutes, aiRoutes, notificationRoutes } from './routes/systemRoutes';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app: Express = express();

// Security and Logging Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-user-id', 'x-dev-user-role', 'x-dev-user-email', 'x-dev-user-name'],
  })
);
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AgriTrace API v1',
    environment: env.NODE_ENV,
    storage: 'Supabase PostgreSQL & Storage Enabled',
  });
});

// Mount Versioned API Routes (/api/v1/*)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/farmer', farmerRoutes);
app.use('/api/v1/vendor', vendorRoutes);
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/trace', traceRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Catch 404 Route
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
