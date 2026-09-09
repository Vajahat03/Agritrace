import { Response } from 'express';
import { AuthRequest } from '../types';
import { MarketplaceService, CartOrderService } from '../services/cartOrderService';
import { FreshnessBagService } from '../services/freshnessBagService';
import { NotificationService } from '../services/notifications/notificationService';

export class CustomerController {
  static async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const token = req.token;

      const [bagItems, orders, favorites, notifications] = await Promise.all([
        FreshnessBagService.getCustomerBag(customerId, 'ACTIVE', token),
        CartOrderService.getCustomerOrders(customerId, token),
        CartOrderService.getFavorites(customerId, token),
        NotificationService.getUserNotifications(customerId, true, token),
      ]);

      const itemsNeedingAttention = bagItems.filter((item) => {
        const remaining = item.latest_scan?.remaining_shelf_life_days;
        return remaining !== undefined && remaining <= 2;
      });

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            activeFreshnessItems: bagItems.length,
            itemsExpiringSoon: itemsNeedingAttention.length,
            totalOrders: orders.length,
            savedFavorites: favorites.length,
          },
          freshnessBag: bagItems.slice(0, 4),
          expiringSoon: itemsNeedingAttention,
          recentOrders: orders.slice(0, 3),
          notifications: notifications.slice(0, 5),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'CUSTOMER_DASHBOARD_ERROR', message: error.message } });
    }
  }

  // Marketplace
  static async getMarketplace(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, search, location, minPrice, maxPrice, limit, offset } = req.query;
      const result = await MarketplaceService.searchProducts({
        category: category as string,
        search: search as string,
        location: location as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        limit: limit ? Number(limit) : 20,
        offset: offset ? Number(offset) : 0,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'MARKETPLACE_ERROR', message: error.message } });
    }
  }

  static async getProductDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const product = await MarketplaceService.getProductDetails(productId);
      if (!product) {
        res.status(404).json({ success: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
        return;
      }
      res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PRODUCT_FETCH_ERROR', message: error.message } });
    }
  }

  // Cart
  static async getCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cart = await CartOrderService.getCart(req.user!.id, req.token);
      res.status(200).json({ success: true, data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'CART_FETCH_ERROR', message: error.message } });
    }
  }

  static async addToCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const productId = req.body.productId || req.body.product_id;
      const quantity = req.body.quantity || 1;
      const cart = await CartOrderService.addToCart(req.user!.id, productId, quantity, req.token);
      res.status(200).json({ success: true, data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'ADD_CART_ERROR', message: error.message } });
    }
  }

  static async updateCartItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const itemId = req.params.itemId as string;
      const { quantity } = req.body;
      const cart = await CartOrderService.updateCartItem(req.user!.id, itemId, quantity, req.token);
      res.status(200).json({ success: true, data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'UPDATE_CART_ERROR', message: error.message } });
    }
  }

  static async removeCartItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const itemId = req.params.itemId as string;
      const cart = await CartOrderService.removeCartItem(req.user!.id, itemId, req.token);
      res.status(200).json({ success: true, data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'REMOVE_CART_ERROR', message: error.message } });
    }
  }

  // Checkout & Orders
  static async checkout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const order = await CartOrderService.checkout(
        req.user!.id,
        {
          deliveryAddress: req.body.deliveryAddress || req.body.delivery_address || 'Default Address',
          contactPhone: req.body.contactPhone || req.body.delivery_phone || req.body.contact_phone,
          notes: req.body.notes,
          deliveryFee: req.body.deliveryFee || req.body.delivery_fee,
        },
        req.token
      );
      res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'CHECKOUT_ERROR', message: error.message } });
    }
  }

  static async getOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const orders = await CartOrderService.getCustomerOrders(req.user!.id, req.token);
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'ORDERS_FETCH_ERROR', message: error.message } });
    }
  }

  static async getOrderDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const order = await CartOrderService.getOrderDetails(orderId, req.token);
      if (!order) {
        res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
        return;
      }
      res.status(200).json({ success: true, data: order });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'ORDER_FETCH_ERROR', message: error.message } });
    }
  }

  // Freshness Bag
  static async getFreshnessBag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const status = req.query.status as any;
      const bag = await FreshnessBagService.getCustomerBag(req.user!.id, status, req.token);
      res.status(200).json({ success: true, data: bag });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FRESHNESS_BAG_ERROR', message: error.message } });
    }
  }

  static async getFreshnessItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bagId = req.params.bagId as string;
      const item = await FreshnessBagService.getBagItemDetails(bagId, req.user!.id, req.token);
      if (!item) {
        res.status(404).json({ success: false, error: { code: 'BAG_ITEM_NOT_FOUND', message: 'Item not found' } });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'BAG_ITEM_FETCH_ERROR', message: error.message } });
    }
  }

  static async addToFreshnessBag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const item = await FreshnessBagService.addProduceToBag(
        req.user!.id,
        {
          produceName: req.body.produceName,
          cropType: req.body.cropType,
          imageUrl: req.body.imageUrl,
          freshnessScore: req.body.freshnessScore,
          remainingShelfLifeDays: req.body.remainingShelfLifeDays,
          predictedUseByDate: req.body.predictedUseByDate,
          predictionIntervalLowerDays: req.body.predictionIntervalLowerDays,
          predictionIntervalUpperDays: req.body.predictionIntervalUpperDays,
          storageRecommendation: req.body.storageRecommendation,
          modelName: req.body.modelName,
          modelVersion: req.body.modelVersion,
        },
        req.token
      );
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'BAG_ADD_ERROR', message: error.message } });
    }
  }

  static async rescanProduce(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bagId = req.params.bagId as string;
      const scan = await FreshnessBagService.rescanProduce(
        bagId,
        req.user!.id,
        {
          imageUrl: req.body.imageUrl,
          freshnessScore: req.body.freshnessScore,
          remainingShelfLifeDays: req.body.remainingShelfLifeDays,
          predictedUseByDate: req.body.predictedUseByDate,
          predictionIntervalLowerDays: req.body.predictionIntervalLowerDays,
          predictionIntervalUpperDays: req.body.predictionIntervalUpperDays,
          storageRecommendation: req.body.storageRecommendation,
        },
        req.token
      );
      res.status(201).json({ success: true, data: scan });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'RESCAN_ERROR', message: error.message } });
    }
  }

  static async updateBagStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bagId = req.params.bagId as string;
      const { status } = req.body;
      const updated = await FreshnessBagService.markItemStatus(bagId, req.user!.id, status, req.token);
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'STATUS_UPDATE_ERROR', message: error.message } });
    }
  }

  // Favorites
  static async getFavorites(req: AuthRequest, res: Response): Promise<void> {
    try {
      const favorites = await CartOrderService.getFavorites(req.user!.id, req.token);
      res.status(200).json({ success: true, data: favorites });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FAVORITES_ERROR', message: error.message } });
    }
  }

  static async toggleFavorite(req: AuthRequest, res: Response): Promise<void> {
    try {
      const productId = req.body?.productId || req.body?.product_id || req.params?.productId;
      const result = await CartOrderService.toggleFavorite(req.user!.id, productId, req.token);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'TOGGLE_FAVORITE_ERROR', message: error.message } });
    }
  }
}
