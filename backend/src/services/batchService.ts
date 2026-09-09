import { getAuthenticatedClient, supabaseAdmin } from '../config/supabase';
import { BatchRepository, TraceabilityRepository } from '../repositories/batchTraceRepository';
import { ProduceBatch, BatchStatus, UserRole } from '../types';

export class BatchService {
  static async getFarmerBatches(farmerId: string, token?: string): Promise<ProduceBatch[]> {
    return BatchRepository.findByFarmer(farmerId, token);
  }

  static async getBatchDetails(batchId: string, token?: string): Promise<ProduceBatch | null> {
    return BatchRepository.findById(batchId, token);
  }

  static async getBatchByCode(batchCode: string, token?: string): Promise<ProduceBatch | null> {
    return BatchRepository.findByCode(batchCode, token);
  }

  // Create Harvest + Produce Batch + Initial Traceability Event Transactionally
  static async createHarvestAndBatch(
    farmerId: string,
    data: {
      cropId: string;
      harvestDate: string;
      quantity: number;
      unit: string;
      qualityGrade?: string;
      notes?: string;
      location?: string;
    },
    token?: string
  ): Promise<any> {
    const client = getAuthenticatedClient(token);

    // Generate readable batch code, e.g. BATCH-2026-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const batchCode = `BAT-${new Date().getFullYear()}-${randomSuffix}`;
    const location = data.location || 'Origin Farm Field';

    // 1. Try calling the PostgreSQL RPC function
    const { data: rpcResult, error: rpcError } = await client.rpc('fn_create_harvest_and_batch', {
      p_crop_id: data.cropId,
      p_farmer_id: farmerId,
      p_harvest_date: data.harvestDate,
      p_quantity: data.quantity,
      p_unit: data.unit || 'kg',
      p_quality_grade: data.qualityGrade || 'Grade A',
      p_notes: data.notes || '',
      p_batch_code: batchCode,
      p_location: location,
    });

    if (!rpcError && rpcResult) {
      return rpcResult;
    }

    // 2. Fallback direct multi-entity creation if RPC is not yet registered
    const { data: crop, error: cropErr } = await client
      .from('crops')
      .select('*, farm:farms(name, location_name)')
      .eq('id', data.cropId)
      .eq('farmer_id', farmerId)
      .single();

    if (cropErr || !crop) throw new Error('Crop not found or unauthorized');

    // Create Harvest
    const { data: harvest, error: harvestErr } = await client
      .from('harvests')
      .insert({
        crop_id: data.cropId,
        farmer_id: farmerId,
        harvest_date: data.harvestDate,
        quantity: data.quantity,
        unit: data.unit || 'kg',
        quality_grade: data.qualityGrade || 'Grade A',
        notes: data.notes,
      })
      .select()
      .single();

    if (harvestErr) throw harvestErr;

    // Create Batch
    const { data: batch, error: batchErr } = await client
      .from('produce_batches')
      .insert({
        batch_code: batchCode,
        farmer_id: farmerId,
        farm_id: crop.farm_id,
        plot_id: crop.plot_id,
        crop_id: data.cropId,
        harvest_id: harvest.id,
        crop_type: crop.crop_type,
        variety: crop.variety,
        harvest_date: data.harvestDate,
        initial_quantity: data.quantity,
        current_quantity: data.quantity,
        unit: data.unit || 'kg',
        quality_grade: data.qualityGrade || 'Grade A',
        current_status: 'HARVESTED',
        current_owner_id: farmerId,
        current_location: crop.farm?.location_name || location,
      })
      .select()
      .single();

    if (batchErr) throw batchErr;

    // Append Initial Traceability Event
    await TraceabilityRepository.appendEvent(
      {
        batch_id: batch.id,
        event_type: 'HARVESTED',
        actor_id: farmerId,
        actor_role: 'FARMER',
        location: crop.farm?.location_name || location,
        notes: `Harvest completed for ${crop.crop_type} (${crop.variety})`,
        metadata: {
          harvest_id: harvest.id,
          quantity: data.quantity,
          unit: data.unit || 'kg',
        },
      },
      token
    );

    return batch;
  }

  // Update Status & Append Immutable Traceability Event
  static async updateStatus(
    batchId: string,
    status: BatchStatus,
    actorId: string,
    actorRole: UserRole,
    location: string,
    notes?: string,
    token?: string
  ): Promise<ProduceBatch> {
    const updatedBatch = await BatchRepository.updateStatus(batchId, status, location, token);

    // Append event to immutable ledger
    await TraceabilityRepository.appendEvent(
      {
        batch_id: batchId,
        event_type: status,
        actor_id: actorId,
        actor_role: actorRole,
        location,
        notes: notes || `Batch status transitioned to ${status}`,
      },
      token
    );

    return updatedBatch;
  }
}
