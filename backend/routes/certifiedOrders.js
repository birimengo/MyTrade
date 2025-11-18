// routes/certifiedOrders.js
const express = require('express');
const {
  processCertifiedOrder,
  getCertifiedProducts,
  getOrdersReadyForCertification,
  getCertifiedProductDetails,
  updateCertifiedProductStock
} = require('../controllers/certifiedOrdersController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/certified-orders/:orderId/process - Process and certify an order
router.post('/:orderId/process', processCertifiedOrder);

// GET /api/certified-orders/products - Get certified products
router.get('/products', getCertifiedProducts);

// GET /api/certified-orders/ready - Get orders ready for certification
router.get('/ready', getOrdersReadyForCertification);

// GET /api/certified-orders/products/:productId - Get certified product details
router.get('/products/:productId', getCertifiedProductDetails);

// PUT /api/certified-orders/products/:productId/stock - Update certified product stock
router.put('/products/:productId/stock', updateCertifiedProductStock);

module.exports = router;