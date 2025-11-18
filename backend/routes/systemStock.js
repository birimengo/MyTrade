const express = require('express');
const {
  getSystemStocks,
  updateSystemStock,
  syncCertifiedOrdersToSystemStock,
  getSystemStockStatistics
} = require('../controllers/systemStockController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// GET /api/system-stocks - Get system stocks for retailer
router.get('/', getSystemStocks);

// PUT /api/system-stocks/:id - Update system stock
router.put('/:id', updateSystemStock);

// POST /api/system-stocks/sync - Sync certified orders to system stock
router.post('/sync', syncCertifiedOrdersToSystemStock);

// GET /api/system-stocks/stats - Get system stock statistics
router.get('/stats', getSystemStockStatistics);

module.exports = router;