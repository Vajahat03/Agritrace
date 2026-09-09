import { Request, Response } from 'express';
import { WeatherService } from '../services/weather/weatherService';
import { WeatherRepository } from '../repositories/weatherNotificationRepository';

export class WeatherController {
  static async getCurrentAndForecast(req: Request, res: Response): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string) || 19.076;
      const lon = parseFloat(req.query.lon as string) || 72.877;
      const farmId = req.query.farmId as string;

      const weather = await WeatherService.getWeather(lat, lon, farmId);
      res.status(200).json({ success: true, data: weather });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'WEATHER_FETCH_ERROR', message: error.message } });
    }
  }

  static async getHistorical(req: Request, res: Response): Promise<void> {
    try {
      const { locationKey, startDate, endDate } = req.query;
      if (!locationKey || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'locationKey, startDate, and endDate query parameters are required' },
        });
        return;
      }

      const records = await WeatherRepository.getHistorical(
        locationKey as string,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ success: true, data: records });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'HISTORICAL_WEATHER_ERROR', message: error.message } });
    }
  }
}
