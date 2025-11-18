// routes/systemStock.js - ADD THIS ROUTE
const express = require('express');
const {
  getSystemStocks,
  updateSystemStock,
  syncCertifiedOrdersToSystemStock,
  getSystemStockStatistics,
  updateSystemStockQuantity // ADD THIS IMPORT
} = require('../controllers/systemStockController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getSystemStocks);
router.put('/:id', updateSystemStock);
router.put('/:id/update-quantity', updateSystemStockQuantity); // ADD THIS LINE
router.post('/sync', syncCertifiedOrdersToSystemStock);
router.get('/stats', getSystemStockStatistics);

module.exports = router;