import { getAuthenticatedClient, supabaseAdmin } from '../config/supabase';
import { Cart, CartItem, Order, OrderItem, OrderStatus } from '../types';

export class CartRepository {
  static async getOrCreateCart(customerId: string, token?: string): Promise<Cart> {
    const client = getAuthenticatedClient(token);

    // 1. Get or create cart record
    let { data: cart, error: cartErr } = await client
      .from('carts')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error: createErr } = await client
        .from('carts')
        .insert({ customer_id: customerId })
        .select()
        .single();
      if (createErr) throw createErr;
      cart = newCart;
    }

    // 2. Fetch cart items with product info
    const { data: items, error: itemsErr } = await client
      .from('cart_items')
      .select('*, product:products(*, vendor:users(id, full_name))')
      .eq('cart_id', cart.id)
      .order('created_at', { ascending: true });

    if (itemsErr) throw itemsErr;

    const cartItems: CartItem[] = items || [];
    const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.unit_price_snapshot, 0);

    return {
      id: cart.id,
      customer_id: customerId,
      items: cartItems,
      subtotal,
    };
  }

  static async addItem(
    customerId: string,
    productId: string,
    quantity: number,
    token?: string
  ): Promise<Cart> {
    const client = getAuthenticatedClient(token);
    const cart = await this.getOrCreateCart(customerId, token);

    // Fetch product to get latest price snapshot
    const { data: product, error: prodErr } = await client
      .from('products')
      .select('price_per_unit')
      .eq('id', productId)
      .single();
    if (prodErr || !product) throw new Error('Product not found');

    // Check if item already in cart
    const { data: existing } = await client
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      await client
        .from('cart_items')
        .update({
          quantity: existing.quantity + quantity,
          unit_price_snapshot: product.price_per_unit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await client.from('cart_items').insert({
        cart_id: cart.id,
        product_id: productId,
        quantity,
        unit_price_snapshot: product.price_per_unit,
      });
    }

    return this.getOrCreateCart(customerId, token);
  }

  static async updateItemQuantity(
    customerId: string,
    itemId: string,
    quantity: number,
    token?: string
  ): Promise<Cart> {
    const client = getAuthenticatedClient(token);
    if (quantity <= 0) {
      await client.from('cart_items').delete().eq('id', itemId);
    } else {
      await client
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', itemId);
    }
    return this.getOrCreateCart(customerId, token);
  }

  static async removeItem(customerId: string, itemId: string, token?: string): Promise<Cart> {
    const client = getAuthenticatedClient(token);
    await client.from('cart_items').delete().eq('id', itemId);
    return this.getOrCreateCart(customerId, token);
  }

  static async clearCart(customerId: string, token?: string): Promise<void> {
    const client = getAuthenticatedClient(token);
    const cart = await this.getOrCreateCart(customerId, token);
    await client.from('cart_items').delete().eq('cart_id', cart.id);
  }
}

export class OrderRepository {
  static async findByCustomer(customerId: string, token?: string): Promise<Order[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('orders')
      .select('*, vendor:users!orders_vendor_id_fkey(full_name, phone), items:order_items(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findByVendor(vendorId: string, token?: string): Promise<Order[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('orders')
      .select('*, customer:users!orders_customer_id_fkey(full_name, phone), items:order_items(*)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findById(id: string, token?: string): Promise<Order | null> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('orders')
      .select('*, customer:users!orders_customer_id_fkey(full_name, phone, address), vendor:users!orders_vendor_id_fkey(full_name, phone), items:order_items(*, batch:produce_batches(batch_code, crop_type, variety))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async updateStatus(
    id: string,
    status: OrderStatus,
    vendorId?: string,
    token?: string
  ): Promise<Order> {
    const client = getAuthenticatedClient(token);
    let query = client
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }
}

export class FavoriteRepository {
  static async findByCustomer(customerId: string, token?: string): Promise<any[]> {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from('favorites')
      .select('*, product:products(*, vendor:users(full_name))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async toggle(customerId: string, productId: string, token?: string): Promise<{ isFavorite: boolean }> {
    const client = getAuthenticatedClient(token);
    const { data: existing } = await client
      .from('favorites')
      .select('id')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      await client.from('favorites').delete().eq('id', existing.id);
      return { isFavorite: false };
    } else {
      await client.from('favorites').insert({ customer_id: customerId, product_id: productId });
      return { isFavorite: true };
    }
  }
}
