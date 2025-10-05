const express = require('express');
const {
  createOrder,
  getRetailerOrders,
  getWholesalerOrders,
  getTransporterOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStatistics,
  resolveDispute,
  handleReturnRequest
} = require('../controllers/retailerOrderController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// POST /api/retailer-orders - Create a new order (retailer only)
router.post('/', createOrder);

// GET /api/retailer-orders/retailer - Get orders for retailer
router.get('/retailer', getRetailerOrders);

// GET /api/retailer-orders/wholesaler - Get orders for wholesaler
router.get('/wholesaler', getWholesalerOrders);

// GET /api/retailer-orders/transporter - Get orders for transporter
router.get('/transporter', getTransporterOrders);

// GET /api/retailer-orders/stats - Get order statistics
router.get('/stats', getOrderStatistics);

// GET /api/retailer-orders/:id - Get single order
router.get('/:id', getOrder);

// PUT /api/retailer-orders/:id/status - Update order status
router.put('/:id/status', updateOrderStatus);

// PUT /api/retailer-orders/:id/resolve-dispute - Resolve delivery dispute
router.put('/:id/resolve-dispute', resolveDispute);

// PUT /api/retailer-orders/:id/handle-return - Handle return request
router.put('/:id/handle-return', handleReturnRequest);

// DELETE /api/retailer-orders/:id - Delete order (retailer only, pending status only)
router.delete('/:id', deleteOrder);

module.exports = router;