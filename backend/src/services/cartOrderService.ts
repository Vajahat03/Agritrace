import { getAuthenticatedClient } from '../config/supabase';
import { ProductRepository } from '../repositories/vendorProductRepository';
import { CartRepository, OrderRepository, FavoriteRepository } from '../repositories/cartOrderRepository';
import { TraceabilityRepository } from '../repositories/batchTraceRepository';
import { Product, Cart, Order, OrderStatus } from '../types';

export class MarketplaceService {
  static async searchProducts(params?: {
    category?: string;
    search?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    return ProductRepository.findAllActive(params);
  }

  static async getProductDetails(productId: string): Promise<Product | null> {
    return ProductRepository.findById(productId);
  }
}

export class CartOrderService {
  static async getCart(customerId: string, token?: string): Promise<Cart> {
    return CartRepository.getOrCreateCart(customerId, token);
  }

  static async addToCart(customerId: string, productId: string, quantity: number, token?: string): Promise<Cart> {
    return CartRepository.addItem(customerId, productId, quantity, token);
  }

  static async updateCartItem(customerId: string, itemId: string, quantity: number, token?: string): Promise<Cart> {
    return CartRepository.updateItemQuantity(customerId, itemId, quantity, token);
  }

  static async removeCartItem(customerId: string, itemId: string, token?: string): Promise<Cart> {
    return CartRepository.removeItem(customerId, itemId, token);
  }

  // Atomic Checkout Pipeline
  static async checkout(
    customerId: string,
    data: {
      deliveryAddress: string;
      contactPhone?: string;
      notes?: string;
      deliveryFee?: number;
    },
    token?: string
  ): Promise<Order> {
    const client = getAuthenticatedClient(token);
    const cart = await CartRepository.getOrCreateCart(customerId, token);

    if (!cart.items || cart.items.length === 0) {
      throw new Error('Your cart is empty. Add products before checking out.');
    }

    // Determine vendor for order from first item
    const firstProduct = await ProductRepository.findById(cart.items[0].product_id);
    const vendorId = firstProduct?.vendor_id;
    if (!vendorId) throw new Error('Vendor could not be determined for cart items');

    const orderCode = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const deliveryFee = data.deliveryFee || 50;

    // 1. Try RPC function
    const { data: rpcResult, error: rpcError } = await client.rpc('fn_process_checkout', {
      p_customer_id: customerId,
      p_order_code: orderCode,
      p_vendor_id: vendorId,
      p_delivery_address: data.deliveryAddress,
      p_contact_phone: data.contactPhone || '',
      p_notes: data.notes || '',
      p_delivery_fee: deliveryFee,
    });

    if (!rpcError && rpcResult) {
      const order = await OrderRepository.findById(rpcResult.order_id, token);
      if (order) return order;
    }

    // 2. Fallback direct execution
    let subtotal = 0;
    for (const item of cart.items) {
      const prod = await ProductRepository.findById(item.product_id);
      if (!prod || prod.available_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product "${item.product?.name || 'Item'}".`);
      }
      subtotal += item.unit_price_snapshot * item.quantity;
    }

    const totalAmount = subtotal + deliveryFee;

    // Create Order
    const { data: newOrder, error: orderErr } = await client
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_id: customerId,
        vendor_id: vendorId,
        status: 'PLACED',
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        delivery_address: data.deliveryAddress,
        contact_phone: data.contactPhone,
        notes: data.notes,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create Order Items and Deduct Stock
    for (const item of cart.items) {
      const prod = await ProductRepository.findById(item.product_id);
      await client.from('order_items').insert({
        order_id: newOrder.id,
        product_id: item.product_id,
        batch_id: prod?.batch_id,
        product_name_snapshot: prod?.name || 'Agricultural Produce',
        unit_price: item.unit_price_snapshot,
        quantity: item.quantity,
        subtotal: item.unit_price_snapshot * item.quantity,
      });

      // Decrement stock
      if (prod) {
        await client
          .from('products')
          .update({
            available_quantity: Math.max(0, prod.available_quantity - item.quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', prod.id);

        if (prod.batch_id) {
          await TraceabilityRepository.appendEvent(
            {
              batch_id: prod.batch_id,
              event_type: 'SOLD',
              actor_id: customerId,
              actor_role: 'CUSTOMER',
              location: data.deliveryAddress,
              notes: `Purchased in Order ${orderCode}`,
            },
            token
          );
        }
      }
    }

    // Clear Cart
    await CartRepository.clearCart(customerId, token);

    const fullOrder = await OrderRepository.findById(newOrder.id, token);
    return fullOrder || newOrder;
  }

  static async getCustomerOrders(customerId: string, token?: string): Promise<Order[]> {
    return OrderRepository.findByCustomer(customerId, token);
  }

  static async getVendorOrders(vendorId: string, token?: string): Promise<Order[]> {
    return OrderRepository.findByVendor(vendorId, token);
  }

  static async getOrderDetails(orderId: string, token?: string): Promise<Order | null> {
    return OrderRepository.findById(orderId, token);
  }

  static async updateStatus(
    orderId: string,
    status: OrderStatus,
    vendorId?: string,
    token?: string
  ): Promise<Order> {
    return OrderRepository.updateStatus(orderId, status, vendorId, token);
  }

  static async getFavorites(customerId: string, token?: string): Promise<any[]> {
    return FavoriteRepository.findByCustomer(customerId, token);
  }

  static async toggleFavorite(customerId: string, productId: string, token?: string): Promise<{ isFavorite: boolean }> {
    return FavoriteRepository.toggle(customerId, productId, token);
  }
}
