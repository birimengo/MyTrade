// routes/certifiedProducts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  syncCertifiedProducts,
  getCertifiedProducts,
  getAllProducts,
  getLowStockCertifiedProducts
} = require('../controllers/certifiedProductsController');

// Apply auth middleware to all routes
router.use(auth);

// POST /api/certified-products/sync - Sync certified products from orders
router.post('/sync', syncCertifiedProducts);

// GET /api/certified-products - Get certified products
router.get('/', getCertifiedProducts);

// GET /api/certified-products/low-stock - Get low stock certified products
router.get('/low-stock', getLowStockCertifiedProducts);

// GET /api/certified-products/all - Get all products including certified
router.get('/all', getAllProducts);

module.exports = router;