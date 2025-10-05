const Product = require('../models/Product');

// Get low stock products for a wholesaler
exports.getLowStockProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const filter = { 
      wholesaler: req.user.id,
      lowStockAlert: true 
    };

    const products = await Product.find(filter)
      .sort({ lowStockAlertAt: -1, quantity: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock products',
      error: error.message
    });
  }
};

// Update low stock threshold for a product
exports.updateLowStockThreshold = async (req, res) => {
  try {
    const { productId } = req.params;
    const { threshold } = req.body;

    if (threshold < 0 || threshold > 1) {
      return res.status(400).json({
        success: false,
        message: 'Threshold must be between 0 and 1 (0% to 100%)'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      wholesaler: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.lowStockThreshold = threshold;
    product.checkLowStock(); // Recheck with new threshold
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Low stock threshold updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating threshold',
      error: error.message
    });
  }
};

// Get stock statistics for wholesaler
exports.getStockStatistics = async (req, res) => {
  try {
    const wholesalerId = req.user.id;

    const statistics = await Product.aggregate([
      { $match: { wholesaler: mongoose.Types.ObjectId(wholesalerId) } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $eq: ['$lowStockAlert', true] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          },
          averageStockLevel: { $avg: '$quantity' }
        }
      }
    ]);

    const lowStockProducts = await Product.find({
      wholesaler: wholesalerId,
      lowStockAlert: true
    }).countDocuments();

    const result = statistics[0] || {
      totalProducts: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      averageStockLevel: 0
    };

    res.status(200).json({
      success: true,
      statistics: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stock statistics',
      error: error.message
    });
  }
};