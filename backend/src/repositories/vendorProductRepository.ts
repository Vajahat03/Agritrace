import { getAuthenticatedClient, supabaseAdmin } from '../config/supabase';
import {
  VendorInventory,
  VendorProcurement,
  Product,
  MarketplaceListing,
  ListingStatus,
} from '../types';

export class VendorRepository {
  static async getInventory(vendorId: string, token?: string): Promise<VendorInventory[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('vendor_inventory')
      .select('*, batch:produce_batches(batch_code, quality_grade, harvest_date)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getInventoryItem(id: string, vendorId: string, token?: string): Promise<VendorInventory | null> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('vendor_inventory')
      .select('*, batch:produce_batches(*)')
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async adjustInventory(
    inventoryId: string,
    vendorId: string,
    adjustmentType: string,
    quantityChange: number,
    reason: string,
    token?: string
  ): Promise<VendorInventory> {
    const client = getAuthenticatedClient(token);

    // 1. Fetch current inventory
    const { data: item, error: fetchErr } = await client
      .from('vendor_inventory')
      .select('*')
      .eq('id', inventoryId)
      .eq('vendor_id', vendorId)
      .single();
    if (fetchErr || !item) throw new Error('Inventory item not found');

    const newQuantity = item.quantity + quantityChange;
    if (newQuantity < 0) {
      throw new Error('Adjustment cannot result in negative inventory');
    }

    // 2. Record adjustment log
    await client.from('inventory_adjustments').insert({
      inventory_id: inventoryId,
      vendor_id: vendorId,
      adjustment_type: adjustmentType,
      quantity_change: quantityChange,
      reason,
    });

    // 3. Update inventory item
    const status = newQuantity === 0 ? 'EXHAUSTED' : newQuantity < 10 ? 'LOW_STOCK' : 'IN_STOCK';
    const { data: updated, error: updateErr } = await client
      .from('vendor_inventory')
      .update({
        quantity: newQuantity,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventoryId)
      .select()
      .single();
    if (updateErr) throw updateErr;
    return updated;
  }

  static async getProcurementList(vendorId: string, token?: string): Promise<VendorProcurement[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('vendor_procurement')
      .select('*, batch:produce_batches(batch_code, crop_type, variety), farmer:users!vendor_procurement_farmer_id_fkey(full_name, phone)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
}

export class ProductRepository {
  static async findAllActive(params?: {
    category?: string;
    search?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    let query = supabaseAdmin
      .from('products')
      .select('*, vendor:users!products_vendor_id_fkey(id, full_name, phone), listing:marketplace_listings!marketplace_listings_product_id_fkey(*)', {
        count: 'exact',
      })
      .eq('listing.listing_status', 'ACTIVE');

    if (params?.category) {
      query = query.ilike('crop_type', `%${params.category}%`);
    }
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }
    if (params?.location) {
      query = query.ilike('location', `%${params.location}%`);
    }
    if (params?.minPrice !== undefined) {
      query = query.gte('price_per_unit', params.minPrice);
    }
    if (params?.maxPrice !== undefined) {
      query = query.lte('price_per_unit', params.maxPrice);
    }

    const limit = params?.limit || 20;
    const offset = params?.offset || 0;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { products: data || [], total: count || 0 };
  }

  static async findById(id: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, vendor:users!products_vendor_id_fkey(id, full_name, phone, address), listing:marketplace_listings(*), batch:produce_batches(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findByVendor(vendorId: string, token?: string): Promise<Product[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('products')
      .select('*, listing:marketplace_listings(*), batch:produce_batches(batch_code)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async create(
    product: Partial<Product>,
    listingStatus: ListingStatus = 'ACTIVE',
    minOrderQuantity: number = 1,
    token?: string
  ): Promise<Product> {
    const client = getAuthenticatedClient(token);
    const { data: newProd, error: prodErr } = await client
      .from('products')
      .insert(product)
      .select()
      .single();
    if (prodErr) throw prodErr;

    // Create default listing
    await client.from('marketplace_listings').insert({
      product_id: newProd.id,
      vendor_id: newProd.vendor_id,
      listing_status: listingStatus,
      min_order_quantity: minOrderQuantity,
    });

    return newProd;
  }

  static async update(
    id: string,
    vendorId: string,
    updates: Partial<Product>,
    listingStatus?: ListingStatus,
    token?: string
  ): Promise<Product> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .select()
      .single();
    if (error) throw error;

    if (listingStatus) {
      await client
        .from('marketplace_listings')
        .update({ listing_status: listingStatus, updated_at: new Date().toISOString() })
        .eq('product_id', id)
        .eq('vendor_id', vendorId);
    }

    return data;
  }
}
