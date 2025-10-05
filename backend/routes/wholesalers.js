// backend/routes/wholesalers.js
const express = require('express');
const {
  getWholesalersByCategory,
  getAllWholesalers,
  getWholesalerById,
  getWholesalerProducts // Add this new function
} = require('../controllers/wholesalerController');

const router = express.Router();

// Get wholesalers by product category
router.get('/', getWholesalersByCategory);

// Get all wholesalers
router.get('/all', getAllWholesalers);

// Get specific wholesaler by ID
router.get('/:id', getWholesalerById);

// Get products for a specific wholesaler
router.get('/:id/products', getWholesalerProducts);

module.exports = router;