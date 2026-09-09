import { Request, Response } from 'express';
import { TraceabilityService } from '../services/traceability/traceabilityService';

export class TraceController {
  static async getBatchTraceability(req: Request, res: Response): Promise<void> {
    try {
      const batchId = req.params.batchId as string;
      const data = await TraceabilityService.getBatchTraceability(batchId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { code: 'BATCH_NOT_FOUND', message: error.message } });
    }
  }

  static async getBatchQRCode(req: Request, res: Response): Promise<void> {
    try {
      const batchId = req.params.batchId as string;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const qrDataUrl = await TraceabilityService.generateQRCodeDataUrl(batchId, baseUrl);
      res.status(200).json({ success: true, data: { qrDataUrl, batchId } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'QR_GENERATION_ERROR', message: error.message } });
    }
  }
}
