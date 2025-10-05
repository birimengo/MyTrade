// routes/wholesalerOrdersToSupplierRoute.js
const express = require('express');
const {
  createOrder,
  getWholesalerOrders,
  getOrderDetails,
  updateOrderStatus,
  getOrderStatistics,
  addOrderNotes,
  getOrdersBySupplier,
  deleteOrder
} = require('../controllers/wholesalerOrdersToSupplierController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected and require wholesaler role
router.use(auth);

// POST /api/wholesaler-orders - Create a new order
router.post('/', createOrder);

// GET /api/wholesaler-orders - Get all orders for wholesaler
router.get('/', getWholesalerOrders);

// GET /api/wholesaler-orders/statistics - Get order statistics
router.get('/statistics', getOrderStatistics);

// GET /api/wholesaler-orders/:orderId - Get single order details
router.get('/:orderId', getOrderDetails);

// PUT /api/wholesaler-orders/:orderId/status - Update order status
router.put('/:orderId/status', updateOrderStatus);

// PUT /api/wholesaler-orders/:orderId/notes - Add internal notes to order
router.put('/:orderId/notes', addOrderNotes);

// DELETE /api/wholesaler-orders/:orderId - Delete order (only for pending status)
router.delete('/:orderId', deleteOrder);

// GET /api/wholesaler-orders/supplier/:supplierId - Get orders by specific supplier
router.get('/supplier/:supplierId', getOrdersBySupplier);

module.exports = router;