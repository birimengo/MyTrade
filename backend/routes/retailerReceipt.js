const express = require('express');
const {
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptByNumber,
  deleteReceipt,
  getReceiptStatistics,
  getRecentReceipts,
  searchReceipts,
  exportReceipts
} = require('../controllers/retailerReceiptController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// POST /api/retailer-receipts - Create a new receipt
router.post('/', createReceipt);

// GET /api/retailer-receipts - Get all receipts for retailer with advanced filtering
router.get('/', getReceipts);

// GET /api/retailer-receipts/stats - Get receipt statistics
router.get('/stats', getReceiptStatistics);

// GET /api/retailer-receipts/recent - Get recent receipts
router.get('/recent/recent', getRecentReceipts);

// GET /api/retailer-receipts/search/:query - Search receipts
router.get('/search/:query', searchReceipts);

// GET /api/retailer-receipts/export - Export receipts to CSV/PDF
router.get('/export/export', exportReceipts);

// GET /api/retailer-receipts/:id - Get receipt by ID
router.get('/:id', getReceiptById);

// GET /api/retailer-receipts/number/:receiptNumber - Get receipt by receipt number
router.get('/number/:receiptNumber', getReceiptByNumber);

// DELETE /api/retailer-receipts/:id - Delete receipt
router.delete('/:id', deleteReceipt);

module.exports = router;