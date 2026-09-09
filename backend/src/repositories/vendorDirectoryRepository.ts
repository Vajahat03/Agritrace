import { supabaseAdmin } from '../config/supabase';

export interface PublicVendorSummary {
  id: string;
  full_name: string;
  phone?: string;
  address?: string;
  inventory_count: number;
}

export interface PublicVendorDetails extends PublicVendorSummary {
  inventory: Array<{
    id: string;
    product_name: string;
    crop_type: string;
    quantity: number;
    unit: string;
    location?: string;
    status: string;
    updated_at: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    crop_type: string;
    variety?: string;
    price_per_unit: number;
    unit: string;
    available_quantity: number;
    quality_grade: string;
    location: string;
  }>;
}

export class VendorDirectoryRepository {
  static async listPublicVendors(): Promise<PublicVendorSummary[]> {
    const { data: vendors, error: vendorError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone, address')
      .eq('role', 'VENDOR')
      .not('full_name', 'is', null)
      .not('address', 'is', null)
      .order('full_name', { ascending: true });

    if (vendorError) throw vendorError;
    if (!vendors?.length) return [];

    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('vendor_inventory')
      .select('vendor_id')
      .in('vendor_id', vendors.map((vendor) => vendor.id));

    if (inventoryError) throw inventoryError;
    const counts = new Map<string, number>();
    for (const item of inventory || []) counts.set(item.vendor_id, (counts.get(item.vendor_id) || 0) + 1);

    return vendors.map((vendor) => ({
      ...vendor,
      inventory_count: counts.get(vendor.id) || 0,
    }));
  }

  static async getPublicVendor(vendorId: string): Promise<PublicVendorDetails | null> {
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone, address')
      .eq('id', vendorId)
      .eq('role', 'VENDOR')
      .not('full_name', 'is', null)
      .not('address', 'is', null)
      .maybeSingle();

    if (vendorError) throw vendorError;
    if (!vendor) return null;

    const [{ data: inventory, error: inventoryError }, { data: products, error: productsError }] = await Promise.all([
      supabaseAdmin
        .from('vendor_inventory')
        .select('id, product_name, crop_type, quantity, unit, location, status, updated_at')
        .eq('vendor_id', vendorId)
        .order('updated_at', { ascending: false }),
      supabaseAdmin
        .from('products')
        .select('id, name, crop_type, variety, price_per_unit, unit, available_quantity, quality_grade, location, listing:marketplace_listings!marketplace_listings_product_id_fkey(listing_status)')
        .eq('vendor_id', vendorId)
        .gt('available_quantity', 0)
        .eq('listing.listing_status', 'ACTIVE')
        .order('updated_at', { ascending: false }),
    ]);

    if (inventoryError) throw inventoryError;
    if (productsError) throw productsError;

    return {
      ...vendor,
      inventory_count: inventory?.length || 0,
      inventory: inventory || [],
      products: products || [],
    };
  }
}
