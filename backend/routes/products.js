// routes/products.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  deleteProductImage,
  getProductsForRetailers,
  getProfitAnalytics,
  // RESTOCK FUNCTIONALITY
  restockProduct,
  getRestockHistory,
  getRestockAnalytics,
  getProductsNeedingRestock,
  // PRICE HISTORY FUNCTIONALITY
  updateProductPrice,
  getPriceHistory,
  generateSamplePriceHistory,
  getPriceAnalytics,
  // STOCK HISTORY FUNCTIONALITY
  getStockHistory,
  getStockAnalytics
} = require('../controllers/productController');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// All routes are protected
router.use(auth);

// ==================== PRODUCT MANAGEMENT ROUTES ====================

// GET /api/products - Get all products for wholesaler (INCLUDES CERTIFIED PRODUCTS)
router.get('/', getProducts);

// GET /api/products/categories - Get product categories
router.get('/categories', getCategories);

// GET /api/products/:id - Get single product
router.get('/:id', getProduct);

// POST /api/products - Create new product
router.post('/', upload.array('images', 5), createProduct);

// PUT /api/products/:id - Update product
router.put('/:id', upload.array('images', 5), updateProduct);

// DELETE /api/products/:id - Delete product
router.delete('/:id', deleteProduct);

// DELETE /api/products/:productId/images/:imageId - Delete specific product image
router.delete('/:productId/images/:imageId', deleteProductImage);

// GET /api/products/retailer/all - Get all active products for retailers
router.get('/retailer/all', getProductsForRetailers);

// ==================== ANALYTICS ROUTES ====================

// GET /api/products/analytics/profit - Get profit analytics
router.get('/analytics/profit', getProfitAnalytics);

// GET /api/products/analytics/price - Get price analytics
router.get('/analytics/price', getPriceAnalytics);

// GET /api/products/analytics/stock - Get stock analytics
router.get('/analytics/stock', getStockAnalytics);

// GET /api/products/analytics/restocks - Get restock analytics
router.get('/analytics/restocks', getRestockAnalytics);

// ==================== RESTOCK MANAGEMENT ROUTES ====================

// POST /api/products/:id/restock - Restock product (quantity, price, min order quantity)
router.post('/:id/restock', restockProduct);

// GET /api/products/:id/restock-history - Get restock history for a product
router.get('/:id/restock-history', getRestockHistory);

// GET /api/products/needs-restock - Get products that need restocking (low stock)
router.get('/needs-restock', getProductsNeedingRestock);

// ==================== PRICE MANAGEMENT ROUTES ====================

// PUT /api/products/:id/price - Update product price with comprehensive tracking
router.put('/:id/price', updateProductPrice);

// GET /api/products/:id/price-history - Get price history for a product
router.get('/:id/price-history', getPriceHistory);

// POST /api/products/:id/generate-sample-price-history - Generate sample price history
router.post('/:id/generate-sample-price-history', generateSamplePriceHistory);

// ==================== STOCK MANAGEMENT ROUTES ====================

// GET /api/products/:id/stock-history - Get stock history for a product
router.get('/:id/stock-history', getStockHistory);

module.exports = router;