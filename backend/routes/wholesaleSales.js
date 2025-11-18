// routes/wholesaleSales.js
const express = require('express');
const auth = require('../middleware/auth');
const WholesaleSale = require('../models/WholesaleSale');
const Product = require('../models/Product');
const User = require('../models/User'); // For existing customers

const router = express.Router();

// GET /api/wholesale-sales - Get all wholesale sales for wholesaler with enhanced filtering
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      customerId, 
      status,
      paymentMethod,
      paymentStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filter = { wholesaler: req.user.id };
    
    // Date range filter
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }
    
    // Customer filter
    if (customerId) {
      filter.customerId = customerId;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Payment method filter
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Payment status filter
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { customerBusinessName: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { saleNotes: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const wholesaleSales = await WholesaleSale.find(filter)
      .sort(sort)
      .populate('customerId', 'businessName firstName lastName phone email address')
      .populate('items.productId', 'name price measurementUnit category images sku fromCertifiedOrder')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WholesaleSale.countDocuments(filter);

    // Calculate additional statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySales = await WholesaleSale.countDocuments({
      ...filter,
      createdAt: { $gte: today }
    });

    const totalRevenue = await WholesaleSale.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    res.status(200).json({
      success: true,
      wholesaleSales,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      statistics: {
        todaySales,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching wholesale sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wholesale sales',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/statistics - Get comprehensive sales statistics
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const wholesalerId = req.user.id;

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
        startDate = new Date(0); // All time
    }

    const matchStage = {
      wholesaler: wholesalerId,
      status: 'completed',
      createdAt: { $gte: startDate }
    };

    // Main statistics
    const statistics = await WholesaleSale.aggregate([
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
    ]);

    // Sales by payment method
    const paymentMethodStats = await WholesaleSale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' },
          percentage: { $avg: 1 }
        }
      }
    ]);

    // Sales by payment status
    const paymentStatusStats = await WholesaleSale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    // Top selling products
    const topProducts = await WholesaleSale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          averagePrice: { $avg: '$items.unitPrice' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    // Monthly sales trend
    const monthlyTrend = await WholesaleSale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          averageSale: { $avg: '$grandTotal' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
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

    res.status(200).json({
      success: true,
      statistics: {
        ...stats,
        timeframe: timeframe,
        paymentMethodStats,
        paymentStatusStats,
        topProducts,
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Error fetching sales statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales statistics',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/recent - Get recent sales activity
router.get('/recent/activity', auth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentSales = await WholesaleSale.find({
      wholesaler: req.user.id,
      status: 'completed'
    })
    .populate('customerId', 'businessName firstName lastName')
    .populate('items.productId', 'name category measurementUnit fromCertifiedOrder')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('referenceNumber customerName grandTotal paymentStatus paymentMethod createdAt items');

    res.status(200).json({
      success: true,
      recentSales
    });
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent sales',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/:id - Get single wholesale sale with full details
router.get('/:id', auth, async (req, res) => {
  try {
    const wholesaleSale = await WholesaleSale.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    })
    .populate('customerId', 'businessName firstName lastName phone email address createdAt')
    .populate('items.productId', 'name price costPrice measurementUnit category images description sku fromCertifiedOrder certifiedOrderSource')
    .populate('wholesaler', 'businessName firstName lastName phone email address');

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // Add customer details to the response
    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    res.status(200).json({
      success: true,
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('Error fetching wholesale sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wholesale sale',
      error: error.message
    });
  }
});

// POST /api/wholesale-sales - Create new wholesale sale with enhanced product handling
router.post('/', auth, async (req, res) => {
  try {
    // ✅ ADD DEBUG LOGS TO SEE WHAT'S BEING RECEIVED
    console.log('📥 BACKEND - Received sale data:', JSON.stringify(req.body, null, 2));
    console.log('🔍 BACKEND - Reference number received:', req.body.referenceNumber);
    console.log('🔍 BACKEND - Has referenceNumber:', !!req.body.referenceNumber);
    
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
      referenceNumber, // ✅ CRITICAL FIX: ADD referenceNumber TO DESTRUCTURING
      isWalkInCustomer = false
    } = req.body;

    // ✅ VALIDATE referenceNumber EXISTS
    if (!referenceNumber) {
      console.error('❌ BACKEND - referenceNumber is missing after destructuring!');
      return res.status(400).json({
        success: false,
        message: 'Reference number is required',
        error: 'WholesaleSale validation failed: referenceNumber: Path `referenceNumber` is required.'
      });
    }

    console.log('✅ BACKEND - referenceNumber after destructuring:', referenceNumber);

    // Validate required fields
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and at least one sale item are required'
      });
    }

    let customerDetails = {};
    let finalCustomerId = null;
    let finalCustomerType = customerType;

    // Handle walk-in customers
    if (isWalkInCustomer) {
      finalCustomerType = 'walk-in';
      customerDetails = {
        customerName: 'Walk-in Customer',
        customerPhone: '0000000000',
        customerEmail: '',
        customerAddress: '',
        customerBusinessName: 'Walk-in Customer'
      };
    }
    // Handle customer based on type
    else if (customerType === 'existing') {
      // Verify existing customer exists
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
      // New customer - validate required fields
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

    // Enhanced product availability check for both regular and certified products
    const productUpdates = [];
    for (const item of items) {
      // Try to find product by ID first
      let product = await Product.findOne({
        _id: item.productId,
        wholesaler: req.user.id
      });

      // If not found by ID, try by SKU (for certified products)
      if (!product) {
        product = await Product.findOne({
          sku: item.productId,
          wholesaler: req.user.id
        });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productName || item.productId}`
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        });
      }

      // Track product update for batch processing
      productUpdates.push({
        product,
        item,
        oldQuantity: product.quantity
      });
    }

    // Process all product updates
    for (const update of productUpdates) {
      const { product, item, oldQuantity } = update;
      
      // Update product quantity
      product.quantity = oldQuantity - item.quantity;
      
      // Track price change if selling price is different from current price
      if (item.unitPrice !== product.price) {
        product.updatePrice(
          item.unitPrice,
          req.user.id,
          'Sale price adjustment',
          referenceNumber,
          'sale',
          `Price changed during sale to ${customerName}`
        );
      } else {
        await product.save();
      }
    }

    // ✅ CRITICAL FIX: INCLUDE referenceNumber IN saleData
    const saleData = {
      customerType: finalCustomerType,
      customerId: finalCustomerId,
      customerInfo: customerType === 'new' && !isWalkInCustomer ? customerInfo : undefined,
      ...customerDetails,
      referenceNumber, // ✅ ADD THIS - WAS MISSING!
      saleDate: saleDate || new Date(),
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
      wholesaler: req.user.id
    };

    console.log('✅ BACKEND - Final saleData with referenceNumber:', saleData.referenceNumber);

    const wholesaleSale = new WholesaleSale(saleData);
    await wholesaleSale.save();

    // Populate the sale with all details
    await wholesaleSale.populate('customerId', 'businessName firstName lastName phone email address');
    await wholesaleSale.populate('items.productId', 'name price measurementUnit category images sku fromCertifiedOrder');
    await wholesaleSale.populate('wholesaler', 'businessName firstName lastName phone email address');

    // Add customer details to response
    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    res.status(201).json({
      success: true,
      message: 'Wholesale sale created successfully',
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('❌ BACKEND - Error creating wholesale sale:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating wholesale sale',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/customer/:customerId - Get sales for specific customer
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const wholesaleSales = await WholesaleSale.find({
      wholesaler: req.user.id,
      $or: [
        { customerId: req.params.customerId },
        { 'customerInfo.phone': req.params.customerId } // Also search by phone for new customers
      ]
    })
    .sort({ createdAt: -1 })
    .populate('items.productId', 'name price measurementUnit category images sku fromCertifiedOrder')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await WholesaleSale.countDocuments({
      wholesaler: req.user.id,
      $or: [
        { customerId: req.params.customerId },
        { 'customerInfo.phone': req.params.customerId }
      ]
    });

    // Calculate customer lifetime value
    const customerLifetimeValue = await WholesaleSale.aggregate([
      {
        $match: {
          wholesaler: req.user.id,
          $or: [
            { customerId: new mongoose.Types.ObjectId(req.params.customerId) },
            { 'customerInfo.phone': req.params.customerId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$grandTotal' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$grandTotal' }
        }
      }
    ]);

    // Add customer details to each sale
    const salesWithCustomerDetails = wholesaleSales.map(sale => ({
      ...sale.toObject(),
      customerDetails: sale.customerDetails
    }));

    res.status(200).json({
      success: true,
      wholesaleSales: salesWithCustomerDetails,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      customerStats: customerLifetimeValue[0] || {
        totalSpent: 0,
        totalOrders: 0,
        averageOrderValue: 0
      }
    });
  } catch (error) {
    console.error('Error fetching customer sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer sales',
      error: error.message
    });
  }
});

// PUT /api/wholesale-sales/:id - Update wholesale sale with enhanced validation
router.put('/:id', auth, async (req, res) => {
  try {
    const wholesaleSale = await WholesaleSale.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    });

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // For simplicity, we'll only allow updating certain fields
    const allowedUpdates = ['paymentStatus', 'amountPaid', 'balanceDue', 'saleNotes', 'status'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Validate payment status transitions
    if (updates.paymentStatus && wholesaleSale.paymentStatus !== updates.paymentStatus) {
      const validTransitions = {
        'pending': ['paid', 'partial'],
        'partial': ['paid'],
        'paid': [] // Once paid, cannot go back
      };

      if (!validTransitions[wholesaleSale.paymentStatus]?.includes(updates.paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment status transition from ${wholesaleSale.paymentStatus} to ${updates.paymentStatus}`
        });
      }
    }

    // Update amount paid and balance due based on payment status
    if (updates.paymentStatus === 'paid') {
      updates.amountPaid = wholesaleSale.grandTotal;
      updates.balanceDue = 0;
    } else if (updates.paymentStatus === 'partial' && updates.amountPaid) {
      updates.balanceDue = wholesaleSale.grandTotal - updates.amountPaid;
    }

    const updatedSale = await WholesaleSale.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('customerId', 'businessName firstName lastName phone email address')
    .populate('items.productId', 'name price measurementUnit category images sku fromCertifiedOrder')
    .populate('wholesaler', 'businessName firstName lastName phone email address');

    // Add customer details to response
    const saleWithCustomerDetails = {
      ...updatedSale.toObject(),
      customerDetails: updatedSale.customerDetails
    };

    res.status(200).json({
      success: true,
      message: 'Wholesale sale updated successfully',
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('Error updating wholesale sale:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating wholesale sale',
      error: error.message
    });
  }
});

// DELETE /api/wholesale-sales/:id - Delete wholesale sale with enhanced product restoration
router.delete('/:id', auth, async (req, res) => {
  try {
    const wholesaleSale = await WholesaleSale.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    });

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // Enhanced product quantity restoration for both regular and certified products
    const restorationResults = [];
    for (const item of wholesaleSale.items) {
      // Find product by ID or SKU
      let product = await Product.findOne({
        _id: item.productId,
        wholesaler: req.user.id
      });

      if (!product) {
        // Try finding by SKU for certified products
        product = await Product.findOne({
          sku: item.productId,
          wholesaler: req.user.id
        });
      }

      if (product) {
        const oldQuantity = product.quantity;
        product.quantity += item.quantity;
        await product.save();
        
        restorationResults.push({
          productName: product.name,
          productId: product._id,
          restoredQuantity: item.quantity,
          newQuantity: product.quantity
        });
      } else {
        restorationResults.push({
          productName: item.productName,
          productId: item.productId,
          error: 'Product not found for restoration'
        });
      }
    }

    await WholesaleSale.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Wholesale sale deleted successfully',
      restorationResults,
      deletedSale: {
        referenceNumber: wholesaleSale.referenceNumber,
        customerName: wholesaleSale.customerName,
        grandTotal: wholesaleSale.grandTotal
      }
    });
  } catch (error) {
    console.error('Error deleting wholesale sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting wholesale sale',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/dashboard/summary - Get dashboard summary
router.get('/dashboard/summary', auth, async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Today's sales
    const todaySales = await WholesaleSale.aggregate([
      {
        $match: {
          wholesaler: wholesalerId,
          status: 'completed',
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$grandTotal' },
          itemsSold: { $sum: { $size: '$items' } }
        }
      }
    ]);

    // Yesterday's sales for comparison
    const yesterdaySales = await WholesaleSale.aggregate([
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
          revenue: { $sum: '$grandTotal' }
        }
      }
    ]);

    // This month sales
    const thisMonthSales = await WholesaleSale.aggregate([
      {
        $match: {
          wholesaler: wholesalerId,
          status: 'completed',
          createdAt: { $gte: thisMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$grandTotal' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Last month sales
    const lastMonthSales = await WholesaleSale.aggregate([
      {
        $match: {
          wholesaler: wholesalerId,
          status: 'completed',
          createdAt: { $gte: lastMonthStart, $lt: thisMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$grandTotal' }
        }
      }
    ]);

    // Pending payments
    const pendingPayments = await WholesaleSale.aggregate([
      {
        $match: {
          wholesaler: wholesalerId,
          paymentStatus: { $in: ['pending', 'partial'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balanceDue' },
          count: { $sum: 1 }
        }
      }
    ]);

    const todayData = todaySales[0] || { count: 0, revenue: 0, itemsSold: 0 };
    const yesterdayRevenue = yesterdaySales[0]?.revenue || 0;
    const thisMonthData = thisMonthSales[0] || { revenue: 0, count: 0 };
    const lastMonthRevenue = lastMonthSales[0]?.revenue || 0;
    const pendingData = pendingPayments[0] || { totalBalance: 0, count: 0 };

    // Calculate trends
    const revenueTrend = yesterdayRevenue > 0 ? 
      ((todayData.revenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : 0;
    
    const monthlyTrend = lastMonthRevenue > 0 ? 
      ((thisMonthData.revenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      summary: {
        today: {
          sales: todayData.count,
          revenue: todayData.revenue,
          itemsSold: todayData.itemsSold,
          revenueTrend: parseFloat(revenueTrend)
        },
        thisMonth: {
          sales: thisMonthData.count,
          revenue: thisMonthData.revenue,
          monthlyTrend: parseFloat(monthlyTrend)
        },
        pendingPayments: {
          count: pendingData.count,
          totalBalance: pendingData.totalBalance
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
});

module.exports = router;