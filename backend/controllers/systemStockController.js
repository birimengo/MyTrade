// controllers/systemStockController.js
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

// Update system stock quantity (for sales and adjustments)
exports.updateSystemStockQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange, reason } = req.body;

    // Validate input
    if (typeof quantityChange !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'quantityChange must be a number'
      });
    }

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

    const previousQuantity = stock.quantity;
    const newQuantity = stock.quantity + quantityChange;
    
    // Validate new quantity
    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock quantity. Available: ${stock.quantity}, Requested: ${Math.abs(quantityChange)}`
      });
    }

    // Update quantity
    stock.quantity = newQuantity;
    
    // Add transaction history
    if (!stock.transactionHistory) {
      stock.transactionHistory = [];
    }
    
    stock.transactionHistory.push({
      type: quantityChange > 0 ? 'addition' : 'deduction',
      quantity: Math.abs(quantityChange),
      previousQuantity: previousQuantity,
      newQuantity: stock.quantity,
      reason: reason || (quantityChange > 0 ? 'Stock addition' : 'Sale deduction'),
      date: new Date(),
      changedBy: req.user.id
    });

    // Update last updated timestamp
    stock.updatedAt = new Date();

    await stock.save();

    // Populate the updated stock for response
    const updatedStock = await SystemStock.findById(id)
      .populate('product', 'name description images')
      .populate('order', 'orderNumber status');

    res.status(200).json({
      success: true,
      message: 'Stock quantity updated successfully',
      stock: {
        id: updatedStock._id,
        name: updatedStock.name,
        category: updatedStock.category,
        previousQuantity: previousQuantity,
        newQuantity: updatedStock.quantity,
        change: quantityChange,
        unitPrice: updatedStock.unitPrice,
        totalValue: updatedStock.totalValue,
        product: updatedStock.product,
        order: updatedStock.order
      }
    });

  } catch (error) {
    console.error('Update system stock quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating stock quantity',
      error: error.message
    });
  }
};

// Bulk update system stock quantities (for multiple sales items)
exports.bulkUpdateSystemStockQuantities = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and cannot be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { stockId, quantityChange, reason } = update;

        if (!stockId || typeof quantityChange !== 'number') {
          errors.push(`Invalid update data: ${JSON.stringify(update)}`);
          continue;
        }

        const stock = await SystemStock.findById(stockId);
        if (!stock) {
          errors.push(`Stock item not found: ${stockId}`);
          continue;
        }

        // Check if user owns this stock
        if (stock.retailer.toString() !== req.user.id) {
          errors.push(`Not authorized to update stock: ${stockId}`);
          continue;
        }

        const previousQuantity = stock.quantity;
        const newQuantity = stock.quantity + quantityChange;
        
        if (newQuantity < 0) {
          errors.push(`Insufficient stock for ${stock.name}: Available ${stock.quantity}, Requested ${Math.abs(quantityChange)}`);
          continue;
        }

        stock.quantity = newQuantity;
        
        if (!stock.transactionHistory) {
          stock.transactionHistory = [];
        }
        
        stock.transactionHistory.push({
          type: quantityChange > 0 ? 'addition' : 'deduction',
          quantity: Math.abs(quantityChange),
          previousQuantity: previousQuantity,
          newQuantity: stock.quantity,
          reason: reason || 'Bulk update',
          date: new Date(),
          changedBy: req.user.id
        });

        stock.updatedAt = new Date();
        await stock.save();

        results.push({
          stockId: stock._id,
          name: stock.name,
          previousQuantity,
          newQuantity,
          change: quantityChange,
          success: true
        });

      } catch (error) {
        errors.push(`Error updating stock ${update.stockId}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk update completed. Success: ${results.length}, Errors: ${errors.length}`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk update system stock quantities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while bulk updating stock quantities',
      error: error.message
    });
  }
};

// Get system stock transaction history
exports.getSystemStockTransactionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

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
        message: 'Not authorized to view this stock item'
      });
    }

    let transactions = stock.transactionHistory || [];

    // Apply filters
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    if (startDate) {
      const start = new Date(startDate);
      transactions = transactions.filter(t => new Date(t.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      transactions = transactions.filter(t => new Date(t.date) <= end);
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    // Calculate statistics
    const totalAdditions = transactions.filter(t => t.type === 'addition').length;
    const totalDeductions = transactions.filter(t => t.type === 'deduction').length;
    const totalQuantityChanged = transactions.reduce((sum, t) => sum + t.quantity, 0);

    res.status(200).json({
      success: true,
      stock: {
        id: stock._id,
        name: stock.name,
        currentQuantity: stock.quantity,
        unitPrice: stock.unitPrice
      },
      transactions: paginatedTransactions,
      statistics: {
        totalTransactions: transactions.length,
        totalAdditions,
        totalDeductions,
        totalQuantityChanged,
        netChange: transactions.reduce((sum, t) => 
          sum + (t.type === 'addition' ? t.quantity : -t.quantity), 0
        )
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(transactions.length / limit),
        totalItems: transactions.length,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get system stock transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction history',
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
          totalQuantity: { $sum: '$quantity' },
          averageUnitPrice: { $avg: '$unitPrice' }
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

    const lowStockItems = await SystemStock.find({
      retailer: retailerId,
      $expr: { $lt: ['$quantity', '$minStockLevel'] }
    }).countDocuments();

    const outOfStockItems = await SystemStock.find({
      retailer: retailerId,
      quantity: 0
    }).countDocuments();

    res.status(200).json({
      success: true,
      statistics,
      summary: {
        totalStocks,
        totalValue: totalValue[0]?.total || 0,
        lowStockItems,
        outOfStockItems,
        activeStocks: totalStocks - outOfStockItems
      }
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

// Search system stocks
exports.searchSystemStocks = async (req, res) => {
  try {
    const { query, category, minQuantity, maxQuantity } = req.query;
    
    const filter = { retailer: req.user.id };
    
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { 'product.name': { $regex: query, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (minQuantity !== undefined) {
      filter.quantity = { ...filter.quantity, $gte: parseInt(minQuantity) };
    }
    
    if (maxQuantity !== undefined) {
      filter.quantity = { ...filter.quantity, $lte: parseInt(maxQuantity) };
    }

    const stocks = await SystemStock.find(filter)
      .populate('product', 'name description images')
      .populate('order', 'orderNumber status')
      .sort({ quantity: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      stocks,
      total: stocks.length
    });

  } catch (error) {
    console.error('Search system stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching system stocks',
      error: error.message
    });
  }
};