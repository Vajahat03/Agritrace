import { supabaseAdmin } from '../config/supabase';

export interface PublicFarmerSummary {
  id: string;
  full_name: string;
  phone?: string;
  address?: string;
  farm_count: number;
  farms: Array<{
    id: string;
    name: string;
    location_name: string;
    total_area: number;
    area_unit: string;
  }>;
  crops: Array<{
    id: string;
    crop_type: string;
    variety: string;
    status: string;
    area: number;
    area_unit: string;
    planting_date: string;
  }>;
}

export class FarmerDirectoryRepository {
  static async listPublicFarmers(): Promise<PublicFarmerSummary[]> {
    const { data: farmers, error: farmerError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone, address')
      .eq('role', 'FARMER')
      .not('full_name', 'is', null)
      .not('address', 'is', null)
      .order('full_name', { ascending: true });

    if (farmerError) throw farmerError;
    if (!farmers?.length) return [];

    const farmerIds = farmers.map((f) => f.id);

    const [{ data: farms, error: farmError }, { data: crops, error: cropError }] = await Promise.all([
      supabaseAdmin
        .from('farms')
        .select('id, farmer_id, name, location_name, total_area, area_unit')
        .in('farmer_id', farmerIds),
      supabaseAdmin
        .from('crops')
        .select('id, farmer_id, crop_type, variety, status, area, area_unit, planting_date')
        .in('farmer_id', farmerIds)
        .in('status', ['GROWING', 'READY_FOR_HARVEST', 'PLANNING']),
    ]);

    if (farmError) throw farmError;
    if (cropError) throw cropError;

    const farmMap = new Map<string, any[]>();
    for (const farm of farms || []) {
      const list = farmMap.get(farm.farmer_id) || [];
      list.push(farm);
      farmMap.set(farm.farmer_id, list);
    }

    const cropMap = new Map<string, any[]>();
    for (const crop of crops || []) {
      const list = cropMap.get(crop.farmer_id) || [];
      list.push(crop);
      cropMap.set(crop.farmer_id, list);
    }

    return farmers.map((farmer) => {
      const userFarms = farmMap.get(farmer.id) || [];
      const userCrops = cropMap.get(farmer.id) || [];
      return {
        ...farmer,
        farm_count: userFarms.length,
        farms: userFarms,
        crops: userCrops,
      };
    });
  }

  static async getPublicFarmer(farmerId: string): Promise<PublicFarmerSummary | null> {
    const { data: farmer, error: farmerError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone, address')
      .eq('id', farmerId)
      .eq('role', 'FARMER')
      .not('full_name', 'is', null)
      .not('address', 'is', null)
      .maybeSingle();

    if (farmerError) throw farmerError;
    if (!farmer) return null;

    const [{ data: farms, error: farmError }, { data: crops, error: cropError }] = await Promise.all([
      supabaseAdmin
        .from('farms')
        .select('id, farmer_id, name, location_name, total_area, area_unit')
        .eq('farmer_id', farmerId),
      supabaseAdmin
        .from('crops')
        .select('id, farmer_id, crop_type, variety, status, area, area_unit, planting_date')
        .eq('farmer_id', farmerId),
    ]);

    if (farmError) throw farmError;
    if (cropError) throw cropError;

    return {
      ...farmer,
      farm_count: farms?.length || 0,
      farms: farms || [],
      crops: crops || [],
    };
  }
}
