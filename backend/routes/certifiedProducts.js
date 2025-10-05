// routes/certifiedProducts.js
const express = require('express');
const {
  syncCertifiedProducts,
  getCertifiedProducts,
  getAllProducts
} = require('../controllers/certifiedProductsController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected and require wholesaler role
router.use(auth);

// POST /api/certified-products/sync - Sync certified supplier orders to products
router.post('/sync', syncCertifiedProducts);

// GET /api/certified-products - Get only certified products
router.get('/', getCertifiedProducts);

// GET /api/products - Get all products including certified ones (updated route)
router.get('/all', getAllProducts);

module.exports = router;