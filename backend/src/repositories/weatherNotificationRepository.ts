import { supabaseAdmin, getAuthenticatedClient } from '../config/supabase';
import { WeatherData, NotificationItem, AIPredictionRecord } from '../types';

export class WeatherRepository {
  static async getCache(locationKey: string): Promise<any | null> {
    const { data } = await supabaseAdmin
      .from('weather_cache')
      .select('*')
      .eq('location_key', locationKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    return data;
  }

  static async setCache(
    locationKey: string,
    latitude: number,
    longitude: number,
    currentData: any,
    forecastData: any,
    ttlMinutes: number = 30
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabaseAdmin.from('weather_cache').upsert({
      location_key: locationKey,
      latitude,
      longitude,
      current_data: currentData,
      forecast_data: forecastData,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
  }

  static async saveObservation(obs: {
    farmId?: string;
    locationKey: string;
    latitude: number;
    longitude: number;
    observationTime: string;
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    weatherCondition: string;
    rawData?: any;
    isForecast?: boolean;
  }): Promise<void> {
    await supabaseAdmin.from('weather_observations').insert({
      farm_id: obs.farmId,
      location_key: obs.locationKey,
      latitude: obs.latitude,
      longitude: obs.longitude,
      observation_time: obs.observationTime,
      temperature: obs.temperature,
      humidity: obs.humidity,
      rainfall_mm: obs.rainfallMm,
      wind_speed_kmh: obs.windSpeedKmh,
      weather_condition: obs.weatherCondition,
      raw_data: obs.rawData || {},
      is_forecast: obs.isForecast || false,
    });
  }

  static async getHistorical(
    locationKey: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('weather_observations')
      .select('*')
      .eq('location_key', locationKey)
      .gte('observation_time', startDate)
      .lte('observation_time', endDate)
      .order('observation_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export class NotificationRepository {
  static async findByUser(userId: string, unreadOnly: boolean = false, token?: string): Promise<NotificationItem[]> {
    const client = getAuthenticatedClient(token);
    let query = client.from('notifications').select('*').eq('user_id', userId);
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  }

  static async create(item: Partial<NotificationItem>): Promise<NotificationItem> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        ...item,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async markAsRead(id: string, userId: string, token?: string): Promise<void> {
    const client = getAuthenticatedClient(token);
    await client.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId);
  }

  static async markAllAsRead(userId: string, token?: string): Promise<void> {
    const client = getAuthenticatedClient(token);
    await client.from('notifications').update({ read: true }).eq('user_id', userId);
  }
}

export class AIPredictionRepository {
  static async savePrediction(record: Partial<AIPredictionRecord>): Promise<AIPredictionRecord> {
    const { data, error } = await supabaseAdmin
      .from('ai_predictions')
      .insert({
        ...record,
        prediction_timestamp: record.prediction_timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getPredictions(taskType?: string, limit: number = 20): Promise<AIPredictionRecord[]> {
    let query = supabaseAdmin.from('ai_predictions').select('*');
    if (taskType) {
      query = query.eq('task_type', taskType);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }
}
