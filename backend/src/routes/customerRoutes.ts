import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { auditLog } from '../middleware/auditMiddleware';
import {
  checkoutSchema,
  freshnessBagSchema,
  rescanSchema,
} from '../validators';

const router = Router();

// Publicly readable marketplace endpoints
router.get('/marketplace', optionalAuthMiddleware, CustomerController.getMarketplace);
router.get('/products', optionalAuthMiddleware, CustomerController.getMarketplace);
router.get('/products/:productId', optionalAuthMiddleware, CustomerController.getProductDetails);

// Authenticated Customer Endpoints
router.use(authMiddleware);
router.use(requireRole('CUSTOMER', 'ADMIN'));

router.get('/dashboard', CustomerController.getDashboard);

// Cart
router.get('/cart', CustomerController.getCart);
router.post('/cart', CustomerController.addToCart);
router.post('/cart/items', CustomerController.addToCart);
router.patch('/cart/:itemId', CustomerController.updateCartItem);
router.patch('/cart/items/:itemId', CustomerController.updateCartItem);
router.delete('/cart/:itemId', CustomerController.removeCartItem);
router.delete('/cart/items/:itemId', CustomerController.removeCartItem);

// Checkout & Orders
router.post(
  '/checkout',
  validate(checkoutSchema),
  auditLog('CUSTOMER_CHECKOUT', 'order'),
  CustomerController.checkout
);
router.post(
  '/orders/checkout',
  validate(checkoutSchema),
  auditLog('CUSTOMER_CHECKOUT', 'order'),
  CustomerController.checkout
);
router.get('/orders', CustomerController.getOrders);
router.get('/orders/:orderId', CustomerController.getOrderDetails);

// Freshness Bag (Re-scan lifecycle & Shelf-life monitoring)
router.get('/freshness-bag', CustomerController.getFreshnessBag);
router.get('/freshness-bag/:bagId', CustomerController.getFreshnessItem);
router.post(
  '/freshness-bag',
  validate(freshnessBagSchema),
  auditLog('ADD_FRESHNESS_BAG', 'freshness_bag'),
  CustomerController.addToFreshnessBag
);
router.post(
  '/freshness-bag/:bagId/rescan',
  validate(rescanSchema),
  auditLog('RESCAN_FRESHNESS_BAG', 'freshness_scan'),
  CustomerController.rescanProduce
);
router.patch(
  '/freshness-bag/:bagId/status',
  auditLog('UPDATE_BAG_STATUS', 'freshness_bag'),
  CustomerController.updateBagStatus
);

// Favorites
router.get('/favorites', CustomerController.getFavorites);
router.post('/favorites/toggle', CustomerController.toggleFavorite);
router.post('/favorites/:productId', CustomerController.toggleFavorite);
router.delete('/favorites/:productId', CustomerController.toggleFavorite);

export default router;
