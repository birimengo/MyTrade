const express = require('express');
const {
  getRetailerStocks,
  createRetailerStock,
  updateRetailerStock,
  deleteRetailerStock,
  getStockStatistics,
  restock // Add the new restock function
} = require('../controllers/retailerStockController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// GET /api/retailer-stocks - Get retailer stocks
router.get('/', getRetailerStocks);

// POST /api/retailer-stocks - Create retailer stock
router.post('/', createRetailerStock);

// PUT /api/retailer-stocks/:id - Update retailer stock
router.put('/:id', updateRetailerStock);

// DELETE /api/retailer-stocks/:id - Delete retailer stock
router.delete('/:id', deleteRetailerStock);

// GET /api/retailer-stocks/stats - Get stock statistics
router.get('/stats', getStockStatistics);

// POST /api/retailer-stocks/:id/restock - Restock and update original quantity (NEW ROUTE)
router.post('/:id/restock', restock);

module.exports = router;