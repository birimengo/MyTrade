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
  getProductsForRetailers // Add this
} = require('../controllers/productController');
const auth = require('../middleware/auth'); // This now imports the function directly

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

// NEW ROUTE: GET /api/products/retailer/all - Get all active products for retailers
router.get('/retailer/all', getProductsForRetailers);

module.exports = router;