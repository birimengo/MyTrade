const express = require('express');
const {
  getLowStockProducts,
  updateLowStockThreshold,
  getStockStatistics
} = require('../controllers/stockAlertController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// GET /api/stock-alerts/low-stock - Get low stock products
router.get('/low-stock', getLowStockProducts);

// GET /api/stock-alerts/statistics - Get stock statistics
router.get('/statistics', getStockStatistics);

// PUT /api/stock-alerts/:productId/threshold - Update low stock threshold
router.put('/:productId/threshold', updateLowStockThreshold);

module.exports = router;