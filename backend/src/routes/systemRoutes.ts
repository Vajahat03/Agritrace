import { Router } from 'express';
import { WeatherController } from '../controllers/weatherController';
import { TraceController } from '../controllers/traceController';
import { AIController } from '../controllers/aiController';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';

export const weatherRoutes = Router();
weatherRoutes.get('/current', WeatherController.getCurrentAndForecast);
weatherRoutes.get('/forecast', WeatherController.getCurrentAndForecast);
weatherRoutes.get('/historical', WeatherController.getHistorical);

export const traceRoutes = Router();
traceRoutes.get('/batch/:batchId', optionalAuthMiddleware, TraceController.getBatchTraceability);
traceRoutes.get('/batch/:batchId/qr', TraceController.getBatchQRCode);

export const aiRoutes = Router();
aiRoutes.post('/vision/analyze', AIController.analyzeVision);
aiRoutes.post('/freshness/predict', AIController.predictFreshness);
aiRoutes.post('/shelflife/predict', AIController.predictShelfLife);
aiRoutes.post('/price/predict', AIController.predictPrice);
aiRoutes.post('/rag/query', AIController.queryRAG);
aiRoutes.post('/agent/run', AIController.runAgent);
aiRoutes.get('/provenance', AIController.getPredictionHistory);

export const notificationRoutes = Router();
notificationRoutes.use(authMiddleware);
notificationRoutes.get('/', NotificationController.getNotifications);
notificationRoutes.patch('/:id/read', NotificationController.markAsRead);
notificationRoutes.post('/:id/read', NotificationController.markAsRead);
notificationRoutes.patch('/read-all', NotificationController.markAllAsRead);
notificationRoutes.post('/read-all', NotificationController.markAllAsRead);

export default {
    weatherRoutes,
    traceRoutes,
    aiRoutes,
    notificationRoutes,
};
