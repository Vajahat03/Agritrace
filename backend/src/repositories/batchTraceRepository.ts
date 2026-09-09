import { getAuthenticatedClient, supabaseAdmin } from '../config/supabase';
import { ProduceBatch, BatchStatus, TraceabilityEvent } from '../types';

export class BatchRepository {
  static async findByFarmer(farmerId: string, token?: string): Promise<ProduceBatch[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('produce_batches')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findById(id: string, token?: string): Promise<ProduceBatch | null> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('produce_batches')
      .select('*, farmer:users!produce_batches_farmer_id_fkey(full_name, phone, address), farm:farms(name, location_name, latitude, longitude)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findByCode(batchCode: string, token?: string): Promise<ProduceBatch | null> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('produce_batches')
      .select('*, farmer:users!produce_batches_farmer_id_fkey(full_name, phone, address), farm:farms(name, location_name, latitude, longitude), plot:plots(name, area, soil_type)')
      .eq('batch_code', batchCode)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async updateStatus(
    id: string,
    status: BatchStatus,
    currentLocation?: string,
    token?: string
  ): Promise<ProduceBatch> {
    const client = getAuthenticatedClient(token);
    const updates: any = {
      current_status: status,
      updated_at: new Date().toISOString(),
    };
    if (currentLocation) {
      updates.current_location = currentLocation;
    }

    const { data, error } = await client
      .from('produce_batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export class TraceabilityRepository {
  static async findByBatch(batchId: string, token?: string): Promise<TraceabilityEvent[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('traceability_events')
      .select('*, actor:users!traceability_events_actor_id_fkey(full_name, role)')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // Immutable append-only event insertion
  static async appendEvent(event: Partial<TraceabilityEvent>, token?: string): Promise<TraceabilityEvent> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('traceability_events')
      .insert({
        ...event,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
