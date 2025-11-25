// routes/wholesaleSales.js
const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const WholesaleSale = require('../models/WholesaleSale');
const Product = require('../models/Product');
const User = require('../models/User');

const router = express.Router();

// ==================== ENHANCED HEALTH CHECK & DIAGNOSTICS ====================

// GET /api/wholesale-sales/health - Comprehensive system health check
router.get('/health', auth, async (req, res) => {
  try {
    console.log('🏥 Running comprehensive health check...');
    
    const healthReport = {
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        nodeEnv: process.env.NODE_ENV,
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        mongooseState: mongoose.connection.readyState,
        mongooseStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
      },
      user: {
        id: req.user.id,
        role: req.user.role,
        businessName: req.user.businessName
      },
      collections: {},
      recommendations: []
    };

    // Check collections and counts
    try {
      healthReport.collections.sales = await WholesaleSale.countDocuments({ wholesaler: req.user.id });
      healthReport.collections.products = await Product.countDocuments({ wholesaler: req.user.id });
      healthReport.collections.customers = await User.countDocuments({ 
        role: { $in: ['retailer', 'wholesaler'] },
        _id: { $ne: req.user.id }
      });
    } catch (countError) {
      console.warn('Count query warnings:', countError.message);
      healthReport.collections.error = countError.message;
    }

    // Test basic queries
    try {
      const testSale = await WholesaleSale.findOne({ wholesaler: req.user.id }).limit(1);
      healthReport.queryTest = {
        sales: testSale ? 'SUCCESS' : 'NO_DATA',
        canQuery: true
      };
    } catch (queryError) {
      healthReport.queryTest = {
        sales: 'FAILED',
        error: queryError.message,
        canQuery: false
      };
      healthReport.recommendations.push('Database query failed - check collection permissions');
    }

    // Add recommendations
    if (mongoose.connection.readyState !== 1) {
      healthReport.recommendations.push('Database connection is not stable');
    }
    if (healthReport.collections.sales === 0) {
      healthReport.recommendations.push('No sales found - normal for new users');
    }

    console.log('✅ Health check completed');
    res.status(200).json(healthReport);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/test/connection - Test API connection
router.get('/test/connection', auth, async (req, res) => {
  try {
    console.log('🧪 Testing wholesale-sales API connection...');
    
    const result = {
      success: true,
      message: 'Wholesale Sales API is working!',
      user: {
        id: req.user.id,
        role: req.user.role,
        businessName: req.user.businessName
      },
      database: {
        mongooseState: mongoose.connection.readyState,
        salesCount: await WholesaleSale.countDocuments({ wholesaler: req.user.id }),
        productsCount: await Product.countDocuments({ wholesaler: req.user.id })
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Test route error:', error);
    res.status(500).json({
      success: false,
      message: 'Test route failed',
      error: error.message
    });
  }
});

// ==================== ENHANCED DATA FETCHING ROUTES ====================

// GET /api/wholesale-sales - Get all wholesale sales with OPTIMIZED fetching
router.get('/', auth, async (req, res) => {
  try {
    console.log('📊 Fetching wholesale sales for user:', req.user.id);
    
    const { 
      page = 1, 
      limit = 1000,
      startDate, 
      endDate, 
      customerId, 
      status,
      paymentMethod,
      paymentStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minimal = 'false',
      includeProfit = 'false'
    } = req.query;

    // Build optimized filter
    const filter = { wholesaler: req.user.id };
    
    // Date range filter with validation
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start)) filter.saleDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end)) filter.saleDate.$lte = end;
      }
    }
    
    // Customer filter
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }

    // Status filter
    if (status && ['pending', 'completed', 'cancelled', 'refunded'].includes(status)) {
      filter.status = status;
    }

    // Payment method filter
    if (paymentMethod && ['cash', 'mobile_money', 'bank_transfer', 'credit', 'card'].includes(paymentMethod)) {
      filter.paymentMethod = paymentMethod;
    }

    // Payment status filter
    if (paymentStatus && ['pending', 'paid', 'partial'].includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    // Search filter
    if (search && typeof search === 'string' && search.trim().length > 0) {
      filter.$or = [
        { customerName: { $regex: search.trim(), $options: 'i' } },
        { customerPhone: { $regex: search.trim(), $options: 'i' } },
        { referenceNumber: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Select fields based on profit inclusion
    const selectFields = includeProfit === 'true' 
      ? 'referenceNumber customerName customerPhone saleDate paymentMethod paymentStatus subtotal totalDiscount grandTotal amountPaid balanceDue totalCost totalProfit totalProfitPercentage status createdAt items'
      : 'referenceNumber customerName customerPhone saleDate paymentMethod paymentStatus subtotal totalDiscount grandTotal amountPaid balanceDue status createdAt items';

    // Optimize population based on minimal flag
    const populateOptions = minimal === 'true' 
      ? [
          { path: 'customerId', select: 'businessName firstName lastName phone' },
          { path: 'items.productId', select: 'name price measurementUnit sku' }
        ]
      : [
          { path: 'customerId', select: 'businessName firstName lastName phone email address' },
          { path: 'items.productId', select: 'name price costPrice measurementUnit category images sku fromCertifiedOrder' }
        ];

    // Build sort with validation
    const sort = {};
    const allowedSortFields = ['createdAt', 'saleDate', 'grandTotal', 'customerName', 'referenceNumber', 'totalProfit'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    console.log('🔍 Executing optimized query with filter:', JSON.stringify(filter));

    // Execute query with performance optimization
    const query = WholesaleSale.find(filter)
      .select(selectFields)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Apply population
    populateOptions.forEach(populate => query.populate(populate));

    const [wholesaleSales, total] = await Promise.all([
      query.exec(),
      WholesaleSale.countDocuments(filter)
    ]);

    // Calculate basic statistics efficiently
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySalesCount = await WholesaleSale.countDocuments({
      ...filter,
      createdAt: { $gte: today }
    });

    console.log(`✅ Successfully fetched ${wholesaleSales.length} sales out of ${total} total`);

    res.status(200).json({
      success: true,
      wholesaleSales,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      statistics: {
        todaySales: todaySalesCount,
        totalSales: total
      },
      queryInfo: {
        filterApplied: Object.keys(filter).length > 1,
        searchUsed: !!search,
        minimalData: minimal === 'true',
        includeProfit: includeProfit === 'true',
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching wholesale sales:', error);
    
    // Provide specific error messages
    let errorMessage = 'Error fetching wholesale sales';
    let statusCode = 500;
    
    if (error.name === 'CastError') {
      errorMessage = 'Invalid data format in query parameters';
      statusCode = 400;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Query timeout - try reducing date range or limit';
      statusCode = 408;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      query: req.query
    });
  }
});

// GET /api/wholesale-sales/all - Get ALL sales without pagination limits
router.get('/all', auth, async (req, res) => {
  try {
    console.log('📊 Fetching ALL wholesale sales for user:', req.user.id);
    
    const { 
      startDate, 
      endDate, 
      customerId, 
      status,
      paymentMethod,
      paymentStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeProfit = 'false'
    } = req.query;

    // Build optimized filter
    const filter = { wholesaler: req.user.id };
    
    // Date range filter with validation
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start)) filter.saleDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end)) filter.saleDate.$lte = end;
      }
    }
    
    // Customer filter
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }

    // Status filter
    if (status && ['pending', 'completed', 'cancelled', 'refunded'].includes(status)) {
      filter.status = status;
    }

    // Payment method filter
    if (paymentMethod && ['cash', 'mobile_money', 'bank_transfer', 'credit', 'card'].includes(paymentMethod)) {
      filter.paymentMethod = paymentMethod;
    }

    // Payment status filter
    if (paymentStatus && ['pending', 'paid', 'partial'].includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    // Search filter
    if (search && typeof search === 'string' && search.trim().length > 0) {
      filter.$or = [
        { customerName: { $regex: search.trim(), $options: 'i' } },
        { customerPhone: { $regex: search.trim(), $options: 'i' } },
        { referenceNumber: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Select fields based on profit inclusion
    const selectFields = includeProfit === 'true' 
      ? 'referenceNumber customerName customerPhone saleDate paymentMethod paymentStatus subtotal totalDiscount grandTotal amountPaid balanceDue totalCost totalProfit totalProfitPercentage status createdAt items'
      : 'referenceNumber customerName customerPhone saleDate paymentMethod paymentStatus subtotal totalDiscount grandTotal amountPaid balanceDue status createdAt items';

    // Build sort with validation
    const sort = {};
    const allowedSortFields = ['createdAt', 'saleDate', 'grandTotal', 'customerName', 'referenceNumber', 'totalProfit'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    console.log('🔍 Executing ALL sales query with filter:', JSON.stringify(filter));

    // Execute query without limits to get ALL sales
    const wholesaleSales = await WholesaleSale.find(filter)
      .select(selectFields)
      .sort(sort)
      .populate('customerId', 'businessName firstName lastName phone email address')
      .populate('items.productId', 'name price costPrice measurementUnit category images sku fromCertifiedOrder');

    const total = wholesaleSales.length;

    console.log(`✅ Successfully fetched ALL ${total} sales`);

    res.status(200).json({
      success: true,
      wholesaleSales,
      total,
      message: `Retrieved all ${total} sales`,
      queryInfo: {
        filterApplied: Object.keys(filter).length > 1,
        searchUsed: !!search,
        includeProfit: includeProfit === 'true',
        unlimited: true
      }
    });
  } catch (error) {
    console.error('❌ Error fetching ALL wholesale sales:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error fetching all wholesale sales',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/quick/summary - Quick summary for dashboard (ENHANCED to return more sales)
router.get('/quick/summary', auth, async (req, res) => {
  try {
    console.log('🚀 Fetching enhanced quick sales summary...');
    
    const wholesalerId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Parallel execution for performance
    const [todayStats, yesterdayStats, recentSales] = await Promise.all([
      // Today's sales with profit data
      WholesaleSale.aggregate([
        {
          $match: {
            wholesaler: wholesalerId,
            status: 'completed',
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
            cost: { $sum: '$totalCost' },
            profit: { $sum: '$totalProfit' },
            itemsSold: { $sum: { $size: '$items' } }
          }
        }
      ]),
      // Yesterday's sales for comparison
      WholesaleSale.aggregate([
        {
          $match: {
            wholesaler: wholesalerId,
            status: 'completed',
            createdAt: { $gte: yesterday, $lt: today }
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$grandTotal' },
            profit: { $sum: '$totalProfit' }
          }
        }
      ]),
      // Recent sales with profit data
      WholesaleSale.find({ 
        wholesaler: wholesalerId,
        status: 'completed'
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('customerId', 'businessName firstName lastName phone')
      .populate('items.productId', 'name category fromCertifiedOrder')
      .select('referenceNumber customerName grandTotal totalCost totalProfit paymentStatus paymentMethod createdAt items customerId')
      .lean()
    ]);

    const todayData = todayStats[0] || { count: 0, revenue: 0, cost: 0, profit: 0, itemsSold: 0 };
    const yesterdayRevenue = yesterdayStats[0]?.revenue || 0;
    const yesterdayProfit = yesterdayStats[0]?.profit || 0;
    
    // Calculate trends
    const revenueTrend = yesterdayRevenue > 0 ? 
      ((todayData.revenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : 0;
    const profitTrend = yesterdayProfit > 0 ? 
      ((todayData.profit - yesterdayProfit) / yesterdayProfit * 100).toFixed(1) : 0;

    console.log(`✅ Enhanced quick summary generated with ${recentSales.length} recent sales`);

    res.status(200).json({
      success: true,
      summary: {
        today: {
          sales: todayData.count,
          revenue: todayData.revenue,
          cost: todayData.cost,
          profit: todayData.profit,
          itemsSold: todayData.itemsSold,
          revenueTrend: parseFloat(revenueTrend),
          profitTrend: parseFloat(profitTrend)
        },
        recentSales
      },
      generatedAt: new Date().toISOString(),
      salesCount: recentSales.length
    });
  } catch (error) {
    console.error('❌ Error fetching quick summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quick summary',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/extended/summary - Extended summary with more sales
router.get('/extended/summary', auth, async (req, res) => {
  try {
    console.log('📈 Fetching extended sales summary...');
    
    const wholesalerId = req.user.id;
    const limit = parseInt(req.query.limit) || 100;

    const recentSales = await WholesaleSale.find({ 
      wholesaler: wholesalerId,
      status: 'completed'
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customerId', 'businessName firstName lastName phone email')
    .populate('items.productId', 'name price costPrice measurementUnit category fromCertifiedOrder')
    .select('referenceNumber customerName grandTotal totalCost totalProfit paymentStatus paymentMethod createdAt items customerId subtotal totalDiscount')
    .lean();

    // Calculate summary statistics with profit data
    const totalRevenue = recentSales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    const totalCost = recentSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
    const totalProfit = recentSales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    const totalSales = recentSales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    const averageProfit = totalSales > 0 ? totalProfit / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    console.log(`✅ Extended summary generated with ${recentSales.length} sales`);

    res.status(200).json({
      success: true,
      extendedSummary: {
        totalSales,
        totalRevenue,
        totalCost,
        totalProfit,
        averageSale,
        averageProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        recentSales
      },
      limit,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching extended summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching extended summary',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/statistics/overview - Enhanced statistics with profit data
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const wholesalerId = req.user.id;

    console.log(`📈 Fetching statistics for timeframe: ${timeframe}`);

    // Calculate date range
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
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const matchStage = {
      wholesaler: wholesalerId,
      status: 'completed',
      createdAt: { $gte: startDate }
    };

    // Execute all aggregations in parallel for performance
    const [
      statistics,
      paymentMethodStats,
      topProducts,
      certifiedStats,
      profitStats
    ] = await Promise.all([
      // Main statistics
      WholesaleSale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$grandTotal' },
            totalAmountPaid: { $sum: '$amountPaid' },
            totalBalanceDue: { $sum: '$balanceDue' },
            totalDiscount: { $sum: '$totalDiscount' },
            averageSaleValue: { $avg: '$grandTotal' },
            maxSaleValue: { $max: '$grandTotal' },
            minSaleValue: { $min: '$grandTotal' },
            totalItemsSold: { $sum: { $size: '$items' } }
          }
        }
      ]),
      // Payment method statistics
      WholesaleSale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$grandTotal' },
            totalProfit: { $sum: '$totalProfit' }
          }
        }
      ]),
      // Top products with profit data
      WholesaleSale.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            productName: { $first: '$items.productName' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.total' },
            totalCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
            totalProfit: { $sum: '$items.profit' },
            averagePrice: { $avg: '$items.unitPrice' },
            averageCost: { $avg: '$items.costPrice' },
            isCertifiedProduct: { $first: '$items.isCertifiedProduct' }
          }
        },
        {
          $addFields: {
            profitMargin: {
              $cond: {
                if: { $gt: ['$totalRevenue', 0] },
                then: { $multiply: [{ $divide: ['$totalProfit', '$totalRevenue'] }, 100] },
                else: 0
              }
            }
          }
        },
        { $sort: { totalProfit: -1 } },
        { $limit: 10 }
      ]),
      // Certified products statistics
      WholesaleSale.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $match: {
            'items.isCertifiedProduct': true
          }
        },
        {
          $group: {
            _id: null,
            totalCertifiedSales: { $sum: 1 },
            totalCertifiedRevenue: { $sum: '$items.total' },
            totalCertifiedCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
            totalCertifiedProfit: { $sum: '$items.profit' },
            totalCertifiedItems: { $sum: '$items.quantity' }
          }
        }
      ]),
      // Profit statistics
      WholesaleSale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' },
            totalProfit: { $sum: '$totalProfit' },
            averageProfit: { $avg: '$totalProfit' },
            maxProfit: { $max: '$totalProfit' },
            minProfit: { $min: '$totalProfit' },
            averageProfitPercentage: { $avg: '$totalProfitPercentage' }
          }
        }
      ])
    ]);

    const stats = statistics[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalAmountPaid: 0,
      totalBalanceDue: 0,
      totalDiscount: 0,
      averageSaleValue: 0,
      maxSaleValue: 0,
      minSaleValue: 0,
      totalItemsSold: 0
    };

    const certifiedData = certifiedStats[0] || {
      totalCertifiedSales: 0,
      totalCertifiedRevenue: 0,
      totalCertifiedCost: 0,
      totalCertifiedProfit: 0,
      totalCertifiedItems: 0
    };

    const profitData = profitStats[0] || {
      totalCost: 0,
      totalProfit: 0,
      averageProfit: 0,
      maxProfit: 0,
      minProfit: 0,
      averageProfitPercentage: 0
    };

    // Calculate overall profit margin
    const overallProfitMargin = stats.totalRevenue > 0 ? 
      (profitData.totalProfit / stats.totalRevenue) * 100 : 0;

    console.log(`✅ Statistics calculated: ${stats.totalSales} sales, $${stats.totalRevenue} revenue, $${profitData.totalProfit} profit`);

    res.status(200).json({
      success: true,
      statistics: {
        ...stats,
        ...certifiedData,
        ...profitData,
        overallProfitMargin: parseFloat(overallProfitMargin.toFixed(2)),
        timeframe: timeframe,
        paymentMethodStats,
        topProducts
      }
    });
  } catch (error) {
    console.error('❌ Error fetching sales statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales statistics',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/profit/analysis - Detailed profit analysis
router.get('/profit/analysis', auth, async (req, res) => {
  try {
    const { timeframe = 'month', groupBy = 'day' } = req.query;
    const wholesalerId = req.user.id;

    console.log(`💰 Fetching profit analysis for timeframe: ${timeframe}`);

    // Calculate date range
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
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const matchStage = {
      wholesaler: wholesalerId,
      status: 'completed',
      createdAt: { $gte: startDate }
    };

    // Get profit statistics using model method
    const profitStats = await WholesaleSale.getProfitStatistics(wholesalerId, timeframe);
    const productProfitAnalysis = await WholesaleSale.getProductProfitAnalysis(wholesalerId, timeframe);

    // Get daily/weekly/monthly profit trends
    let groupStage = {};
    switch (groupBy) {
      case 'week':
        groupStage = {
          year: { $year: '$saleDate' },
          week: { $week: '$saleDate' }
        };
        break;
      case 'month':
        groupStage = {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' }
        };
        break;
      default: // day
        groupStage = {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' }
        };
    }

    const profitTrends = await WholesaleSale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupStage,
          date: { $first: '$saleDate' },
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$totalProfit' },
          averageProfitMargin: { $avg: '$totalProfitPercentage' }
        }
      },
      {
        $addFields: {
          profitMargin: {
            $cond: {
              if: { $gt: ['$totalRevenue', 0] },
              then: { $multiply: [{ $divide: ['$totalProfit', '$totalRevenue'] }, 100] },
              else: 0
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 }
    ]);

    const stats = profitStats[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      averageProfitMargin: 0,
      averageProfitPercentage: 0,
      mostProfitableSale: 0,
      leastProfitableSale: 0
    };

    console.log(`✅ Profit analysis completed: $${stats.totalProfit} total profit`);

    res.status(200).json({
      success: true,
      profitAnalysis: {
        summary: stats,
        productAnalysis: productProfitAnalysis,
        trends: profitTrends,
        timeframe,
        groupBy
      }
    });
  } catch (error) {
    console.error('❌ Error fetching profit analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profit analysis',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/batch/dates - Get sales by date ranges (for charts)
router.get('/batch/dates', auth, async (req, res) => {
  try {
    const { groupBy = 'day', limit = 30, includeProfit = 'false' } = req.query;
    const wholesalerId = req.user.id;

    console.log(`📅 Fetching sales data grouped by: ${groupBy}`);

    let groupStage = {};
    switch (groupBy) {
      case 'week':
        groupStage = {
          year: { $year: '$saleDate' },
          week: { $week: '$saleDate' }
        };
        break;
      case 'month':
        groupStage = {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' }
        };
        break;
      default: // day
        groupStage = {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' }
        };
    }

    const groupFields = {
      _id: groupStage,
      date: { $first: '$saleDate' },
      salesCount: { $sum: 1 },
      totalRevenue: { $sum: '$grandTotal' },
      averageSale: { $avg: '$grandTotal' }
    };

    // Add profit fields if requested
    if (includeProfit === 'true') {
      groupFields.totalCost = { $sum: '$totalCost' };
      groupFields.totalProfit = { $sum: '$totalProfit' };
      groupFields.averageProfitMargin = { $avg: '$totalProfitPercentage' };
    }

    const salesByDate = await WholesaleSale.aggregate([
      {
        $match: {
          wholesaler: wholesalerId,
          status: 'completed',
          saleDate: { $exists: true }
        }
      },
      {
        $group: groupFields
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: parseInt(limit) }
    ]);

    console.log(`✅ Fetched ${salesByDate.length} date groups`);

    res.status(200).json({
      success: true,
      salesByDate,
      groupBy,
      includeProfit: includeProfit === 'true',
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('❌ Error fetching sales by date:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales by date',
      error: error.message
    });
  }
});

// ==================== SINGLE SALE OPERATIONS ====================

// GET /api/wholesale-sales/:id - Get single sale with full details including profit data
router.get('/:id', auth, async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log(`🔍 Fetching sale details for: ${saleId}`);

    const wholesaleSale = await WholesaleSale.findOne({
      _id: saleId,
      wholesaler: req.user.id
    })
    .populate('customerId', 'businessName firstName lastName phone email address createdAt')
    .populate('items.productId', 'name price costPrice measurementUnit category images description sku fromCertifiedOrder certifiedOrderSource')
    .populate('wholesaler', 'businessName firstName lastName phone email address');

    if (!wholesaleSale) {
      console.log(`❌ Sale not found: ${saleId}`);
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // Add customer details to response
    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    console.log(`✅ Sale details retrieved: ${saleWithCustomerDetails.referenceNumber}`);

    res.status(200).json({
      success: true,
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('❌ Error fetching wholesale sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wholesale sale',
      error: error.message
    });
  }
});

// POST /api/wholesale-sales - Create new wholesale sale with cost price and profit tracking
router.post('/', auth, async (req, res) => {
  try {
    console.log('🎯 Creating new wholesale sale...');
    
    const {
      customerType,
      customerId,
      customerInfo,
      customerName,
      saleDate,
      saleTime,
      paymentMethod,
      paymentStatus,
      saleNotes,
      items,
      subtotal,
      totalDiscount,
      grandTotal,
      amountPaid,
      balanceDue,
      referenceNumber,
      isWalkInCustomer = false,
      operationMode = 'online',
      syncStatus = 'synced'
    } = req.body;

    // Validate required fields
    if (!referenceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Reference number is required'
      });
    }

    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and at least one sale item are required'
      });
    }

    // Process customer information
    let customerDetails = {};
    let finalCustomerId = null;
    let finalCustomerType = customerType;

    if (isWalkInCustomer) {
      finalCustomerType = 'walk-in';
      customerDetails = {
        customerName: 'Walk-in Customer',
        customerPhone: '0000000000',
        customerEmail: '',
        customerAddress: '',
        customerBusinessName: 'Walk-in Customer'
      };
    } else if (customerType === 'existing') {
      const existingCustomer = await User.findOne({
        _id: customerId,
        role: { $in: ['retailer', 'wholesaler'] }
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      finalCustomerId = customerId;
      customerDetails = {
        customerName: existingCustomer.businessName || `${existingCustomer.firstName} ${existingCustomer.lastName}`,
        customerPhone: existingCustomer.phone,
        customerEmail: existingCustomer.email,
        customerAddress: existingCustomer.address,
        customerBusinessName: existingCustomer.businessName
      };
    } else {
      if (!customerInfo?.name || !customerInfo?.phone) {
        return res.status(400).json({
          success: false,
          message: 'New customer requires name and phone number'
        });
      }

      customerDetails = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        customerAddress: customerInfo.address,
        customerBusinessName: customerInfo.businessName,
        customerInfo: customerInfo
      };
    }

    // Validate products and quantities with cost price validation
    const productUpdates = [];
    for (const item of items) {
      let product = await Product.findOne({
        _id: item.productId,
        wholesaler: req.user.id
      });

      if (!product) {
        // Try alternative lookup methods
        product = await Product.findOne({
          $or: [
            { sku: item.productId, wholesaler: req.user.id },
            { name: item.productName, wholesaler: req.user.id }
          ]
        });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productName || item.productId}`
        });
      }

      // Validate cost price exists
      if (!item.costPrice && item.costPrice !== 0) {
        return res.status(400).json({
          success: false,
          message: `Cost price is required for ${product.name}`,
          productId: product._id,
          productName: product.name
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        });
      }

      // Validate certified product pricing
      if (product.fromCertifiedOrder && item.unitPrice < item.costPrice) {
        return res.status(400).json({
          success: false,
          message: `Certified product "${product.name}" selling price cannot be less than cost price ($${item.costPrice})`,
          productId: product._id,
          productName: product.name,
          costPrice: item.costPrice,
          sellingPrice: item.unitPrice
        });
      }

      productUpdates.push({ product, item, oldQuantity: product.quantity });
    }

    // Update product quantities
    for (const update of productUpdates) {
      const { product, item } = update;
      product.quantity -= item.quantity;
      await product.save();
    }

    // Create sale record with cost price and profit data
    const saleData = {
      customerType: finalCustomerType,
      customerId: finalCustomerId,
      customerInfo: customerType === 'new' && !isWalkInCustomer ? customerInfo : undefined,
      ...customerDetails,
      referenceNumber,
      saleDate: saleDate || new Date(),
      saleTime,
      paymentMethod,
      paymentStatus,
      saleNotes,
      items: items.map(item => ({
        ...item,
        // Ensure all item fields are properly formatted including cost price and profit
        productId: item.productId,
        productName: item.productName,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        costPrice: parseFloat(item.costPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        total: parseFloat(item.total) || 0,
        profit: parseFloat(item.profit) || 0,
        isCertifiedProduct: item.isCertifiedProduct || false,
        profitMargin: parseFloat(item.profitMargin) || 0,
        profitPercentage: parseFloat(item.profitPercentage) || 0
      })),
      subtotal: parseFloat(subtotal) || 0,
      totalDiscount: parseFloat(totalDiscount) || 0,
      grandTotal: parseFloat(grandTotal) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      balanceDue: parseFloat(balanceDue) || 0,
      totalCost: parseFloat(items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0)) || 0,
      totalProfit: parseFloat(items.reduce((sum, item) => sum + (item.profit || 0), 0)) || 0,
      wholesaler: req.user.id,
      operationMode,
      syncStatus
    };

    const wholesaleSale = new WholesaleSale(saleData);
    await wholesaleSale.save();

    // Populate for response
    await wholesaleSale.populate('customerId', 'businessName firstName lastName phone email address');
    await wholesaleSale.populate('items.productId', 'name price costPrice measurementUnit category images sku fromCertifiedOrder');

    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    console.log('✅ Sale created successfully:', wholesaleSale.referenceNumber);
    console.log('💰 Profit Summary:', {
      totalCost: wholesaleSale.totalCost,
      totalProfit: wholesaleSale.totalProfit,
      profitPercentage: wholesaleSale.totalProfitPercentage
    });

    res.status(201).json({
      success: true,
      message: 'Wholesale sale created successfully',
      wholesaleSale: saleWithCustomerDetails,
      profitSummary: {
        totalCost: wholesaleSale.totalCost,
        totalProfit: wholesaleSale.totalProfit,
        profitPercentage: wholesaleSale.totalProfitPercentage
      }
    });
  } catch (error) {
    console.error('❌ Error creating wholesale sale:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating wholesale sale',
      error: error.message
    });
  }
});

// ==================== UTILITY ROUTES ====================

// GET /api/wholesale-sales/customer/:customerId - Get customer sales
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const { page = 1, limit = 50, includeProfit = 'false' } = req.query;

    console.log(`👤 Fetching sales for customer: ${customerId}`);
    
    const selectFields = includeProfit === 'true' 
      ? 'referenceNumber customerName saleDate paymentMethod paymentStatus grandTotal totalCost totalProfit status createdAt items'
      : 'referenceNumber customerName saleDate paymentMethod paymentStatus grandTotal status createdAt items';

    const wholesaleSales = await WholesaleSale.find({
      wholesaler: req.user.id,
      $or: [
        { customerId: customerId },
        { 'customerInfo.phone': customerId }
      ]
    })
    .select(selectFields)
    .sort({ createdAt: -1 })
    .populate('items.productId', 'name price costPrice measurementUnit category images fromCertifiedOrder')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await WholesaleSale.countDocuments({
      wholesaler: req.user.id,
      $or: [
        { customerId: customerId },
        { 'customerInfo.phone': customerId }
      ]
    });

    const salesWithCustomerDetails = wholesaleSales.map(sale => ({
      ...sale.toObject(),
      customerDetails: sale.customerDetails
    }));

    console.log(`✅ Found ${wholesaleSales.length} sales for customer ${customerId}`);

    res.status(200).json({
      success: true,
      wholesaleSales: salesWithCustomerDetails,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      includeProfit: includeProfit === 'true'
    });
  } catch (error) {
    console.error('❌ Error fetching customer sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer sales',
      error: error.message
    });
  }
});

// PUT /api/wholesale-sales/:id - Update sale
router.put('/:id', auth, async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log(`✏️ Updating sale: ${saleId}`);

    const wholesaleSale = await WholesaleSale.findOne({
      _id: saleId,
      wholesaler: req.user.id
    });

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    const allowedUpdates = ['paymentStatus', 'amountPaid', 'balanceDue', 'saleNotes', 'status', 'syncStatus'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedSale = await WholesaleSale.findByIdAndUpdate(
      saleId,
      updates,
      { new: true, runValidators: true }
    )
    .populate('customerId', 'businessName firstName lastName phone email address')
    .populate('items.productId', 'name price costPrice measurementUnit category images fromCertifiedOrder');

    const saleWithCustomerDetails = {
      ...updatedSale.toObject(),
      customerDetails: updatedSale.customerDetails
    };

    console.log(`✅ Sale updated successfully: ${saleId}`);

    res.status(200).json({
      success: true,
      message: 'Wholesale sale updated successfully',
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('❌ Error updating wholesale sale:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating wholesale sale',
      error: error.message
    });
  }
});

// PUT /api/wholesale-sales/:id/recalculate-profits - Recalculate profit metrics for a sale
router.put('/:id/recalculate-profits', auth, async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log(`🧮 Recalculating profits for sale: ${saleId}`);

    const wholesaleSale = await WholesaleSale.findOne({
      _id: saleId,
      wholesaler: req.user.id
    });

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // Recalculate profits using the model method
    await wholesaleSale.recalculateProfits();

    // Repopulate for response
    await wholesaleSale.populate('customerId', 'businessName firstName lastName phone email address');
    await wholesaleSale.populate('items.productId', 'name price costPrice measurementUnit category images fromCertifiedOrder');

    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    console.log(`✅ Profits recalculated for sale: ${saleId}`);
    console.log('💰 Updated Profit Summary:', {
      totalCost: wholesaleSale.totalCost,
      totalProfit: wholesaleSale.totalProfit,
      profitPercentage: wholesaleSale.totalProfitPercentage
    });

    res.status(200).json({
      success: true,
      message: 'Profit metrics recalculated successfully',
      wholesaleSale: saleWithCustomerDetails,
      profitSummary: {
        totalCost: wholesaleSale.totalCost,
        totalProfit: wholesaleSale.totalProfit,
        profitPercentage: wholesaleSale.totalProfitPercentage
      }
    });
  } catch (error) {
    console.error('❌ Error recalculating profits:', error);
    res.status(400).json({
      success: false,
      message: 'Error recalculating profit metrics',
      error: error.message
    });
  }
});

// DELETE /api/wholesale-sales/:id - Delete sale
router.delete('/:id', auth, async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log(`🗑️ Deleting sale: ${saleId}`);

    const wholesaleSale = await WholesaleSale.findOne({
      _id: saleId,
      wholesaler: req.user.id
    });

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // Restore product quantities
    for (const item of wholesaleSale.items) {
      const product = await Product.findOne({
        _id: item.productId,
        wholesaler: req.user.id
      });

      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }

    await WholesaleSale.findByIdAndDelete(saleId);

    console.log(`✅ Sale deleted successfully: ${saleId}`);

    res.status(200).json({
      success: true,
      message: 'Wholesale sale deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting wholesale sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting wholesale sale',
      error: error.message
    });
  }
});

// ==================== EXPORT ROUTES ====================

// GET /api/wholesale-sales/export/csv - Export sales as CSV with profit data
router.get('/export/csv', auth, async (req, res) => {
  try {
    const { startDate, endDate, includeProfit = 'false' } = req.query;
    
    const filter = { wholesaler: req.user.id };
    
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }

    const sales = await WholesaleSale.find(filter)
      .populate('customerId', 'businessName phone')
      .populate('items.productId', 'name sku costPrice')
      .sort({ saleDate: -1 });

    let csv = '';
    
    if (includeProfit === 'true') {
      // CSV with profit data
      csv = 'Reference Number,Date,Customer,Phone,Product,Quantity,Cost Price,Unit Price,Total,Profit,Profit Margin %,Payment Method,Payment Status\n';
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const profitMargin = item.costPrice > 0 ? ((item.unitPrice - item.costPrice) / item.costPrice * 100).toFixed(2) : '0';
          csv += `"${sale.referenceNumber}","${sale.saleDate.toISOString().split('T')[0]}","${sale.customerName}","${sale.customerPhone}","${item.productName}",${item.quantity},${item.costPrice},${item.unitPrice},${item.total},${item.profit},${profitMargin},"${sale.paymentMethod}","${sale.paymentStatus}"\n`;
        });
      });
    } else {
      // Basic CSV without profit data
      csv = 'Reference Number,Date,Customer,Phone,Product,Quantity,Unit Price,Total,Payment Method,Payment Status\n';
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          csv += `"${sale.referenceNumber}","${sale.saleDate.toISOString().split('T')[0]}","${sale.customerName}","${sale.customerPhone}","${item.productName}",${item.quantity},${item.unitPrice},${item.total},"${sale.paymentMethod}","${sale.paymentStatus}"\n`;
        });
      });
    }

    const filename = includeProfit === 'true' 
      ? `sales-with-profit-export-${new Date().toISOString().split('T')[0]}.csv`
      : `sales-export-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting sales CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting sales data',
      error: error.message
    });
  }
});

module.exports = router;