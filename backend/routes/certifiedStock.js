const express = require('express');
const {
  addCertifiedOrderToStock,
  checkCertifiedOrderInStock,
  getCertifiedOrdersForStock,
  bulkAddToStock
} = require('../controllers/certifiedStockController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// GET /api/certified-stock/orders - Get certified orders ready for stock addition
router.get('/orders', getCertifiedOrdersForStock);

// POST /api/certified-stock/orders/bulk-add - Bulk add multiple orders to stock
router.post('/orders/bulk-add', bulkAddToStock);

// POST /api/certified-stock/order/:orderId/add-to-stock - Add certified order products to stock
router.post('/order/:orderId/add-to-stock', addCertifiedOrderToStock);

// GET /api/certified-stock/order/:orderId/check-stock - Check if certified order products are in stock
router.get('/order/:orderId/check-stock', checkCertifiedOrderInStock);

module.exports = router;