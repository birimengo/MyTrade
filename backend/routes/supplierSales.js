const express = require('express');
const {
  createSale,
  getSalesStatistics,
  getSales,
  getSaleDetails,
  cancelSale,
  getSalesAnalytics,
  exportSalesData,
  getSalesPerformance,
  getStockAlerts,
  getRecentSales,
  getSalesByProduct,
  getCustomerSalesHistory,
  getSalesTrends,
  bulkUpdateSalesStatus
} = require('../controllers/supplierSalesController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/supplier-sales - Create a new sale
router.post('/', createSale);

// GET /api/supplier-sales/statistics - Get sales statistics
router.get('/statistics', getSalesStatistics);

// GET /api/supplier-sales - Get all sales
router.get('/', getSales);

// GET /api/supplier-sales/:saleId - Get sale details
router.get('/:saleId', getSaleDetails);

// PUT /api/supplier-sales/:saleId/cancel - Cancel sale
router.put('/:saleId/cancel', cancelSale);

// ========== NEW EXPANDED ROUTES ==========

// GET /api/supplier-sales/analytics/performance - Get sales performance metrics
router.get('/analytics/performance', getSalesPerformance);

// GET /api/supplier-sales/analytics/detailed - Get detailed sales analytics
router.get('/analytics/detailed', getSalesAnalytics);

// GET /api/supplier-sales/export/data - Export sales data
router.get('/export/data', exportSalesData);

// GET /api/supplier-sales/alerts/stock - Get stock alerts with sales impact
router.get('/alerts/stock', getStockAlerts);

// ========== EXTENDED SALES ROUTES ==========

// GET /api/supplier-sales/recent/:limit - Get recent sales
router.get('/recent/:limit?', getRecentSales);

// GET /api/supplier-sales/product/:productId - Get sales by product
router.get('/product/:productId', getSalesByProduct);

// GET /api/supplier-sales/customer/:customerEmail - Get customer sales history
router.get('/customer/:customerEmail', getCustomerSalesHistory);

// GET /api/supplier-sales/analytics/trends - Get sales trends over time
router.get('/analytics/trends', getSalesTrends);

// PUT /api/supplier-sales/bulk/status - Bulk update sales status
router.put('/bulk/status', bulkUpdateSalesStatus);

module.exports = router;