const express = require('express');
const auth = require('../middleware/auth');
const Product = require('../models/Product');

const router = express.Router();

router.use(auth);

// GET /api/certified-products/sales - Get certified products available for sales
router.get('/sales', async (req, res) => {
  try {
    const { search, page = 1, limit = 20, includeOutOfStock = false } = req.query;
    const wholesalerId = req.user.id;

    console.log(`🔍 Fetching certified products for sales for wholesaler: ${wholesalerId}`);

    const filter = {
      wholesaler: wholesalerId,
      fromCertifiedOrder: true,
      isActive: true
    };

    // Stock filter
    if (!includeOutOfStock || includeOutOfStock === 'false') {
      filter.quantity = { $gt: 0 };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter)
      .select('name sku price costPrice quantity measurementUnit category images fromCertifiedOrder certifiedOrderSource priceHistory requiresPricing')
      .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
      .sort({ 
        requiresPricing: -1, // Show products needing pricing first
        quantity: -1, 
        name: 1 
      })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    // Enhance products with sales information
    const enhancedProducts = products.map(product => {
      const costPrice = product.costPrice || 0;
      const currentPrice = product.price || 0;
      const suggestedPrice = costPrice > 0 ? costPrice * 1.2 : 0; // 20% markup
      
      return {
        ...product.toObject(),
        costPrice,
        currentPrice,
        suggestedPrice,
        requiresPricing: product.requiresPricing || (!currentPrice || currentPrice === 0),
        profitMargin: costPrice > 0 && currentPrice > 0 ? 
          ((currentPrice - costPrice) / costPrice * 100).toFixed(2) : 0,
        stockStatus: product.quantity === 0 ? 'out_of_stock' : 
                    product.quantity < 10 ? 'low_stock' : 'in_stock'
      };
    });

    res.status(200).json({
      success: true,
      products: enhancedProducts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      statistics: {
        totalCertifiedProducts: total,
        needsPricing: enhancedProducts.filter(p => p.requiresPricing).length,
        outOfStock: enhancedProducts.filter(p => p.stockStatus === 'out_of_stock').length,
        lowStock: enhancedProducts.filter(p => p.stockStatus === 'low_stock').length
      }
    });

  } catch (error) {
    console.error('Error fetching certified products for sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching certified products',
      error: error.message
    });
  }
});

// PUT /api/certified-products/sales/:productId/price - Update certified product price
router.put('/sales/:productId/price', async (req, res) => {
  try {
    const { productId } = req.params;
    const { sellingPrice, reason = 'Manual price update' } = req.body;
    const wholesalerId = req.user.id;

    console.log(`💰 Updating certified product price: ${productId} to ${sellingPrice}`);

    const product = await Product.findOne({
      _id: productId,
      wholesaler: wholesalerId,
      fromCertifiedOrder: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Certified product not found'
      });
    }

    const newPrice = parseFloat(sellingPrice);
    const costPrice = product.costPrice || 0;

    // Validate selling price
    if (!newPrice || newPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Selling price must be greater than 0'
      });
    }

    if (costPrice > 0 && newPrice < costPrice) {
      return res.status(400).json({
        success: false,
        message: `Selling price cannot be less than cost price (${costPrice})`
      });
    }

    // Update product price
    product.price = newPrice;
    product.requiresPricing = false;

    // Add to price history
    if (product.priceHistory && Array.isArray(product.priceHistory)) {
      product.priceHistory.push({
        sellingPrice: newPrice,
        costPrice: costPrice,
        changedAt: new Date(),
        changedBy: wholesalerId,
        reason: reason,
        changeType: 'manual',
        note: `Price set manually for sales`
      });
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Certified product price updated successfully',
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        costPrice: product.costPrice,
        sellingPrice: product.price,
        profitMargin: costPrice > 0 ? ((newPrice - costPrice) / costPrice * 100).toFixed(2) : 0,
        requiresPricing: false
      }
    });

  } catch (error) {
    console.error('Error updating certified product price:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating certified product price',
      error: error.message
    });
  }
});

// GET /api/certified-products/sales/analytics - Get certified products analytics
router.get('/sales/analytics', async (req, res) => {
  try {
    const wholesalerId = req.user.id;

    const analytics = await Product.getCertifiedProductAnalytics(wholesalerId);

    res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching certified products analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching certified products analytics',
      error: error.message
    });
  }
});

// GET /api/certified-products/sales/low-stock - Get low stock certified products
router.get('/sales/low-stock', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const wholesalerId = req.user.id;

    const lowStockProducts = await Product.find({
      wholesaler: wholesalerId,
      fromCertifiedOrder: true,
      isActive: true,
      quantity: { $gt: 0, $lt: 10 } // Less than 10 units
    })
    .select('name sku price costPrice quantity measurementUnit category requiresPricing')
    .sort({ quantity: 1 }) // Show lowest stock first
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      lowStockProducts,
      total: lowStockProducts.length
    });

  } catch (error) {
    console.error('Error fetching low stock certified products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock certified products',
      error: error.message
    });
  }
});

module.exports = router;