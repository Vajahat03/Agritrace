import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { WeatherService } from '../services/weather/weatherService';
import { NotificationService } from '../services/notifications/notificationService';

export function setupWeatherSyncJob(): void {
  // Sync weather every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('[Job:WeatherSync] Syncing weather observations for active farms...');

      const { data: farms } = await supabaseAdmin
        .from('farms')
        .select('id, latitude, longitude, farmer_id')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!farms) return;

      for (const farm of farms) {
        if (farm.latitude && farm.longitude) {
          const weather = await WeatherService.getWeather(farm.latitude, farm.longitude, farm.id);

          // If heavy rainfall or heat stress alert
          if (weather.rainfallMm > 25 || weather.temperature > 38) {
            await NotificationService.sendNotification({
              userId: farm.farmer_id,
              type: 'WEATHER_ALERT',
              title: weather.rainfallMm > 25 ? '🌧️ Heavy Rainfall Advisory' : '☀️ High Heat Advisory',
              message: `Weather update for your farm: ${weather.condition}, Temp: ${weather.temperature}°C, Rain: ${weather.rainfallMm}mm. Take necessary crop protection measures.`,
              severity: 'WARNING',
            });
          }
        }
      }
    } catch (err) {
      console.error('[Job:WeatherSync] Error:', err);
    }
  });
}

export function setupInventoryAlertsJob(): void {
  // Check inventory stock levels daily at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('[Job:InventoryAlerts] Checking vendor stock levels...');

      const { data: items } = await supabaseAdmin
        .from('vendor_inventory')
        .select('*')
        .lt('quantity', 10)
        .gt('quantity', 0);

      if (!items) return;

      for (const item of items) {
        await NotificationService.sendNotification({
          userId: item.vendor_id,
          type: 'INVENTORY_ALERT',
          title: '📦 Low Stock Alert',
          message: `Your inventory for "${item.product_name}" is low (${item.quantity} ${item.unit} remaining). Consider procuring more batches.`,
          severity: 'WARNING',
          metadata: { inventoryId: item.id },
        });
      }
    } catch (err) {
      console.error('[Job:InventoryAlerts] Error:', err);
    }
  });
}

export function initializeBackgroundJobs(): void {
  console.log('⏰ Initializing AgriTrace scheduled background jobs...');
  setupWeatherSyncJob();
  setupInventoryAlertsJob();
}
