const RetailerSales = require('../models/RetailerSales');
const RetailerStock = require('../models/RetailerStock');
const SystemStock = require('../models/SystemStock');

// Record a sale
exports.recordSale = async (req, res) => {
  try {
    const {
      productId,
      productName,
      category,
      quantity,
      measurementUnit,
      unitCost,
      sellingPrice,
      profit,
      customerName,
      customerPhone,
      stockType
    } = req.body;

    // Validate required fields
    if (!productId || !productName || !category || !quantity || !measurementUnit || 
        !unitCost || !sellingPrice || profit === undefined || !stockType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Update stock based on stock type
    if (stockType === 'retailer') {
      const stock = await RetailerStock.findById(productId);
      
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
          message: 'Not authorized to sell this stock item'
        });
      }
      
      // Check if sufficient stock
      if (stock.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }
      
      // Update stock quantity
      stock.quantity -= parseFloat(quantity);
      
      // Check if stock is below 50% of original quantity
      // This will automatically update lowStockAlert via the pre-save middleware
      
      await stock.save();
    } else if (stockType === 'system') {
      const stock = await SystemStock.findById(productId);
      
      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'System stock item not found'
        });
      }
      
      // Check if user owns this stock
      if (stock.retailer.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to sell this system stock item'
        });
      }
      
      // Check if sufficient stock
      if (stock.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient system stock'
        });
      }
      
      // Update system stock quantity
      stock.quantity -= parseFloat(quantity);
      await stock.save();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock type'
      });
    }

    // Create sales record
    const sale = new RetailerSales({
      retailer: req.user.id,
      productId,
      productName,
      category,
      quantity: parseFloat(quantity),
      measurementUnit,
      unitCost: parseFloat(unitCost),
      sellingPrice: parseFloat(sellingPrice),
      profit: parseFloat(profit),
      customerName,
      customerPhone,
      stockType
    });

    await sale.save();

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      sale
    });

  } catch (error) {
    console.error('Record sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording sale',
      error: error.message
    });
  }
};

// Get sales records
exports.getSalesRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    const filter = { retailer: req.user.id };
    
    // Date filter
    if (startDate && endDate) {
      filter.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const sales = await RetailerSales.find(filter)
      .sort({ saleDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerSales.countDocuments(filter);

    res.status(200).json({
      success: true,
      sales,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get sales records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sales records',
      error: error.message
    });
  }
};

// Get sales statistics
exports.getSalesStatistics = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const matchStage = { retailer: retailerId };
    
    // Date filter
    if (startDate && endDate) {
      matchStage.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const statistics = await RetailerSales.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          totalSales: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          totalProfit: { $sum: '$profit' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalSales = await RetailerSales.countDocuments(matchStage);
    
    const totalRevenueResult = await RetailerSales.aggregate([
      { $match: matchStage },
      { 
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } }
        }
      }
    ]);
    
    const totalProfitResult = await RetailerSales.aggregate([
      { $match: matchStage },
      { 
        $group: {
          _id: null,
          total: { $sum: '$profit' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      statistics,
      totalSales,
      totalRevenue: totalRevenueResult[0]?.total || 0,
      totalProfit: totalProfitResult[0]?.total || 0
    });

  } catch (error) {
    console.error('Get sales statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sales statistics',
      error: error.message
    });
  }
};

// Get low stock alerts for retailer
exports.getLowStockAlerts = async (req, res) => {
  try {
    const retailerId = req.user.id;
    
    // Get retailer stocks with low stock alerts
    const lowStockItems = await RetailerStock.find({
      retailer: retailerId,
      isActive: true,
      lowStockAlert: true
    }).sort({ quantity: 1 });
    
    res.status(200).json({
      success: true,
      lowStockItems,
      count: lowStockItems.length
    });
    
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock alerts',
      error: error.message
    });
  }
};