import { Router } from 'express';
import { VendorController } from '../controllers/vendorController';
import { FarmerController } from '../controllers/farmerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { auditLog } from '../middleware/auditMiddleware';
import {
  procurementSchema,
  inventoryAdjustSchema,
  productSchema,
} from '../validators';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('VENDOR', 'ADMIN'));

router.get('/dashboard', VendorController.getDashboard);

// Read-only public farmer directory for vendors
router.get('/farmers', FarmerController.listPublicFarmers);
router.get('/farmers/:farmerId', FarmerController.getPublicFarmer);

// Inventory
router.get('/inventory', VendorController.getInventory);
router.post(
  '/inventory/:inventoryId/adjust',
  validate(inventoryAdjustSchema),
  auditLog('ADJUST_INVENTORY', 'vendor_inventory'),
  VendorController.adjustStock
);

// Procurement
router.get('/procurement', VendorController.getProcurements);
router.post(
  '/procurement',
  validate(procurementSchema),
  auditLog('PROCURE_BATCH', 'vendor_procurement'),
  VendorController.procureBatch
);

// Products & Listings
router.get('/products', VendorController.getProducts);
router.post(
  '/products',
  validate(productSchema),
  auditLog('CREATE_PRODUCT', 'product'),
  VendorController.createProduct
);
router.patch(
  '/products/:productId',
  auditLog('UPDATE_PRODUCT', 'product'),
  VendorController.updateProduct
);

// Orders Fulfillment
router.get('/orders', VendorController.getOrders);
router.patch(
  '/orders/:orderId/status',
  auditLog('UPDATE_ORDER_STATUS', 'order'),
  VendorController.updateOrderStatus
);

export default router;
