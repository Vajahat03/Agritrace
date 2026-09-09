import { getAuthenticatedClient, supabaseAdmin } from '../config/supabase';
import { Farm, Plot, Crop, CropStatus } from '../types';

export class FarmRepository {
  static async findByFarmer(farmerId: string, token?: string): Promise<Farm[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('farms')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findById(id: string, farmerId?: string, token?: string): Promise<Farm | null> {
    const client = getAuthenticatedClient(token);
    let query = client.from('farms').select('*').eq('id', id);
    if (farmerId) {
      query = query.eq('farmer_id', farmerId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  static async create(farm: Partial<Farm>, token?: string): Promise<Farm> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('farms').insert(farm).select().single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, farmerId: string, updates: Partial<Farm>, token?: string): Promise<Farm> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('farms')
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
    const { error } = await client.from('farms').delete().eq('id', id).eq('farmer_id', farmerId);
    if (error) throw error;
  }
}

export class PlotRepository {
  static async findByFarm(farmId: string, token?: string): Promise<Plot[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('plots').select('*').eq('farm_id', farmId).order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  static async findById(id: string, token?: string): Promise<Plot | null> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('plots').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  static async create(plot: Partial<Plot>, token?: string): Promise<Plot> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('plots').insert(plot).select().single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, updates: Partial<Plot>, token?: string): Promise<Plot> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('plots')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async delete(id: string, token?: string): Promise<void> {
    const client = getAuthenticatedClient(token);
    const { error } = await client.from('plots').delete().eq('id', id);
    if (error) throw error;
  }
}

export class CropRepository {
  static async findByFarmer(farmerId: string, status?: CropStatus, token?: string): Promise<Crop[]> {
    const client = getAuthenticatedClient(token);
    let query = client
      .from('crops')
      .select('*, farm:farms(id, name, location_name), plot:plots(id, name, area, soil_type)')
      .eq('farmer_id', farmerId);

    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findById(id: string, farmerId?: string, token?: string): Promise<Crop | null> {
    const client = getAuthenticatedClient(token);
    let query = client
      .from('crops')
      .select('*, farm:farms(id, name, location_name, latitude, longitude), plot:plots(id, name, area, soil_type, irrigation_source)')
      .eq('id', id);

    if (farmerId) {
      query = query.eq('farmer_id', farmerId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  static async create(crop: Partial<Crop>, token?: string): Promise<Crop> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.from('crops').insert(crop).select().single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, farmerId: string, updates: Partial<Crop>, token?: string): Promise<Crop> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('crops')
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
    const { error } = await client.from('crops').delete().eq('id', id).eq('farmer_id', farmerId);
    if (error) throw error;
  }
}
