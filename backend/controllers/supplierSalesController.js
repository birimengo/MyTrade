const SupplierSale = require('../models/SupplierSale');
const SupplierProduct = require('../models/SupplierProduct');
const mongoose = require('mongoose');

// Create a new sale
exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const supplierId = req.user.id;
    const { customerDetails, items, saleDate, notes, paymentMethod, discountAmount, discountPercentage, taxAmount, shippingDetails } = req.body;

    console.log('Creating sale with data:', { supplierId, items, customerDetails });

    // Validate items and update stock
    const saleItems = [];
    let totalAmount = 0;
    let totalProfit = 0;

    for (const item of items) {
      const product = await SupplierProduct.findOne({
        _id: item.productId,
        supplier: supplierId
      }).session(session);

      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.quantity < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        });
      }

      // Calculate item totals
      const itemTotalPrice = item.unitPrice * item.quantity;
      const itemProfit = (item.unitPrice - product.productionPrice) * item.quantity;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        productionPrice: product.productionPrice,
        totalPrice: itemTotalPrice,
        profit: itemProfit
      });

      totalAmount += itemTotalPrice;
      totalProfit += itemProfit;

      // Update product quantity
      product.quantity -= item.quantity;
      await product.save({ session });
    }

    // Create sale record
    const sale = new SupplierSale({
      supplier: supplierId,
      customerDetails: customerDetails || { name: 'Walk-in Customer' },
      items: saleItems,
      saleDate: saleDate || new Date(),
      notes: notes || '',
      totalAmount,
      totalProfit,
      paymentMethod: paymentMethod || 'cash',
      discountAmount: discountAmount || 0,
      discountPercentage: discountPercentage || 0,
      taxAmount: taxAmount || 0,
      shippingDetails: shippingDetails || {},
      status: 'completed',
      createdBy: supplierId
    });

    await sale.save({ session });
    await session.commitTransaction();

    // Populate sale for response
    const populatedSale = await SupplierSale.findById(sale._id)
      .populate('items.productId', 'name category measurementUnit images');

    console.log('✅ Sale created successfully:', sale.saleNumber);

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      sale: populatedSale
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error creating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sale',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Get sales statistics
exports.getSalesStatistics = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { timeframe = 'all' } = req.query;

    console.log('Fetching sales statistics for supplier:', supplierId);

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

    // Get sales statistics
    const salesStats = await SupplierSale.aggregate([
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
          averageOrderValue: { $avg: '$totalAmount' },
          totalDiscounts: { $sum: '$discountAmount' },
          totalTax: { $sum: '$taxAmount' }
        }
      }
    ]);

    // Get stock statistics
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
          totalOriginalStockValue: { $sum: { $multiply: ['$quantity', '$productionPrice'] } },
          totalCurrentStockValue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          totalItemsInStock: { $sum: '$quantity' }
        }
      }
    ]);

    // Get today's sales
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStats = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: todayStart }
        }
      },
      {
        $group: {
          _id: null,
          todaySales: { $sum: '$totalAmount' },
          todayOrders: { $sum: 1 },
          todayProfit: { $sum: '$totalProfit' }
        }
      }
    ]);

    const statistics = {
      sales: salesStats[0] || {
        totalSales: 0,
        totalProfit: 0,
        totalItemsSold: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalDiscounts: 0,
        totalTax: 0
      },
      stock: stockStats[0] || {
        totalOriginalStockValue: 0,
        totalCurrentStockValue: 0,
        totalItemsInStock: 0
      },
      today: todayStats[0] || {
        todaySales: 0,
        todayOrders: 0,
        todayProfit: 0
      }
    };

    console.log('✅ Sales statistics fetched successfully');

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('❌ Error fetching sales statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all sales with pagination - UPDATED WITH BETTER SORTING
exports.getSales = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { page = 1, limit = 50, startDate, endDate, customerName, status, paymentMethod, sortBy = 'saleDate', sortOrder = 'desc' } = req.query;

    console.log('Fetching sales with params:', { page, limit, sortBy, sortOrder });

    const filter = { supplier: supplierId };

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    } else {
      filter.status = { $in: ['completed', 'pending', 'partially_refunded'] };
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.saleDate.$lte = end;
      }
    }

    // Customer name filter
    if (customerName) {
      filter['customerDetails.name'] = { $regex: customerName, $options: 'i' };
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Ensure consistent sorting by multiple fields
    if (sortBy !== 'saleDate') {
      sortConfig.saleDate = -1; // Always sort by sale date as secondary
    }
    sortConfig.createdAt = -1; // Tertiary sort for consistency

    const sales = await SupplierSale.find(filter)
      .populate('items.productId', 'name category measurementUnit images')
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SupplierSale.countDocuments(filter);

    console.log(`✅ Fetched ${sales.length} sales, total: ${total}`);

    res.json({
      success: true,
      sales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalSales: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single sale details
exports.getSaleDetails = async (req, res) => {
  try {
    const { saleId } = req.params;
    const supplierId = req.user.id;

    const sale = await SupplierSale.findOne({
      _id: saleId,
      supplier: supplierId
    }).populate('items.productId', 'name category measurementUnit images productionPrice sku');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      sale
    });

  } catch (error) {
    console.error('❌ Error fetching sale details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sale details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cancel/refund sale
exports.cancelSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { saleId } = req.params;
    const supplierId = req.user.id;
    const { reason, refundAmount, partialRefund } = req.body;

    const sale = await SupplierSale.findOne({
      _id: saleId,
      supplier: supplierId
    }).session(session);

    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Sale is already cancelled'
      });
    }

    if (partialRefund && refundAmount) {
      // Partial refund logic
      if (refundAmount > sale.totalAmount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Refund amount cannot exceed sale total'
        });
      }

      // Update sale status to partially refunded
      sale.status = 'partially_refunded';
      sale.notes = sale.notes + `\nPartially refunded on ${new Date().toISOString()}: $${refundAmount}. Reason: ${reason || 'No reason provided'}`;
      
    } else {
      // Full cancellation - restore product quantities
      for (const item of sale.items) {
        const product = await SupplierProduct.findById(item.productId).session(session);
        if (product) {
          product.quantity += item.quantity;
          await product.save({ session });
        }
      }

      // Update sale status
      sale.status = 'cancelled';
      sale.notes = sale.notes + `\nCancelled on ${new Date().toISOString()}: ${reason || 'No reason provided'}`;
    }

    await sale.save({ session });
    await session.commitTransaction();

    console.log(`✅ Sale ${saleId} ${partialRefund ? 'partially refunded' : 'cancelled'} successfully`);

    res.json({
      success: true,
      message: `Sale ${partialRefund ? 'partially refunded' : 'cancelled'} successfully`,
      sale
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error cancelling sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling sale',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// ========== NEW EXPANDED FUNCTIONS ==========

// Get sales analytics with detailed breakdown
exports.getSalesAnalytics = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { timeframe = 'month', groupBy = 'day' } = req.query;

    console.log('Fetching sales analytics for supplier:', supplierId);

    // Calculate date range based on timeframe
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

    // Build group stage based on grouping preference
    let groupStage = {};
    if (groupBy === 'day') {
      groupStage = {
        year: { $year: '$saleDate' },
        month: { $month: '$saleDate' },
        day: { $dayOfMonth: '$saleDate' }
      };
    } else if (groupBy === 'week') {
      groupStage = {
        year: { $year: '$saleDate' },
        week: { $week: '$saleDate' }
      };
    } else if (groupBy === 'month') {
      groupStage = {
        year: { $year: '$saleDate' },
        month: { $month: '$saleDate' }
      };
    }

    const analytics = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupStage,
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          totalDiscounts: { $sum: '$discountAmount' },
          totalTax: { $sum: '$taxAmount' },
          sales: { $push: '$$ROOT' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get top selling products
    const topProducts = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: startDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          totalProfit: { $sum: '$items.profit' },
          averagePrice: { $avg: '$items.unitPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Get customer analytics
    const customerAnalytics = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$customerDetails.name',
          customerEmail: { $first: '$customerDetails.email' },
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          firstPurchase: { $min: '$saleDate' },
          lastPurchase: { $max: '$saleDate' },
          totalProfit: { $sum: '$totalProfit' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 15 }
    ]);

    // Payment method distribution
    const paymentDistribution = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          averageAmount: { $avg: '$totalAmount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        timeline: analytics,
        topProducts,
        customerAnalytics,
        paymentDistribution,
        timeframe,
        groupBy
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export sales data to CSV/Excel
exports.exportSalesData = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { startDate, endDate, format = 'csv', includeItems = false } = req.query;

    console.log('Exporting sales data for supplier:', supplierId);

    const filter = { 
      supplier: supplierId, 
      status: 'completed' 
    };

    // Date range filter
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.saleDate.$lte = end;
      }
    }

    const sales = await SupplierSale.find(filter)
      .populate('items.productId', 'name category sku')
      .sort({ saleDate: -1 });

    if (format === 'json') {
      return res.json({
        success: true,
        data: sales,
        exportInfo: {
          totalSales: sales.length,
          totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
          totalProfit: sales.reduce((sum, sale) => sum + sale.totalProfit, 0),
          dateRange: { startDate, endDate },
          exportedAt: new Date().toISOString()
        }
      });
    }

    // CSV format
    let csvHeaders, csvData;

    if (includeItems) {
      // Detailed export with items
      csvHeaders = [
        'Sale Number',
        'Sale Date',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Product Name',
        'Product Category',
        'Product SKU',
        'Quantity',
        'Unit Price',
        'Total Price',
        'Profit',
        'Profit Margin',
        'Payment Method',
        'Discount Amount',
        'Tax Amount',
        'Total Amount',
        'Status',
        'Notes'
      ];

      csvData = sales.flatMap(sale => 
        sale.items.map(item => [
          sale.saleNumber,
          sale.saleDate.toISOString().split('T')[0],
          sale.customerDetails.name || '',
          sale.customerDetails.email || '',
          sale.customerDetails.phone || '',
          item.productName,
          item.productId?.category || '',
          item.productId?.sku || '',
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.profit,
          item.profitMargin ? `${item.profitMargin.toFixed(2)}%` : '0%',
          sale.paymentMethod,
          sale.discountAmount,
          sale.taxAmount,
          sale.totalAmount,
          sale.status,
          sale.notes || ''
        ])
      );
    } else {
      // Summary export
      csvHeaders = [
        'Sale Number',
        'Sale Date',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Total Amount',
        'Total Profit',
        'Profit Margin',
        'Items Count',
        'Payment Method',
        'Discount Amount',
        'Tax Amount',
        'Status',
        'Notes'
      ];

      csvData = sales.map(sale => [
        sale.saleNumber,
        sale.saleDate.toISOString().split('T')[0],
        sale.customerDetails.name || '',
        sale.customerDetails.email || '',
        sale.customerDetails.phone || '',
        sale.totalAmount,
        sale.totalProfit,
        sale.totalProfitMargin ? `${sale.totalProfitMargin.toFixed(2)}%` : '0%',
        sale.items.reduce((sum, item) => sum + item.quantity, 0),
        sale.paymentMethod,
        sale.discountAmount,
        sale.taxAmount,
        sale.status,
        sale.notes || ''
      ]);
    }

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-export-${Date.now()}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('❌ Error exporting sales data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting sales data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get sales performance metrics
exports.getSalesPerformance = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { period = 'month' } = req.query;

    console.log('Fetching sales performance for supplier:', supplierId);

    const now = new Date();
    let startDate = new Date();
    let previousPeriodStart = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        previousPeriodStart.setDate(now.getDate() - 14);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        previousPeriodStart.setMonth(now.getMonth() - 2);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        previousPeriodStart.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        previousPeriodStart.setFullYear(now.getFullYear() - 2);
        break;
      default:
        startDate = new Date(0);
        previousPeriodStart = new Date(0);
    }

    // Current period stats
    const currentStats = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          totalOrders: { $sum: 1 },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          averageOrderValue: { $avg: '$totalAmount' },
          totalDiscounts: { $sum: '$discountAmount' },
          totalTax: { $sum: '$taxAmount' }
        }
      }
    ]);

    // Previous period stats for comparison
    const previousStats = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: previousPeriodStart, $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          totalOrders: { $sum: 1 },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          averageOrderValue: { $avg: '$totalAmount' },
          totalDiscounts: { $sum: '$discountAmount' },
          totalTax: { $sum: '$taxAmount' }
        }
      }
    ]);

    const current = currentStats[0] || {
      totalSales: 0, totalProfit: 0, totalOrders: 0, totalItems: 0, averageOrderValue: 0, totalDiscounts: 0, totalTax: 0
    };

    const previous = previousStats[0] || {
      totalSales: 0, totalProfit: 0, totalOrders: 0, totalItems: 0, averageOrderValue: 0, totalDiscounts: 0, totalTax: 0
    };

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const performance = {
      currentPeriod: {
        totalSales: current.totalSales,
        totalProfit: current.totalProfit,
        totalOrders: current.totalOrders,
        totalItems: current.totalItems,
        averageOrderValue: current.averageOrderValue,
        totalDiscounts: current.totalDiscounts,
        totalTax: current.totalTax
      },
      previousPeriod: {
        totalSales: previous.totalSales,
        totalProfit: previous.totalProfit,
        totalOrders: previous.totalOrders,
        totalItems: previous.totalItems,
        averageOrderValue: previous.averageOrderValue,
        totalDiscounts: previous.totalDiscounts,
        totalTax: previous.totalTax
      },
      growth: {
        sales: calculateGrowth(current.totalSales, previous.totalSales),
        profit: calculateGrowth(current.totalProfit, previous.totalProfit),
        orders: calculateGrowth(current.totalOrders, previous.totalOrders),
        items: calculateGrowth(current.totalItems, previous.totalItems),
        averageOrderValue: calculateGrowth(current.averageOrderValue, previous.averageOrderValue)
      },
      period: period
    };

    res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('❌ Error fetching sales performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales performance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get low stock alerts with sales impact
exports.getStockAlerts = async (req, res) => {
  try {
    const supplierId = req.user.id;

    console.log('Fetching stock alerts for supplier:', supplierId);

    // Get low stock products
    const lowStockProducts = await SupplierProduct.find({
      supplier: supplierId,
      isActive: true,
      $or: [
        { quantity: 0 },
        { quantity: { $lte: '$lowStockThreshold' } }
      ]
    }).sort({ quantity: 1 });

    // Get sales data for these products
    const productIds = lowStockProducts.map(product => product._id);
    
    const productSales = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          'items.productId': { $in: productIds },
          saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': { $in: productIds }
        }
      },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          averageDailySales: { $avg: '$items.quantity' },
          lastSaleDate: { $max: '$saleDate' },
          totalRevenue: { $sum: '$items.totalPrice' },
          totalProfit: { $sum: '$items.profit' }
        }
      }
    ]);

    // Combine product data with sales data
    const stockAlerts = lowStockProducts.map(product => {
      const salesData = productSales.find(sale => sale._id.equals(product._id));
      const daysOfStock = salesData && salesData.averageDailySales > 0 ? 
        Math.floor(product.quantity / salesData.averageDailySales) : 
        null;

      return {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          currentStock: product.quantity,
          lowStockThreshold: product.lowStockThreshold,
          sellingPrice: product.sellingPrice,
          productionPrice: product.productionPrice,
          measurementUnit: product.measurementUnit
        },
        salesData: salesData || {
          totalSold: 0,
          averageDailySales: 0,
          lastSaleDate: null,
          totalRevenue: 0,
          totalProfit: 0
        },
        alertLevel: product.quantity === 0 ? 'out-of-stock' : 
                   product.quantity <= product.lowStockThreshold ? 'low-stock' : 'adequate',
        daysOfStock,
        urgency: daysOfStock !== null && daysOfStock < 7 ? 'high' : 
                daysOfStock !== null && daysOfStock < 14 ? 'medium' : 'low',
        potentialLoss: salesData ? salesData.averageDailySales * product.profitPerUnit : 0
      };
    });

    res.json({
      success: true,
      stockAlerts,
      summary: {
        totalAlerts: stockAlerts.length,
        outOfStock: stockAlerts.filter(alert => alert.alertLevel === 'out-of-stock').length,
        lowStock: stockAlerts.filter(alert => alert.alertLevel === 'low-stock').length,
        highUrgency: stockAlerts.filter(alert => alert.urgency === 'high').length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching stock alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========== EXTENDED SALES FUNCTIONS ==========

// Get recent sales
exports.getRecentSales = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const limit = parseInt(req.params.limit) || 10;

    const sales = await SupplierSale.find({ 
      supplier: supplierId,
      status: 'completed'
    })
    .populate('items.productId', 'name category images')
    .sort({ saleDate: -1, createdAt: -1 })
    .limit(limit);

    res.json({
      success: true,
      sales,
      total: sales.length
    });

  } catch (error) {
    console.error('❌ Error fetching recent sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent sales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get sales by product
exports.getSalesByProduct = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const sales = await SupplierSale.find({
      supplier: supplierId,
      'items.productId': productId,
      status: 'completed'
    })
    .populate('items.productId', 'name category sku')
    .sort({ saleDate: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SupplierSale.countDocuments({
      supplier: supplierId,
      'items.productId': productId,
      status: 'completed'
    });

    // Calculate product sales summary
    const productSummary = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          'items.productId': new mongoose.Types.ObjectId(productId),
          status: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': new mongoose.Types.ObjectId(productId)
        }
      },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          totalProfit: { $sum: '$items.profit' },
          averagePrice: { $avg: '$items.unitPrice' },
          saleCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      sales,
      summary: productSummary[0] || {},
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalSales: total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching product sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product sales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get customer sales history
exports.getCustomerSalesHistory = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { customerEmail } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const sales = await SupplierSale.find({
      supplier: supplierId,
      'customerDetails.email': customerEmail,
      status: 'completed'
    })
    .populate('items.productId', 'name category images')
    .sort({ saleDate: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SupplierSale.countDocuments({
      supplier: supplierId,
      'customerDetails.email': customerEmail,
      status: 'completed'
    });

    // Calculate customer lifetime value
    const customerStats = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          'customerDetails.email': customerEmail,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$customerDetails.email',
          totalSpent: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          firstPurchase: { $min: '$saleDate' },
          lastPurchase: { $max: '$saleDate' },
          totalItems: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    res.json({
      success: true,
      sales,
      customerStats: customerStats[0] || {},
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customer sales history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer sales history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get sales trends
exports.getSalesTrends = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { timeframe = 'month', trendType = 'revenue' } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
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
        startDate.setMonth(now.getMonth() - 1);
    }

    const trends = await SupplierSale.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'completed',
          saleDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$saleDate"
              }
            }
          },
          dailyRevenue: { $sum: '$totalAmount' },
          dailyProfit: { $sum: '$totalProfit' },
          dailyOrders: { $sum: 1 },
          dailyItems: { $sum: { $sum: '$items.quantity' } },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      trends,
      timeframe,
      trendType
    });

  } catch (error) {
    console.error('❌ Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales trends',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk update sales status
exports.bulkUpdateSalesStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const supplierId = req.user.id;
    const { saleIds, status, reason } = req.body;

    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Please provide valid sale IDs'
      });
    }

    // Verify all sales belong to the supplier
    const sales = await SupplierSale.find({
      _id: { $in: saleIds },
      supplier: supplierId
    }).session(session);

    if (sales.length !== saleIds.length) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Some sales were not found or do not belong to you'
      });
    }

    // Update sales status
    const updateResult = await SupplierSale.updateMany(
      { _id: { $in: saleIds }, supplier: supplierId },
      { 
        $set: { 
          status: status,
          updatedAt: new Date()
        },
        $push: {
          notes: `Bulk status update: ${status} on ${new Date().toISOString()}. Reason: ${reason || 'No reason provided'}`
        }
      },
      { session }
    );

    await session.commitTransaction();

    console.log(`✅ Bulk updated ${updateResult.modifiedCount} sales to status: ${status}`);

    res.json({
      success: true,
      message: `Successfully updated ${updateResult.modifiedCount} sales to ${status}`,
      updatedCount: updateResult.modifiedCount
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error bulk updating sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating sales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};