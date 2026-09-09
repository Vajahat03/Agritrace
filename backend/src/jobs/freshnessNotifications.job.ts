import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { NotificationService } from '../services/notifications/notificationService';

export function setupFreshnessNotificationsJob(): void {
  // Run daily at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[Job:FreshnessNotifications] Running daily shelf-life check...');

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Fetch active freshness bags where predicted_use_by_date is today or tomorrow
      const { data: bags, error } = await supabaseAdmin
        .from('freshness_bags')
        .select('*, scan:freshness_scans!fk_bag_latest_scan(*)')
        .eq('current_status', 'ACTIVE');

      if (error || !bags) return;

      for (const bag of bags) {
        if (!bag.scan) continue;

        const useByDate = bag.scan.predicted_use_by_date;
        if (useByDate === today || useByDate === tomorrow) {
          const isToday = useByDate === today;
          await NotificationService.sendNotification({
            userId: bag.customer_id,
            type: 'FRESHNESS_ALERT',
            title: isToday ? '⚠️ Freshness Alert: Use Today!' : '⏳ Freshness Notice: 1 Day Remaining',
            message: isToday
              ? `Your ${bag.produce_name} is estimated to reach its use-by window today. Plan to consume or prepare soon!`
              : `Your ${bag.produce_name} has approximately 1 day of optimal freshness remaining.`,
            severity: isToday ? 'WARNING' : 'INFO',
            metadata: {
              bagId: bag.id,
              produceName: bag.produce_name,
              predictedUseByDate: useByDate,
            },
          });
        }
      }
    } catch (err) {
      console.error('[Job:FreshnessNotifications] Execution error:', err);
    }
  });
}
