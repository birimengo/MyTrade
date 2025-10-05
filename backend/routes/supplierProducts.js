const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {
  getSupplierProducts,
  getSupplierProduct,
  createSupplierProduct,
  updateSupplierProduct,
  deleteSupplierProduct,
  getSupplierCategories,
  updateProductionStatus,
  getProductionStatistics,
  deleteProductImage,
  getSupplierProductsForWholesaler, // Add this import
  getSupplierDetails // Add this import
} = require('../controllers/supplierProductionController');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/supplier-products/';
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

// GET /api/supplier-products - Get all products for supplier
router.get('/', getSupplierProducts);

// GET /api/supplier-products/categories - Get product categories
router.get('/categories', getSupplierCategories);

// GET /api/supplier-products/stats - Get production statistics
router.get('/stats', getProductionStatistics);

// GET /api/supplier-products/:id - Get single product
router.get('/:id', getSupplierProduct);

// POST /api/supplier-products - Create new product
router.post('/', upload.array('images', 5), createSupplierProduct);

// PUT /api/supplier-products/:id - Update product
router.put('/:id', upload.array('images', 5), updateSupplierProduct);

// PUT /api/supplier-products/:id/status - Update production status
router.put('/:id/status', updateProductionStatus);

// DELETE /api/supplier-products/:id - Delete product
router.delete('/:id', deleteSupplierProduct);

// DELETE /api/supplier-products/:productId/images/:imageId - Delete specific product image
router.delete('/:productId/images/:imageId', deleteProductImage);

// ========== NEW ROUTES ADDED FOR WHOLESALERS ==========

// GET /api/supplier-products/supplier/:supplierId - Get all products for a specific supplier
router.get('/supplier/:supplierId', getSupplierProductsForWholesaler);

// GET /api/supplier-products/supplier/:supplierId/details - Get supplier details
router.get('/supplier/:supplierId/details', getSupplierDetails);

// ========== NEW ROUTES FOR STOCK MANAGEMENT ==========

// PUT /api/supplier-products/:id/stock - Update product stock manually
router.put('/:id/stock', async (req, res) => {
  try {
    const { quantity, operation = 'set', reason } = req.body;
    const productId = req.params.id;
    const supplierId = req.user.id;

    // Validate input
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity. Must be a positive number.'
      });
    }

    if (!['increase', 'decrease', 'set'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Must be one of: increase, decrease, set'
      });
    }

    const SupplierProduct = require('../models/SupplierProduct');
    const product = await SupplierProduct.findOne({
      _id: productId,
      supplier: supplierId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update stock
    await product.updateStock(quantity, operation);

    // Log the stock update (optional - you can create a StockUpdateLog model)
    console.log(`Stock updated for product ${product.name}: ${operation} ${quantity}. Reason: ${reason || 'Manual update'}`);

    res.json({
      success: true,
      message: 'Stock updated successfully',
      product: {
        _id: product._id,
        name: product.name,
        quantity: product.quantity,
        lowStockAlert: product.lowStockAlert,
        lastStockUpdate: product.lastStockUpdate
      },
      update: {
        operation,
        quantity,
        reason: reason || 'Manual update'
      }
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/supplier-products/:id/stock-history - Get stock update history (placeholder)
router.get('/:id/stock-history', async (req, res) => {
  try {
    const productId = req.params.id;
    const supplierId = req.user.id;

    const SupplierProduct = require('../models/SupplierProduct');
    const product = await SupplierProduct.findOne({
      _id: productId,
      supplier: supplierId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // This is a placeholder - you would implement actual stock history tracking
    // with a separate StockUpdateLog model
    res.json({
      success: true,
      message: 'Stock history endpoint - implement with StockUpdateLog model',
      product: {
        _id: product._id,
        name: product.name,
        currentStock: product.quantity,
        lastUpdated: product.lastStockUpdate
      },
      history: [] // Empty array - implement with actual history data
    });

  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/supplier-products/stock/low-stock - Get low stock products
router.get('/stock/low-stock', async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const SupplierProduct = require('../models/SupplierProduct');
    const lowStockProducts = await SupplierProduct.find({
      supplier: supplierId,
      lowStockAlert: true,
      isActive: true
    })
    .sort({ quantity: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SupplierProduct.countDocuments({
      supplier: supplierId,
      lowStockAlert: true,
      isActive: true
    });

    res.json({
      success: true,
      products: lowStockProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/supplier-products/stock/out-of-stock - Get out of stock products
router.get('/stock/out-of-stock', async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const SupplierProduct = require('../models/SupplierProduct');
    const outOfStockProducts = await SupplierProduct.find({
      supplier: supplierId,
      quantity: 0,
      isActive: true
    })
    .sort({ name: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SupplierProduct.countDocuments({
      supplier: supplierId,
      quantity: 0,
      isActive: true
    });

    res.json({
      success: true,
      products: outOfStockProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching out of stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching out of stock products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== NEW ROUTES FOR SALES STATISTICS ==========

// GET /api/supplier-products/sales/statistics - Get sales statistics for supplier dashboard
router.get('/sales/statistics', async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { timeframe = 'all' } = req.query;

    console.log('Fetching sales statistics for supplier:', supplierId);

    // Import required models
    const SupplierProduct = require('../models/SupplierProduct');
    const mongoose = require('mongoose');

    // Get stock statistics from products
    const stockStats = await SupplierProduct.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockValue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          totalOriginalStockValue: { $sum: { $multiply: ['$quantity', '$productionPrice'] } },
          totalItemsInStock: { $sum: '$quantity' },
          inStockCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$quantity', '$lowStockThreshold'] }, { $gt: ['$quantity', 0] }] },
                1,
                0
              ]
            }
          },
          lowStockCount: {
            $sum: {
              $cond: [
                { $and: [{ $lte: ['$quantity', '$lowStockThreshold'] }, { $gt: ['$quantity', 0] }] },
                1,
                0
              ]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [
                { $eq: ['$quantity', 0] },
                1,
                0
              ]
            }
          },
          averageProfitMargin: { $avg: '$profitMargin' }
        }
      }
    ]);

    // Try to get sales data if SupplierSale model exists
    let salesStats = {
      totalSales: 0,
      totalProfit: 0,
      totalItemsSold: 0,
      totalOrders: 0,
      averageOrderValue: 0
    };

    try {
      // Check if SupplierSale model exists
      const SupplierSale = require('../models/SupplierSale');
      
      // Calculate date range based on timeframe
      let dateFilter = {};
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (timeframe) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate = new Date(0);
        }

        dateFilter.saleDate = { $gte: startDate };
      }

      const salesData = await SupplierSale.aggregate([
        {
          $match: {
            supplier: new mongoose.Types.ObjectId(supplierId),
            status: 'completed',
            ...dateFilter
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalProfit: { $sum: '$totalProfit' },
            totalItemsSold: { $sum: { $sum: '$items.quantity' } },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]);

      if (salesData.length > 0) {
        salesStats = salesData[0];
      }
    } catch (saleModelError) {
      console.log('SupplierSale model not available, using default sales statistics');
      // If SupplierSale model doesn't exist, use default values
      // This allows the endpoint to work even without the sales model
    }

    const statistics = {
      sales: salesStats,
      stock: stockStats[0] || {
        totalProducts: 0,
        totalStockValue: 0,
        totalOriginalStockValue: 0,
        totalItemsInStock: 0,
        inStockCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        averageProfitMargin: 0
      }
    };

    console.log('Sales statistics fetched successfully');

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Error fetching sales statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/supplier-products/sales/recent - Get recent sales (placeholder)
router.get('/sales/recent', async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { limit = 10 } = req.query;

    let recentSales = [];
    
    try {
      // Check if SupplierSale model exists
      const SupplierSale = require('../models/SupplierSale');
      recentSales = await SupplierSale.find({
        supplier: supplierId,
        status: 'completed'
      })
      .sort({ saleDate: -1 })
      .limit(parseInt(limit))
      .populate('items.productId', 'name category')
      .lean();
    } catch (saleModelError) {
      console.log('SupplierSale model not available, returning empty recent sales');
    }

    res.json({
      success: true,
      sales: recentSales,
      message: recentSales.length === 0 ? 'No sales data available yet' : 'Recent sales fetched successfully'
    });

  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent sales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;