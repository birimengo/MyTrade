const SystemStock = require('../models/SystemStock');
const RetailerOrder = require('../models/RetailerOrder');

// Get system stocks for retailer
exports.getSystemStocks = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    
    const filter = { retailer: req.user.id };
    
    if (category && category !== 'all') {
      filter.category = category;
    }

    const stocks = await SystemStock.find(filter)
      .populate('product', 'name description images')
      .populate('order', 'orderNumber status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SystemStock.countDocuments(filter);

    res.status(200).json({
      success: true,
      stocks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get system stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching system stocks',
      error: error.message
    });
  }
};

// Add system stock from certified order (called from order controller)
exports.addSystemStockFromOrder = async (orderId) => {
  try {
    const order = await RetailerOrder.findById(orderId)
      .populate('product')
      .populate('retailer');

    if (!order || order.status !== 'certified') {
      return { success: false, message: 'Order not certified' };
    }

    // Check if system stock already exists for this order
    const existingStock = await SystemStock.findOne({ order: orderId });
    if (existingStock) {
      return { success: false, message: 'System stock already exists for this order' };
    }

    // Create system stock entry
    const systemStock = new SystemStock({
      retailer: order.retailer._id,
      order: order._id,
      product: order.product._id,
      name: order.product.name,
      category: order.product.category,
      quantity: order.quantity,
      measurementUnit: order.measurementUnit,
      unitPrice: order.unitPrice,
      totalValue: order.totalPrice,
      orderDate: order.createdAt,
      certificationDate: order.deliveryCertificationDate
    });

    await systemStock.save();

    return { success: true, stock: systemStock };
  } catch (error) {
    console.error('Add system stock from order error:', error);
    return { success: false, error: error.message };
  }
};

// Update system stock (limited fields)
exports.updateSystemStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { minStockLevel, notes } = req.body;

    const stock = await SystemStock.findById(id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }

    // Check if user owns this stock
    if (stock.retailer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this stock item'
      });
    }

    // Only allow updating certain fields
    if (minStockLevel !== undefined) stock.minStockLevel = minStockLevel;
    if (notes !== undefined) stock.notes = notes;

    await stock.save();

    res.status(200).json({
      success: true,
      message: 'Stock item updated successfully',
      stock
    });

  } catch (error) {
    console.error('Update system stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating stock',
      error: error.message
    });
  }
};

// Sync existing certified orders to system stock
exports.syncCertifiedOrdersToSystemStock = async (req, res) => {
  try {
    const retailerId = req.user.id;
    
    // Find all certified orders for this retailer that don't have system stock
    const certifiedOrders = await RetailerOrder.find({
      retailer: retailerId,
      status: 'certified'
    }).populate('product', 'name category');
    
    let createdCount = 0;
    let skippedCount = 0;
    let errors = [];
    
    for (const order of certifiedOrders) {
      try {
        // Check if system stock already exists for this order
        const existingStock = await SystemStock.findOne({ order: order._id });
        
        if (!existingStock) {
          // Create system stock entry
          const systemStock = new SystemStock({
            retailer: order.retailer,
            order: order._id,
            product: order.product._id,
            name: order.product.name,
            category: order.product.category,
            quantity: order.quantity,
            measurementUnit: order.measurementUnit,
            unitPrice: order.unitPrice,
            totalValue: order.totalPrice,
            orderDate: order.createdAt,
            certificationDate: order.deliveryCertificationDate || order.updatedAt
          });
          
          await systemStock.save();
          createdCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        errors.push(`Order ${order._id}: ${error.message}`);
        console.error(`Error syncing order ${order._id}:`, error);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Synced certified orders to system stock. Created: ${createdCount}, Skipped: ${skippedCount}`,
      created: createdCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Sync certified orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while syncing certified orders',
      error: error.message
    });
  }
};

// Get system stock statistics
exports.getSystemStockStatistics = async (req, res) => {
  try {
    const retailerId = req.user.id;

    const statistics = await SystemStock.aggregate([
      { $match: { retailer: retailerId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const totalStocks = await SystemStock.countDocuments({
      retailer: retailerId
    });

    const totalValue = await SystemStock.aggregate([
      { $match: { retailer: retailerId } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);

    res.status(200).json({
      success: true,
      statistics,
      totalStocks,
      totalValue: totalValue[0]?.total || 0
    });

  } catch (error) {
    console.error('Get system stock statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching system stock statistics',
      error: error.message
    });
  }
};