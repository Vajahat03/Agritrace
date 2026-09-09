import { getAuthenticatedClient, supabaseAdmin } from '../config/supabase';
import { VendorRepository, ProductRepository } from '../repositories/vendorProductRepository';
import { TraceabilityRepository, BatchRepository } from '../repositories/batchTraceRepository';
import { VendorInventory, VendorProcurement, Product, ListingStatus } from '../types';

export class VendorProcurementService {
  static async getInventory(vendorId: string, token?: string): Promise<VendorInventory[]> {
    return VendorRepository.getInventory(vendorId, token);
  }

  static async adjustStock(
    inventoryId: string,
    vendorId: string,
    type: string,
    quantityChange: number,
    reason: string,
    token?: string
  ): Promise<VendorInventory> {
    return VendorRepository.adjustInventory(inventoryId, vendorId, type, quantityChange, reason, token);
  }

  static async getProcurements(vendorId: string, token?: string): Promise<VendorProcurement[]> {
    return VendorRepository.getProcurementList(vendorId, token);
  }

  // Atomic Vendor Procurement
  static async procureBatch(
    vendorId: string,
    data: {
      batchId: string;
      quantity: number;
      purchasePrice: number;
      purchaseDate: string;
      transportDetails?: string;
      location?: string;
      notes?: string;
    },
    token?: string
  ): Promise<any> {
    const client = getAuthenticatedClient(token);
    const location = data.location || 'Vendor Distribution Hub';

    // 1. Try RPC function
    const { data: rpcResult, error: rpcError } = await client.rpc('fn_vendor_procure_batch', {
      p_vendor_id: vendorId,
      p_batch_id: data.batchId,
      p_quantity: data.quantity,
      p_purchase_price: data.purchasePrice,
      p_purchase_date: data.purchaseDate,
      p_transport_details: data.transportDetails || '',
      p_location: location,
      p_notes: data.notes || '',
    });

    if (!rpcError && rpcResult) {
      return rpcResult;
    }

    // 2. Fallback direct multi-entity execution
    const batch = await BatchRepository.findById(data.batchId, token);
    if (!batch) throw new Error('Batch not found');
    if (batch.current_quantity < data.quantity) {
      throw new Error(`Insufficient batch stock. Available: ${batch.current_quantity} ${batch.unit}`);
    }

    // Record Procurement
    const { data: procurement, error: procErr } = await client
      .from('vendor_procurement')
      .insert({
        vendor_id: vendorId,
        batch_id: data.batchId,
        farmer_id: batch.farmer_id,
        quantity: data.quantity,
        unit: batch.unit,
        purchase_price: data.purchasePrice,
        purchase_date: data.purchaseDate,
        quality_grade: batch.quality_grade,
        transport_details: data.transportDetails,
        notes: data.notes,
      })
      .select()
      .single();

    if (procErr) throw procErr;

    // Deduct quantity from batch and update owner
    const newBatchQuantity = batch.current_quantity - data.quantity;
    await client
      .from('produce_batches')
      .update({
        current_quantity: newBatchQuantity,
        current_owner_id: vendorId,
        current_status: newBatchQuantity === 0 ? 'SOLD' : 'RECEIVED',
        current_location: location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.batchId);

    // Create / Update Vendor Inventory
    const { data: inventory, error: invErr } = await client
      .from('vendor_inventory')
      .insert({
        vendor_id: vendorId,
        batch_id: data.batchId,
        product_name: `${batch.crop_type} (${batch.variety})`,
        crop_type: batch.crop_type,
        quantity: data.quantity,
        unit: batch.unit,
        location,
        status: 'IN_STOCK',
        notes: data.notes,
      })
      .select()
      .single();

    if (invErr) throw invErr;

    // Append Traceability Event
    await TraceabilityRepository.appendEvent(
      {
        batch_id: data.batchId,
        event_type: 'RECEIVED',
        actor_id: vendorId,
        actor_role: 'VENDOR',
        location,
        notes: `Procured ${data.quantity} ${batch.unit} for distribution.`,
        metadata: {
          purchase_price: data.purchasePrice,
          transport_details: data.transportDetails,
        },
      },
      token
    );

    return { procurement, inventory };
  }

  // Product Catalog Management
  static async getVendorProducts(vendorId: string, token?: string): Promise<Product[]> {
    return ProductRepository.findByVendor(vendorId, token);
  }

  static async createProduct(
    vendorId: string,
    data: Partial<Product>,
    listingStatus: ListingStatus = 'ACTIVE',
    minOrderQuantity: number = 1,
    token?: string
  ): Promise<Product> {
    return ProductRepository.create({ ...data, vendor_id: vendorId }, listingStatus, minOrderQuantity, token);
  }

  static async updateProduct(
    productId: string,
    vendorId: string,
    data: Partial<Product>,
    listingStatus?: ListingStatus,
    token?: string
  ): Promise<Product> {
    return ProductRepository.update(productId, vendorId, data, listingStatus, token);
  }
}
