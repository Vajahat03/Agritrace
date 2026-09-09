import { Request, Response } from 'express';
import {
  VisionServiceAdapter,
  FreshnessServiceAdapter,
  ShelfLifeServiceAdapter,
  PricePredictionServiceAdapter,
  RAGServiceAdapter,
  AgentServiceAdapter,
} from '../services/ai/aiAdapters';
import { AIPredictionRepository } from '../repositories/weatherNotificationRepository';

export class AIController {
  static async analyzeVision(req: Request, res: Response): Promise<void> {
    try {
      const result = await VisionServiceAdapter.analyze(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'AI_VISION_ERROR', message: error.message } });
    }
  }

  static async predictFreshness(req: Request, res: Response): Promise<void> {
    try {
      const result = await FreshnessServiceAdapter.predict(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'AI_FRESHNESS_ERROR', message: error.message } });
    }
  }

  static async predictShelfLife(req: Request, res: Response): Promise<void> {
    try {
      const result = await ShelfLifeServiceAdapter.predict(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'AI_SHELFLIFE_ERROR', message: error.message } });
    }
  }

  static async predictPrice(req: Request, res: Response): Promise<void> {
    try {
      const result = await PricePredictionServiceAdapter.predict(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'AI_PRICE_ERROR', message: error.message } });
    }
  }

  static async queryRAG(req: Request, res: Response): Promise<void> {
    try {
      const result = await RAGServiceAdapter.query(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'AI_RAG_ERROR', message: error.message } });
    }
  }

  static async runAgent(req: Request, res: Response): Promise<void> {
    try {
      const result = await AgentServiceAdapter.run(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'AI_AGENT_ERROR', message: error.message } });
    }
  }

  static async getPredictionHistory(req: Request, res: Response): Promise<void> {
    try {
      const taskType = req.query.taskType as string;
      const history = await AIPredictionRepository.getPredictions(taskType);
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'AI_HISTORY_ERROR', message: error.message } });
    }
  }
}
