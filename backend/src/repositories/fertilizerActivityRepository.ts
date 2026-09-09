import { getAuthenticatedClient } from '../config/supabase';
import {
  FertilizerApplication,
  IrrigationRecord,
  CropInput,
  CropObservation,
  Harvest,
} from '../types';

export class FertilizerRepository {
  static async findByCrop(cropId: string, farmerId: string, token?: string): Promise<FertilizerApplication[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('fertilizer_applications')
      .select('*')
      .eq('crop_id', cropId)
      .eq('farmer_id', farmerId)
      .order('application_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findById(id: string, farmerId: string, token?: string): Promise<FertilizerApplication | null> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('fertilizer_applications')
      .select('*')
      .eq('id', id)
      .eq('farmer_id', farmerId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Create new historical application (Never overwrites existing records)
  static async create(application: Partial<FertilizerApplication>, token?: string): Promise<FertilizerApplication> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('fertilizer_applications')
      .insert(application)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Update only this specific selected historical record
  static async update(
    id: string,
    farmerId: string,
    updates: Partial<FertilizerApplication>,
    token?: string
  ): Promise<FertilizerApplication> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('fertilizer_applications')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('farmer_id', farmerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async delete(id: string, farmerId: string, token?: string): Promise<void> {
    const client = getAuthenticatedClient(token);
    const { error } = await client
      .from('fertilizer_applications')
      .delete()
      .eq('id', id)
      .eq('farmer_id', farmerId);
    if (error) throw error;
  }
}

export class IrrigationRepository {
  static async findByCrop(cropId: string, farmerId: string, token?: string): Promise<IrrigationRecord[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('irrigation_records')
      .select('*')
      .eq('crop_id', cropId)
      .eq('farmer_id', farmerId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async create(record: Partial<IrrigationRecord>, token?: string): Promise<IrrigationRecord> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('irrigation_records').insert(record).select().single();
    if (error) throw error;
    return data;
  }

  static async delete(id: string, farmerId: string, token?: string): Promise<void> {
    const client = getAuthenticatedClient(token);
    const { error } = await client.from('irrigation_records').delete().eq('id', id).eq('farmer_id', farmerId);
    if (error) throw error;
  }
}

export class CropInputRepository {
  static async findByCrop(cropId: string, farmerId: string, token?: string): Promise<CropInput[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('crop_inputs')
      .select('*')
      .eq('crop_id', cropId)
      .eq('farmer_id', farmerId)
      .order('application_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async create(record: Partial<CropInput>, token?: string): Promise<CropInput> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('crop_inputs').insert(record).select().single();
    if (error) throw error;
    return data;
  }
}

export class CropObservationRepository {
  static async findByCrop(cropId: string, farmerId: string, token?: string): Promise<CropObservation[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('crop_observations')
      .select('*')
      .eq('crop_id', cropId)
      .eq('farmer_id', farmerId)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async create(record: Partial<CropObservation>, token?: string): Promise<CropObservation> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('crop_observations').insert(record).select().single();
    if (error) throw error;
    return data;
  }
}

export class HarvestRepository {
  static async findByCrop(cropId: string, farmerId: string, token?: string): Promise<Harvest[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('harvests')
      .select('*')
      .eq('crop_id', cropId)
      .eq('farmer_id', farmerId)
      .order('harvest_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }
}
