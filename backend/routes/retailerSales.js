const express = require('express');
const {
  recordSale,
  getSalesRecords,
  getSalesStatistics
} = require('../controllers/retailerSalesController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// POST /api/retailer-sales - Record a sale
router.post('/', recordSale);

// GET /api/retailer-sales - Get sales records
router.get('/', getSalesRecords);

// GET /api/retailer-sales/stats - Get sales statistics
router.get('/stats', getSalesStatistics);

module.exports = router;
module.exports = router;