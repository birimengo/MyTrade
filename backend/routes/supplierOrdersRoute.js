// backend/routes/supplierOrders.js
const express = require('express');
const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');
const SupplierProduct = require('../models/SupplierProduct');
const User = require('../models/User');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected and require authentication
router.use(auth);

// GET /api/supplier/orders - Get all orders for supplier with advanced filtering including wholesaler filtering
router.get('/', async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { 
      status, 
      page = 1, 
      limit = 10, 
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      wholesalerId // New parameter to filter by specific wholesaler
    } = req.query;

    console.log('Fetching supplier orders with filters:', {
      supplierId,
      status,
      wholesalerId,
      page,
      limit,
      search,
      dateFrom,
      dateTo
    });

    // Build query
    const query = { supplier: supplierId };
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Wholesaler filter - NEW: Filter by specific wholesaler
    if (wholesalerId && wholesalerId !== 'undefined') {
      if (mongoose.Types.ObjectId.isValid(wholesalerId)) {
        query.wholesaler = new mongoose.Types.ObjectId(wholesalerId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid wholesaler ID format'
        });
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'wholesaler.businessName': { $regex: search, $options: 'i' } },
        { 'items.product.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get orders with pagination and advanced population
    const orders = await WholesalerOrderToSupplier.find(query)
      .populate({
        path: 'wholesaler',
        select: 'businessName firstName lastName email phone avatar address city',
        model: 'User'
      })
      .populate({
        path: 'items.product',
        select: 'name description images measurementUnit category sku productionStatus',
        model: 'SupplierProduct'
      })
      .populate({
        path: 'assignedTransporter',
        select: 'firstName lastName businessName email phone vehicleType companyName isOnline lastSeen',
        model: 'User'
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    console.log(`Found ${orders.length} orders for supplier`);

    // Enhance orders with additional product image data
    const enhancedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        product: item.product ? {
          ...item.product,
          primaryImage: item.product.images && item.product.images.length > 0 
            ? item.product.images[0] 
            : null,
          imageCount: item.product.images ? item.product.images.length : 0
        } : null
      }))
    }));

    const total = await WholesalerOrderToSupplier.countDocuments(query);

    // Get comprehensive statistics including new status
    const statistics = await WholesalerOrderToSupplier.aggregate([
      { $match: { supplier: new mongoose.Types.ObjectId(supplierId) } },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$finalAmount' }
              }
            }
          ],
          overallStats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalRevenue: { $sum: '$finalAmount' },
                averageOrderValue: { $avg: '$finalAmount' },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
                in_production: { $sum: { $cond: [{ $eq: ['$status', 'in_production'] }, 1, 0] } },
                ready_for_delivery: { $sum: { $cond: [{ $eq: ['$status', 'ready_for_delivery'] }, 1, 0] } },
                assigned_to_transporter: { $sum: { $cond: [{ $eq: ['$status', 'assigned_to_transporter'] }, 1, 0] } },
                shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
                delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
              }
            }
          ],
          recentActivity: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                orderNumber: 1,
                status: 1,
                finalAmount: 1,
                createdAt: 1,
                itemsCount: { $size: '$items' }
              }
            }
          ]
        }
      }
    ]);

    const overallStats = statistics[0]?.overallStats[0] || {
      total: 0, pending: 0, confirmed: 0, in_production: 0,
      ready_for_delivery: 0, assigned_to_transporter: 0, shipped: 0, delivered: 0, cancelled: 0,
      totalRevenue: 0, averageOrderValue: 0
    };

    // NEW: Get wholesaler-specific statistics if filtering by wholesaler
    let wholesalerStats = null;
    if (wholesalerId) {
      wholesalerStats = await WholesalerOrderToSupplier.aggregate([
        { 
          $match: { 
            supplier: new mongoose.Types.ObjectId(supplierId),
            wholesaler: new mongoose.Types.ObjectId(wholesalerId)
          } 
        },
        {
          $group: {
            _id: '$wholesaler',
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$finalAmount' },
            averageOrderValue: { $avg: '$finalAmount' },
            firstOrderDate: { $min: '$createdAt' },
            lastOrderDate: { $max: '$createdAt' },
            pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }
          }
        }
      ]);

      if (wholesalerStats.length > 0) {
        wholesalerStats = wholesalerStats[0];
      }
    }

    res.json({
      success: true,
      orders: enhancedOrders,
      statistics: overallStats,
      wholesalerStats, // NEW: Include wholesaler-specific stats
      statusBreakdown: statistics[0]?.statusCounts || [],
      recentActivity: statistics[0]?.recentActivity || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      filters: {
        status,
        search,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
        wholesalerId
      }
    });

  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/supplier/orders/statistics - Get comprehensive order statistics
router.get('/statistics', async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { timeframe = 'all', wholesalerId } = req.query;

    console.log('Fetching statistics with timeframe:', timeframe, 'wholesalerId:', wholesalerId);

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

      dateFilter.createdAt = { $gte: startDate };
    }

    // Build base match with optional wholesaler filter
    const baseMatch = { 
      supplier: new mongoose.Types.ObjectId(supplierId),
      ...dateFilter
    };

    // Add wholesaler filter if provided
    if (wholesalerId && wholesalerId !== 'undefined') {
      if (mongoose.Types.ObjectId.isValid(wholesalerId)) {
        baseMatch.wholesaler = new mongoose.Types.ObjectId(wholesalerId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid wholesaler ID format'
        });
      }
    }

    const statistics = await WholesalerOrderToSupplier.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$finalAmount' },
                averageOrderValue: { $avg: '$finalAmount' },
                maxOrderValue: { $max: '$finalAmount' },
                minOrderValue: { $min: '$finalAmount' },
                completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                inProgressOrders: { 
                  $sum: { 
                    $cond: [{ 
                      $in: ['$status', ['confirmed', 'in_production', 'ready_for_delivery', 'assigned_to_transporter', 'shipped']] 
                    }, 1, 0] 
                  } 
                }
              }
            }
          ],
          statusAnalysis: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$finalAmount' },
                averageAmount: { $avg: '$finalAmount' }
              }
            }
          ],
          timeline: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                ordersCount: { $sum: 1 },
                revenue: { $sum: '$finalAmount' }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            { $limit: 30 }
          ],
          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                totalQuantity: { $sum: '$items.quantity' },
                totalRevenue: { $sum: '$items.totalPrice' },
                orderCount: { $sum: 1 }
              }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'supplierproducts',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails'
              }
            },
            {
              $project: {
                product: { $arrayElemAt: ['$productDetails', 0] },
                totalQuantity: 1,
                totalRevenue: 1,
                orderCount: 1
              }
            }
          ],
          // NEW: Top wholesalers by revenue
          topWholesalers: [
            {
              $group: {
                _id: '$wholesaler',
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$finalAmount' },
                averageOrderValue: { $avg: '$finalAmount' }
              }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'wholesalerDetails'
              }
            },
            {
              $project: {
                wholesaler: { $arrayElemAt: ['$wholesalerDetails', 0] },
                totalOrders: 1,
                totalRevenue: 1,
                averageOrderValue: 1
              }
            }
          ]
        }
      }
    ]);

    const overview = statistics[0]?.overview[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      maxOrderValue: 0,
      minOrderValue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      inProgressOrders: 0
    };

    res.json({
      success: true,
      statistics: {
        overview,
        statusAnalysis: statistics[0]?.statusAnalysis || [],
        timeline: statistics[0]?.timeline || [],
        topProducts: statistics[0]?.topProducts || [],
        topWholesalers: statistics[0]?.topWholesalers || [], // NEW: Top wholesalers data
        timeframe,
        wholesalerId: wholesalerId || null
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/supplier/orders/:orderId - Get single order details with enhanced data
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const supplierId = req.user.id;

    console.log('Fetching order details:', orderId, 'for supplier:', supplierId);

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    })
    .populate({
      path: 'wholesaler',
      select: 'businessName firstName lastName email phone address city avatar companyInfo productCategory',
      model: 'User'
    })
    .populate({
      path: 'items.product',
      select: 'name description images measurementUnit category sku productionStatus profitMargin materials productionPrice sellingPrice',
      model: 'SupplierProduct'
    })
    .populate({
      path: 'assignedTransporter',
      select: 'firstName lastName businessName email phone vehicleType companyName isOnline lastSeen address',
      model: 'User'
    })
    .populate({
      path: 'returnTransporter',
      select: 'firstName lastName businessName email phone vehicleType companyName',
      model: 'User'
    })
    .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to view this order'
      });
    }

    // Enhance order with additional calculated fields
    const enhancedOrder = {
      ...order,
      orderAge: Math.floor((new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24)),
      canBeModified: ['pending', 'confirmed'].includes(order.status),
      canAssignTransporter: order.status === 'ready_for_delivery',
      estimatedProductionTime: order.items.reduce((total, item) => {
        return total + (item.product?.productionTime || 0);
      }, 0),
      items: order.items.map(item => ({
        ...item,
        product: item.product ? {
          ...item.product,
          primaryImage: item.product.images && item.product.images.length > 0 
            ? item.product.images[0] 
            : null,
          allImages: item.product.images || [],
          profit: item.totalPrice - (item.product.productionPrice * item.quantity),
          profitPercentage: item.product.productionPrice > 0 
            ? ((item.totalPrice - (item.product.productionPrice * item.quantity)) / (item.product.productionPrice * item.quantity)) * 100 
            : 0
        } : null
      })),
      totalProfit: order.items.reduce((total, item) => {
        if (item.product && item.product.productionPrice) {
          return total + (item.totalPrice - (item.product.productionPrice * item.quantity));
        }
        return total;
      }, 0),
      // NEW: Calculate delivery timeline
      deliveryTimeline: {
        orderPlaced: order.createdAt,
        productionStart: order.productionStartDate,
        productionEnd: order.readyForDeliveryDate,
        assignedToTransporter: order.transporterAssignedAt,
        shipped: order.shippedDate,
        delivered: order.actualDeliveryDate,
        estimatedDelivery: order.estimatedDeliveryDate
      }
    };

    console.log('Order details fetched successfully');

    res.json({
      success: true,
      order: enhancedOrder
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/supplier/orders/:orderId/status - Update order status with validation
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const supplierId = req.user.id;

    console.log('Updating order status:', { orderId, status, notes });

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'in_production', 'ready_for_delivery', 'assigned_to_transporter', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_production', 'cancelled'],
      in_production: ['ready_for_delivery', 'cancelled'],
      ready_for_delivery: ['assigned_to_transporter', 'shipped', 'cancelled'],
      assigned_to_transporter: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // Handle specific status changes
    const previousStatus = order.status;
    order.status = status;

    // Add status change notes
    if (notes) {
      const timestamp = new Date().toISOString();
      const statusNote = `[${timestamp}] Status changed from ${previousStatus} to ${status}: ${notes}`;
      order.internalNotes = order.internalNotes 
        ? `${order.internalNotes}\n${statusNote}`
        : statusNote;
    }

    // Set timestamps for specific status changes
    const now = new Date();
    if (status === 'in_production') {
      order.productionStartDate = now;
    } else if (status === 'ready_for_delivery') {
      order.readyForDeliveryDate = now;
    } else if (status === 'shipped') {
      order.shippedDate = now;
    } else if (status === 'delivered') {
      order.actualDeliveryDate = now;
    } else if (status === 'cancelled') {
      order.cancelledDate = now;
      // Restore product quantities if cancelling
      if (previousStatus === 'pending' || previousStatus === 'confirmed') {
        for (const item of order.items) {
          await SupplierProduct.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: item.quantity } }
          );
        }
      }
    }

    await order.save();

    // Get updated order with populated data
    const updatedOrder = await WholesalerOrderToSupplier.findById(orderId)
      .populate('wholesaler', 'businessName firstName lastName email')
      .populate('assignedTransporter', 'firstName lastName businessName vehicleType')
      .populate('items.product', 'name images measurementUnit');

    console.log('Order status updated successfully');

    res.json({
      success: true,
      message: `Order status updated from ${previousStatus} to ${status}`,
      order: updatedOrder,
      statusChange: {
        from: previousStatus,
        to: status,
        timestamp: now
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/supplier/orders/:orderId/assign-transporter - Assign transporter to order
router.put('/:orderId/assign-transporter', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transporterId, transporterNotes, estimatedDeliveryDate } = req.body;
    const supplierId = req.user.id;

    console.log('Assigning transporter to order:', { orderId, transporterId });

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can have transporter assigned
    if (order.status !== 'ready_for_delivery') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in ready_for_delivery status to assign transporter'
      });
    }

    // Verify transporter exists and is active
    const transporter = await User.findOne({
      _id: transporterId,
      role: 'transporter',
      isActive: true
    });

    if (!transporter) {
      return res.status(404).json({
        success: false,
        message: 'Transporter not found or not active'
      });
    }

    // Update order with transporter assignment
    order.assignedTransporter = transporterId;
    order.status = 'assigned_to_transporter';
    order.transporterNotes = transporterNotes || '';
    
    if (estimatedDeliveryDate) {
      order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
    }

    await order.save();

    // Populate order with transporter data for response
    const updatedOrder = await WholesalerOrderToSupplier.findById(orderId)
      .populate('wholesaler', 'businessName firstName lastName email')
      .populate('assignedTransporter', 'firstName lastName businessName email phone vehicleType companyName')
      .populate('items.product', 'name images measurementUnit');

    console.log('Transporter assigned successfully');

    res.json({
      success: true,
      message: 'Transporter assigned successfully',
      order: updatedOrder,
      transporter: updatedOrder.assignedTransporter
    });

  } catch (error) {
    console.error('Error assigning transporter:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning transporter',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/supplier/orders/:orderId/assign-any-transporter - Assign any available transporter
router.put('/:orderId/assign-any-transporter', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transporterNotes, estimatedDeliveryDate } = req.body;
    const supplierId = req.user.id;

    console.log('Assigning any available transporter to order:', orderId);

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can have transporter assigned
    if (order.status !== 'ready_for_delivery') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in ready_for_delivery status to assign transporter'
      });
    }

    // Find available transporters (prefer online ones)
    const availableTransporters = await User.find({
      role: 'transporter',
      isActive: true
    }).sort({ isOnline: -1, createdAt: 1 }).limit(5);

    if (availableTransporters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No available transporters found'
      });
    }

    // Select the first available transporter
    const transporter = availableTransporters[0];

    // Update order with transporter assignment
    order.assignedTransporter = transporter._id;
    order.status = 'assigned_to_transporter';
    order.transporterNotes = transporterNotes || 'Automatically assigned by system';
    
    if (estimatedDeliveryDate) {
      order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
    }

    await order.save();

    // Populate order with transporter data for response
    const updatedOrder = await WholesalerOrderToSupplier.findById(orderId)
      .populate('wholesaler', 'businessName firstName lastName email')
      .populate('assignedTransporter', 'firstName lastName businessName email phone vehicleType companyName')
      .populate('items.product', 'name images measurementUnit');

    console.log('Transporter assigned automatically');

    res.json({
      success: true,
      message: 'Transporter assigned automatically',
      order: updatedOrder,
      transporter: updatedOrder.assignedTransporter,
      autoAssigned: true
    });

  } catch (error) {
    console.error('Error assigning any transporter:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning transporter',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/supplier/orders/:orderId/remove-transporter - Remove transporter assignment
router.put('/:orderId/remove-transporter', async (req, res) => {
  try {
    const { orderId } = req.params;
    const supplierId = req.user.id;

    console.log('Removing transporter from order:', orderId);

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order has a transporter assigned
    if (!order.assignedTransporter) {
      return res.status(400).json({
        success: false,
        message: 'No transporter assigned to this order'
      });
    }

    // Remove transporter assignment and revert status
    order.assignedTransporter = undefined;
    order.transporterAssignedAt = undefined;
    order.transporterNotes = '';
    order.estimatedDeliveryDate = undefined;
    order.status = 'ready_for_delivery';

    await order.save();

    console.log('Transporter assignment removed successfully');

    res.json({
      success: true,
      message: 'Transporter assignment removed successfully',
      order
    });

  } catch (error) {
    console.error('Error removing transporter assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing transporter assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/supplier/orders/:orderId/notes - Add internal notes to order
router.put('/:orderId/notes', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const supplierId = req.user.id;

    console.log('Adding notes to order:', orderId);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notes cannot be empty'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Append new notes with timestamp and user info
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] Supplier: ${notes.trim()}`;
    
    order.internalNotes = order.internalNotes 
      ? `${order.internalNotes}\n${newNote}`
      : newNote;

    await order.save();

    console.log('Internal notes added successfully');

    res.json({
      success: true,
      message: 'Internal notes added successfully',
      notes: order.internalNotes,
      addedAt: timestamp
    });

  } catch (error) {
    console.error('Error adding internal notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding internal notes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/supplier/orders/:orderId/timeline - Get order status timeline
router.get('/:orderId/timeline', async (req, res) => {
  try {
    const { orderId } = req.params;
    const supplierId = req.user.id;

    console.log('Fetching order timeline:', orderId);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    }).select('status internalNotes createdAt productionStartDate readyForDeliveryDate shippedDate actualDeliveryDate cancelledDate transporterAssignedAt estimatedDeliveryDate');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Build timeline from order events
    const timeline = [
      {
        event: 'Order Created',
        status: 'created',
        timestamp: order.createdAt,
        description: 'Order was placed by wholesaler',
        icon: '📦'
      }
    ];

    // Add production events
    if (order.productionStartDate) {
      timeline.push({
        event: 'Production Started',
        status: 'in_production',
        timestamp: order.productionStartDate,
        description: 'Production process began',
        icon: '🏭'
      });
    }

    if (order.readyForDeliveryDate) {
      timeline.push({
        event: 'Ready for Delivery',
        status: 'ready_for_delivery',
        timestamp: order.readyForDeliveryDate,
        description: 'Products completed and ready for shipping',
        icon: '✅'
      });
    }

    // Add transporter assignment event
    if (order.transporterAssignedAt) {
      timeline.push({
        event: 'Transporter Assigned',
        status: 'assigned_to_transporter',
        timestamp: order.transporterAssignedAt,
        description: 'Transporter was assigned for delivery',
        icon: '🚚'
      });
    }

    // Add status changes from internal notes
    if (order.internalNotes) {
      const noteLines = order.internalNotes.split('\n');
      noteLines.forEach(note => {
        const match = note.match(/\[(.*?)\] Status changed from (.*?) to (.*?):?(.*)/);
        if (match) {
          timeline.push({
            event: 'Status Changed',
            status: match[3],
            timestamp: new Date(match[1]),
            description: `Changed from ${match[2]} to ${match[3]}${match[4] ? `: ${match[4]}` : ''}`,
            fromStatus: match[2],
            toStatus: match[3],
            icon: '🔄'
          });
        }
      });
    }

    // Add specific event timestamps
    if (order.shippedDate) {
      timeline.push({
        event: 'Order Shipped',
        status: 'shipped',
        timestamp: order.shippedDate,
        description: 'Order was shipped to customer',
        icon: '📤'
      });
    }

    if (order.actualDeliveryDate) {
      timeline.push({
        event: 'Order Delivered',
        status: 'delivered',
        timestamp: order.actualDeliveryDate,
        description: 'Order was successfully delivered',
        icon: '🎯'
      });
    }

    if (order.cancelledDate) {
      timeline.push({
        event: 'Order Cancelled',
        status: 'cancelled',
        timestamp: order.cancelledDate,
        description: 'Order was cancelled',
        icon: '❌'
      });
    }

    // Add estimated delivery if available
    if (order.estimatedDeliveryDate) {
      timeline.push({
        event: 'Estimated Delivery',
        status: 'estimated',
        timestamp: order.estimatedDeliveryDate,
        description: 'Expected delivery date',
        icon: '📅',
        isEstimate: true
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log('Order timeline fetched successfully');

    res.json({
      success: true,
      timeline
    });

  } catch (error) {
    console.error('Error fetching order timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order timeline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// NEW: GET /api/supplier/orders/wholesaler/:wholesalerId - Get all orders for specific wholesaler
router.get('/wholesaler/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const supplierId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    console.log('Fetching orders for wholesaler:', wholesalerId, 'by supplier:', supplierId);

    // Validate wholesalerId format
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wholesaler ID format'
      });
    }

    // Build query
    const query = { 
      supplier: supplierId,
      wholesaler: wholesalerId
    };

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get orders with pagination
    const orders = await WholesalerOrderToSupplier.find(query)
      .populate({
        path: 'wholesaler',
        select: 'businessName firstName lastName email phone avatar address city productCategory',
        model: 'User'
      })
      .populate({
        path: 'items.product',
        select: 'name description images measurementUnit category',
        model: 'SupplierProduct'
      })
      .populate({
        path: 'assignedTransporter',
        select: 'firstName lastName businessName email phone vehicleType',
        model: 'User'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await WholesalerOrderToSupplier.countDocuments(query);

    // Get wholesaler statistics
    const wholesalerStats = await WholesalerOrderToSupplier.aggregate([
      { 
        $match: { 
          supplier: new mongoose.Types.ObjectId(supplierId),
          wholesaler: new mongoose.Types.ObjectId(wholesalerId)
        } 
      },
      {
        $group: {
          _id: '$wholesaler',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          averageOrderValue: { $avg: '$finalAmount' },
          firstOrderDate: { $min: '$createdAt' },
          lastOrderDate: { $max: '$createdAt' },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmedOrders: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          inProductionOrders: { $sum: { $cond: [{ $eq: ['$status', 'in_production'] }, 1, 0] } },
          deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ]);

    const stats = wholesalerStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      inProductionOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0
    };

    console.log(`Found ${orders.length} orders for wholesaler ${wholesalerId}`);

    res.json({
      success: true,
      orders,
      wholesalerStats: stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching wholesaler orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wholesaler orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;