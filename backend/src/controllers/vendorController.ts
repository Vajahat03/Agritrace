import { Response } from 'express';
import { AuthRequest } from '../types';
import { VendorProcurementService } from '../services/vendorProcurementService';
import { CartOrderService } from '../services/cartOrderService';
import { NotificationService } from '../services/notifications/notificationService';

export class VendorController {
  static async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vendorId = req.user!.id;
      const token = req.token;

      const [inventory, procurements, orders, notifications] = await Promise.all([
        VendorProcurementService.getInventory(vendorId, token),
        VendorProcurementService.getProcurements(vendorId, token),
        CartOrderService.getVendorOrders(vendorId, token),
        NotificationService.getUserNotifications(vendorId, true, token),
      ]);

      const lowStockItems = inventory.filter((i) => i.quantity < 10);
      const pendingOrders = orders.filter((o) => ['PLACED', 'CONFIRMED', 'PROCESSING'].includes(o.status));
      const completedOrders = orders.filter((o) => o.status === 'DELIVERED');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            inventoryCount: inventory.length,
            lowStockCount: lowStockItems.length,
            pendingOrdersCount: pendingOrders.length,
            totalProcurements: procurements.length,
            totalRevenue,
          },
          inventory: inventory.slice(0, 8),
          recentOrders: orders.slice(0, 5),
          procurements: procurements.slice(0, 5),
          notifications: notifications.slice(0, 5),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'VENDOR_DASHBOARD_ERROR', message: error.message } });
    }
  }

  // Inventory
  static async getInventory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inventory = await VendorProcurementService.getInventory(req.user!.id, req.token);
      res.status(200).json({ success: true, data: inventory });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INVENTORY_FETCH_ERROR', message: error.message } });
    }
  }

  static async adjustStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inventoryId = req.params.inventoryId as string;
      const updated = await VendorProcurementService.adjustStock(
        inventoryId,
        req.user!.id,
        req.body.adjustmentType,
        req.body.quantityChange,
        req.body.reason,
        req.token
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'STOCK_ADJUST_ERROR', message: error.message } });
    }
  }

  // Procurement
  static async getProcurements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const list = await VendorProcurementService.getProcurements(req.user!.id, req.token);
      res.status(200).json({ success: true, data: list });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PROCUREMENT_FETCH_ERROR', message: error.message } });
    }
  }

  static async procureBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await VendorProcurementService.procureBatch(
        req.user!.id,
        {
          batchId: req.body.batchId,
          quantity: req.body.quantity,
          purchasePrice: req.body.purchasePrice,
          purchaseDate: req.body.purchaseDate,
          transportDetails: req.body.transportDetails,
          location: req.body.location,
          notes: req.body.notes,
        },
        req.token
      );
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PROCURE_ERROR', message: error.message } });
    }
  }

  // Products
  static async getProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const products = await VendorProcurementService.getVendorProducts(req.user!.id, req.token);
      res.status(200).json({ success: true, data: products });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PRODUCTS_FETCH_ERROR', message: error.message } });
    }
  }

  static async createProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const product = await VendorProcurementService.createProduct(
        req.user!.id,
        {
          batch_id: req.body.batchId,
          name: req.body.name,
          crop_type: req.body.cropType,
          variety: req.body.variety,
          description: req.body.description,
          price_per_unit: req.body.pricePerUnit,
          unit: req.body.unit || 'kg',
          available_quantity: req.body.availableQuantity,
          images: req.body.images || [],
          quality_grade: req.body.qualityGrade || 'Grade A',
          location: req.body.location,
        },
        req.body.listingStatus || 'ACTIVE',
        req.body.minOrderQuantity || 1,
        req.token
      );
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PRODUCT_CREATE_ERROR', message: error.message } });
    }
  }

  static async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const product = await VendorProcurementService.updateProduct(
        productId,
        req.user!.id,
        {
          name: req.body.name,
          description: req.body.description,
          price_per_unit: req.body.pricePerUnit,
          available_quantity: req.body.availableQuantity,
          quality_grade: req.body.qualityGrade,
        },
        req.body.listingStatus,
        req.token
      );
      res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PRODUCT_UPDATE_ERROR', message: error.message } });
    }
  }

  // Orders
  static async getOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const orders = await CartOrderService.getVendorOrders(req.user!.id, req.token);
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'ORDERS_FETCH_ERROR', message: error.message } });
    }
  }

  static async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const updated = await CartOrderService.updateStatus(
        orderId,
        req.body.status,
        req.user!.id,
        req.token
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'ORDER_STATUS_ERROR', message: error.message } });
    }
  }
}
