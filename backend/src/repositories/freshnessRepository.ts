import { getAuthenticatedClient, supabaseAdmin } from '../config/supabase';
import { FreshnessBagItem, FreshnessScan, BagStatus } from '../types';

export class FreshnessRepository {
  static async findByCustomer(
    customerId: string,
    status?: BagStatus,
    token?: string
  ): Promise<FreshnessBagItem[]> {
    const client = getAuthenticatedClient(token);
    let query = client
      .from('freshness_bags')
      .select('*, latest_scan:freshness_scans!fk_bag_latest_scan(*)')
      .eq('customer_id', customerId);

    if (status) {
      query = query.eq('current_status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findById(id: string, customerId: string, token?: string): Promise<FreshnessBagItem | null> {
    const client = getAuthenticatedClient(token);
    const { data: bag, error: bagErr } = await client
      .from('freshness_bags')
      .select('*, latest_scan:freshness_scans!fk_bag_latest_scan(*)')
      .eq('id', id)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (bagErr) throw bagErr;
    if (!bag) return null;

    // Fetch full scan history for this bag
    const { data: scans } = await client
      .from('freshness_scans')
      .select('*')
      .eq('bag_id', id)
      .order('scan_date', { ascending: false });

    return {
      ...bag,
      scan_history: scans || [],
    };
  }

  static async createBagWithInitialScan(
    bagData: {
      customerId: string;
      produceName: string;
      cropType: string;
      storageRecommendation?: string;
      imageUrl: string;
      freshnessScore: number;
      remainingShelfLifeDays: number;
      predictedUseByDate: string;
      predictionIntervalLowerDays: number;
      predictionIntervalUpperDays: number;
      modelName?: string;
      modelVersion?: string;
      metadata?: Record<string, any>;
    },
    token?: string
  ): Promise<FreshnessBagItem> {
    const client = getAuthenticatedClient(token);

    // 1. Create Bag
    const { data: bag, error: bagErr } = await client
      .from('freshness_bags')
      .insert({
        customer_id: bagData.customerId,
        produce_name: bagData.produceName,
        crop_type: bagData.cropType,
        current_status: 'ACTIVE',
        storage_recommendation: bagData.storageRecommendation,
      })
      .select()
      .single();

    if (bagErr) throw bagErr;

    // 2. Create Initial Scan
    const { data: scan, error: scanErr } = await client
      .from('freshness_scans')
      .insert({
        bag_id: bag.id,
        customer_id: bagData.customerId,
        image_url: bagData.imageUrl,
        freshness_score: bagData.freshnessScore,
        remaining_shelf_life_days: bagData.remainingShelfLifeDays,
        predicted_use_by_date: bagData.predictedUseByDate,
        prediction_interval_lower_days: bagData.predictionIntervalLowerDays,
        prediction_interval_upper_days: bagData.predictionIntervalUpperDays,
        model_name: bagData.modelName || 'agritrace-multimodal-shelf-v1',
        model_version: bagData.modelVersion || '1.0.0',
        prediction_timestamp: new Date().toISOString(),
        metadata: bagData.metadata || {},
      })
      .select()
      .single();

    if (scanErr) throw scanErr;

    // 3. Link latest_scan_id
    await client
      .from('freshness_bags')
      .update({ latest_scan_id: scan.id, updated_at: new Date().toISOString() })
      .eq('id', bag.id);

    return {
      ...bag,
      latest_scan: scan,
      scan_history: [scan],
    };
  }

  static async recordReScan(
    bagId: string,
    customerId: string,
    scanData: {
      imageUrl: string;
      freshnessScore: number;
      remainingShelfLifeDays: number;
      predictedUseByDate: string;
      predictionIntervalLowerDays: number;
      predictionIntervalUpperDays: number;
      modelName?: string;
      modelVersion?: string;
      storageRecommendation?: string;
      metadata?: Record<string, any>;
    },
    token?: string
  ): Promise<FreshnessScan> {
    const client = getAuthenticatedClient(token);

    // Call atomic RPC or direct insert
    const { data: scan, error: scanErr } = await client
      .from('freshness_scans')
      .insert({
        bag_id: bagId,
        customer_id: customerId,
        image_url: scanData.imageUrl,
        freshness_score: scanData.freshnessScore,
        remaining_shelf_life_days: scanData.remainingShelfLifeDays,
        predicted_use_by_date: scanData.predictedUseByDate,
        prediction_interval_lower_days: scanData.predictionIntervalLowerDays,
        prediction_interval_upper_days: scanData.predictionIntervalUpperDays,
        model_name: scanData.modelName || 'agritrace-multimodal-shelf-v1',
        model_version: scanData.modelVersion || '1.0.0',
        prediction_timestamp: new Date().toISOString(),
        metadata: scanData.metadata || {},
      })
      .select()
      .single();

    if (scanErr) throw scanErr;

    // Update bag latest scan reference
    await client
      .from('freshness_bags')
      .update({
        latest_scan_id: scan.id,
        storage_recommendation: scanData.storageRecommendation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bagId)
      .eq('customer_id', customerId);

    return scan;
  }

  static async updateStatus(
    id: string,
    customerId: string,
    status: BagStatus,
    token?: string
  ): Promise<FreshnessBagItem> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('freshness_bags')
      .update({ current_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('customer_id', customerId)
      .select('*, latest_scan:freshness_scans!fk_bag_latest_scan(*)')
      .single();

    if (error) throw error;
    return data;
  }
}
