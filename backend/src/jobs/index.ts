import { setupFreshnessNotificationsJob } from './freshnessNotifications.job';
import { setupWeatherSyncJob, setupInventoryAlertsJob } from './systemJobs';

export function startAllJobs(): void {
  console.log('⏰ Starting AgriTrace automated background jobs (Freshness alerts, Weather sync, Inventory alerts)...');
  setupFreshnessNotificationsJob();
  setupWeatherSyncJob();
  setupInventoryAlertsJob();
}
