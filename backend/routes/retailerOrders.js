// backend/routes/orders.js - FULLY EXPANDED WITH ENHANCED NOTIFICATION ENDPOINTS
const express = require('express');
const {
  createOrder,
  getRetailerOrders,
  getWholesalerOrders,
  getTransporterOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStatistics,
  resolveDispute,
  handleReturnRequest,
  getPendingOrdersCount,
  debugOrderNotification,
  testOrderNotification,
  getNotificationStatus,
  generateOrderTimeline,
  validateOrderCreation,
  getProductStockInfo
} = require('../controllers/retailerOrderController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// ==================== ORDER MANAGEMENT ROUTES ====================

// POST /api/retailer-orders - Create a new order (retailer only)
router.post('/', createOrder);

// GET /api/retailer-orders/retailer - Get orders for retailer
router.get('/retailer', getRetailerOrders);

// GET /api/retailer-orders/wholesaler - Get orders for wholesaler
router.get('/wholesaler', getWholesalerOrders);

// GET /api/retailer-orders/transporter - Get orders for transporter
router.get('/transporter', getTransporterOrders);

// GET /api/retailer-orders/stats - Get order statistics
router.get('/stats', getOrderStatistics);

// GET /api/retailer-orders/pending-count - Get pending orders count
router.get('/pending-count', getPendingOrdersCount);

// GET /api/retailer-orders/:id - Get single order
router.get('/:id', getOrder);

// PUT /api/retailer-orders/:id/status - Update order status
router.put('/:id/status', updateOrderStatus);

// PUT /api/retailer-orders/:id/resolve-dispute - Resolve delivery dispute
router.put('/:id/resolve-dispute', resolveDispute);

// PUT /api/retailer-orders/:id/handle-return - Handle return request
router.put('/:id/handle-return', handleReturnRequest);

// DELETE /api/retailer-orders/:id - Delete order (retailer only, pending status only)
router.delete('/:id', deleteOrder);

// ==================== ENHANCED NOTIFICATION ROUTES ====================

// POST /api/retailer-orders/test-notification - Test notification endpoint
router.post('/test-notification', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    if (io) {
      const {
        productName,
        quantity,
        measurementUnit,
        totalPrice,
        deliveryPlace,
        testType = 'basic',
        targetUserId
      } = req.body;

      const targetWholesalerId = targetUserId || req.user.id;

      console.log('🧪 Testing enhanced notification for user:', targetWholesalerId);

      const testOrderData = {
        _id: 'test_order_' + Date.now(),
        productName: productName || 'Test Product',
        quantity: quantity || 5,
        measurementUnit: measurementUnit || 'kg',
        totalPrice: totalPrice || 25000,
        deliveryPlace: deliveryPlace || 'Test Location',
        wholesalerId: targetWholesalerId,
        retailerId: req.user.id,
        product: {
          name: productName || 'Test Product',
          category: 'Test Category',
          images: []
        },
        retailer: {
          firstName: 'Test',
          lastName: 'Retailer',
          businessName: 'Test Business',
          phone: '+1234567890',
          email: 'test@retailer.com'
        },
        timestamp: new Date(),
        test: true,
        testType: testType
      };

      // Enhanced socket emission with multiple event types
      const socketResults = [];

      // Basic order creation event
      io.emit('new_order_created', testOrderData);
      socketResults.push('new_order_created');

      // Specific user notification
      io.to(`user_${targetWholesalerId.toString()}`).emit('test_notification', {
        type: 'test_order',
        data: testOrderData,
        message: 'This is a test notification for order system',
        priority: 'high',
        timestamp: new Date()
      });
      socketResults.push('test_notification');

      // Additional test events based on test type
      if (testType === 'comprehensive') {
        io.to(`user_${targetWholesalerId.toString()}`).emit('comprehensive_test', {
          type: 'comprehensive_order_test',
          orders: [
            { id: 1, status: 'pending', product: 'Test Product 1' },
            { id: 2, status: 'accepted', product: 'Test Product 2' },
            { id: 3, status: 'delivered', product: 'Test Product 3' }
          ],
          analytics: {
            totalOrders: 15,
            pendingCount: 3,
            revenue: 125000
          },
          timestamp: new Date()
        });
        socketResults.push('comprehensive_test');
      }

      // Status update simulation
      if (testType === 'status_updates') {
        const statuses = ['accepted', 'processing', 'in_transit', 'delivered', 'certified'];
        statuses.forEach((status, index) => {
          setTimeout(() => {
            io.to(`user_${targetWholesalerId.toString()}`).emit('order_status_update', {
              orderId: testOrderData._id,
              status: status,
              previousStatus: statuses[index - 1] || 'pending',
              timestamp: new Date(),
              test: true
            });
          }, index * 1000);
        });
        socketResults.push('status_updates_scheduled');
      }

      console.log('✅ Enhanced test notifications emitted successfully:', socketResults);
      
      res.json({ 
        success: true, 
        message: 'Enhanced test notification sent successfully',
        orderData: testOrderData,
        socketEvents: socketResults,
        targetUser: targetWholesalerId,
        testType: testType,
        timestamp: new Date()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Socket IO not available',
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Enhanced test notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending enhanced test notification',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// GET /api/retailer-orders/notifications - Get notifications for user with enhanced filtering
router.get('/notifications', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = false,
      type,
      priority,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const Notification = require('../models/Notification');
    
    // Enhanced filter construction
    const filter = { user: req.user.id };
    
    if (unreadOnly === 'true') {
      filter.read = false;
    }
    
    if (type) {
      filter.type = type;
    }
    
    if (priority) {
      filter.priority = priority;
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Enhanced notification query
    const notifications = await Notification.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('type title message read createdAt data priority expiresAt readAt');

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });

    // Notification statistics
    const notificationStats = await Notification.aggregate([
      { $match: { user: req.user.id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
          },
          highPriority: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      statistics: notificationStats,
      filters: {
        unreadOnly: unreadOnly === 'true',
        type,
        priority,
        startDate,
        endDate,
        sortBy,
        sortOrder
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get enhanced notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enhanced notifications',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// PUT /api/retailer-orders/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        user: req.user.id 
      },
      { 
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        timestamp: new Date()
      });
    }

    // Emit real-time update if socket available
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      io.to(`user_${req.user.id.toString()}`).emit('notification_read', {
        notificationId: notification._id,
        read: true,
        readAt: notification.readAt,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      notification,
      message: 'Notification marked as read',
      socketUpdated: !!req.app.get('socketio'),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notification',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// PUT /api/retailer-orders/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    const result = await Notification.updateMany(
      { 
        user: req.user.id,
        read: false
      },
      { 
        read: true,
        readAt: new Date()
      }
    );

    // Emit real-time update if socket available
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      io.to(`user_${req.user.id.toString()}`).emit('all_notifications_read', {
        count: result.modifiedCount,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount,
      socketUpdated: !!req.app.get('socketio'),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notifications',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// DELETE /api/retailer-orders/notifications/:id - Delete specific notification
router.delete('/notifications/:id', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        timestamp: new Date()
      });
    }

    // Emit real-time update if socket available
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      io.to(`user_${req.user.id.toString()}`).emit('notification_deleted', {
        notificationId: req.params.id,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      deletedNotification: {
        id: notification._id,
        type: notification.type,
        title: notification.title
      },
      socketUpdated: !!req.app.get('socketio'),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting notification',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// DELETE /api/retailer-orders/notifications - Bulk delete notifications
router.delete('/notifications', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const { types, read, olderThan } = req.body;

    const filter = { user: req.user.id };

    if (types && types.length > 0) {
      filter.type = { $in: types };
    }

    if (read !== undefined) {
      filter.read = read;
    }

    if (olderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));
      filter.createdAt = { $lt: cutoffDate };
    }

    const result = await Notification.deleteMany(filter);

    // Emit real-time update if socket available
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      io.to(`user_${req.user.id.toString()}`).emit('notifications_bulk_deleted', {
        deletedCount: result.deletedCount,
        filters: { types, read, olderThan },
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notifications bulk deleted successfully',
      deletedCount: result.deletedCount,
      filters: {
        types,
        read,
        olderThan
      },
      socketUpdated: !!req.app.get('socketio'),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Bulk delete notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while bulk deleting notifications',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// GET /api/retailer-orders/notifications/unread-count - Get unread notifications count
router.get('/notifications/unread-count', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    const count = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });

    // Get count by priority
    const priorityCounts = await Notification.aggregate([
      {
        $match: {
          user: req.user.id,
          read: false
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityBreakdown = {};
    priorityCounts.forEach(item => {
      priorityBreakdown[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
      priorityBreakdown,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread count',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// GET /api/retailer-orders/notifications/status - Get enhanced notification status
router.get('/notifications/status', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });

    const totalCount = await Notification.countDocuments({ user: req.user.id });

    // Recent notifications (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentCount = await Notification.countDocuments({
      user: req.user.id,
      createdAt: { $gte: weekAgo }
    });

    // Notification types breakdown
    const typeBreakdown = await Notification.aggregate([
      { $match: { user: req.user.id } },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Socket connection status
    const socketAvailable = !!req.app.get('socketio');
    let connectionStatus = 'disconnected';
    
    if (socketAvailable) {
      const io = req.app.get('socketio');
      connectionStatus = io.sockets.adapter.rooms.has(`user_${req.user.id}`) ? 
        'connected' : 'disconnected';
    }

    res.status(200).json({
      success: true,
      status: {
        unreadCount,
        totalCount,
        recentCount,
        readCount: totalCount - unreadCount
      },
      typeBreakdown,
      socketStatus: {
        available: socketAvailable,
        connection: connectionStatus,
        userRoom: `user_${req.user.id}`
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get notification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification status',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ==================== ENHANCED DEBUG AND MONITORING ROUTES ====================

// GET /api/retailer-orders/debug/notification/:orderId - Debug order notification
router.get('/debug/notification/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await require('../models/RetailerOrder').findById(orderId)
      .populate('retailer', 'firstName lastName businessName phone email')
      .populate('wholesaler', 'firstName lastName businessName phone email')
      .populate('transporter', 'firstName lastName businessName phone email')
      .populate('product', 'name sku category measurementUnit quantity lowStockAlert');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        timestamp: new Date()
      });
    }

    // Enhanced notification analysis
    const notifications = await require('../models/Notification').find({
      'data.orderId': orderId
    }).sort({ createdAt: -1 });

    // Socket connection analysis
    const socketAvailable = !!req.app.get('socketio');
    let socketAnalysis = {};
    
    if (socketAvailable) {
      const io = req.app.get('socketio');
      socketAnalysis = {
        wholesalerConnected: io.sockets.adapter.rooms.has(`user_${order.wholesaler._id.toString()}`),
        retailerConnected: io.sockets.adapter.rooms.has(`user_${order.retailer._id.toString()}`),
        transporterConnected: order.transporter ? 
          io.sockets.adapter.rooms.has(`user_${order.transporter._id.toString()}`) : false,
        totalConnections: io.engine.clientsCount
      };
    }

    // Order timeline reconstruction
    const timeline = await generateOrderTimeline(order);

    // Stock information
    const stockInfo = await getProductStockInfo(order.product._id);

    res.json({
      success: true,
      order: {
        id: order._id,
        status: order.status,
        retailer: order.retailer,
        wholesaler: order.wholesaler,
        transporter: order.transporter,
        product: order.product,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        metadata: order.metadata
      },
      notifications: notifications.map(notif => ({
        id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        createdAt: notif.createdAt,
        expiresAt: notif.expiresAt,
        priority: notif.priority,
        data: notif.data
      })),
      notificationAnalysis: {
        totalCount: notifications.length,
        readCount: notifications.filter(n => n.read).length,
        unreadCount: notifications.filter(n => !n.read).length,
        types: [...new Set(notifications.map(n => n.type))],
        recentNotification: notifications[0] || null
      },
      socketAnalysis: {
        available: socketAvailable,
        ...socketAnalysis
      },
      timeline,
      stockInfo,
      systemInfo: {
        serverTime: new Date(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage()
      }
    });

  } catch (error) {
    console.error('Enhanced debug order notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Enhanced debug failed',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// GET /api/retailer-orders/debug/socket-status - Debug socket connection status
router.get('/debug/socket-status', auth, async (req, res) => {
  try {
    const socketAvailable = !!req.app.get('socketio');
    let socketStatus = {
      available: socketAvailable,
      connections: 0,
      rooms: [],
      userRooms: []
    };

    if (socketAvailable) {
      const io = req.app.get('socketio');
      const adapter = io.sockets.adapter;
      
      socketStatus.connections = io.engine.clientsCount;
      socketStatus.rooms = Array.from(adapter.rooms.keys()).filter(room => !room.startsWith('user_'));
      socketStatus.userRooms = Array.from(adapter.rooms.keys())
        .filter(room => room.startsWith('user_'))
        .map(room => ({
          room: room,
          userCount: adapter.rooms.get(room)?.size || 0
        }));
      
      // Check if current user is connected
      socketStatus.currentUserConnected = adapter.rooms.has(`user_${req.user.id}`);
    }

    res.json({
      success: true,
      socketStatus,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Debug socket status error:', error);
    res.status(500).json({
      success: false,
      message: 'Socket status debug failed',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ==================== ENHANCED VALIDATION AND UTILITY ROUTES ====================

// POST /api/retailer-orders/validate - Validate order creation before submission
router.post('/validate', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required',
        timestamp: new Date()
      });
    }

    const validation = await validateOrderCreation(productId, quantity, req.user.id);

    res.status(200).json({
      success: true,
      validation: {
        ...validation.validation,
        product: {
          id: validation.product._id,
          name: validation.product.name,
          price: validation.product.price,
          measurementUnit: validation.product.measurementUnit,
          minOrderQuantity: validation.product.minOrderQuantity
        },
        wholesaler: {
          id: validation.wholesaler,
          businessName: validation.product.wholesaler?.businessName
        }
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Order validation error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      validation: {
        valid: false,
        error: error.message
      },
      timestamp: new Date()
    });
  }
});

// GET /api/retailer-orders/product/:productId/stock - Get product stock information
router.get('/product/:productId/stock', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    const stockInfo = await getProductStockInfo(productId);

    res.status(200).json({
      success: true,
      stockInfo,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get product stock info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product stock information',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// GET /api/retailer-orders/:id/timeline - Get order timeline
router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await require('../models/RetailerOrder').findById(id)
      .populate('retailer', 'firstName lastName businessName')
      .populate('wholesaler', 'businessName')
      .populate('transporter', 'firstName lastName businessName')
      .populate('cancellationDetails.cancelledBy', 'firstName lastName businessName')
      .populate('deliveryDispute.disputedBy', 'firstName lastName businessName')
      .populate('deliveryDispute.resolvedBy', 'firstName lastName businessName')
      .populate('returnDetails.returnedBy', 'firstName lastName businessName')
      .populate('returnDetails.handledBy', 'firstName lastName businessName')
      .populate('assignmentHistory.transporter', 'firstName lastName businessName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        timestamp: new Date()
      });
    }

    // Check permissions
    if (!order.canUserPerformAction(req.user.id, req.user.role) && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order timeline',
        timestamp: new Date()
      });
    }

    const timeline = await generateOrderTimeline(order);

    res.status(200).json({
      success: true,
      orderId: order._id,
      orderStatus: order.status,
      timeline,
      totalEvents: timeline.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get order timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order timeline',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ==================== ENHANCED ANALYTICS ROUTES ====================

// GET /api/retailer-orders/analytics/overview - Get comprehensive order analytics
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const { timeRange = 'month', retailerId, productId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = {};
    if (userRole === 'retailer') {
      filter.retailer = userId;
    } else if (userRole === 'wholesaler') {
      filter.wholesaler = userId;
    } else if (userRole === 'transporter') {
      filter.transporter = userId;
    }

    // Time range filter
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
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
    
    if (timeRange !== 'all') {
      filter.createdAt = { $gte: startDate };
    }

    // Additional filters
    if (retailerId && userRole === 'wholesaler') {
      filter.retailer = retailerId;
    }
    
    if (productId) {
      filter.product = productId;
    }

    const RetailerOrder = require('../models/RetailerOrder');

    // Comprehensive analytics aggregation
    const analytics = await RetailerOrder.aggregate([
      { $match: filter },
      {
        $facet: {
          // Status breakdown
          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$totalPrice' },
                averageValue: { $avg: '$totalPrice' },
                totalQuantity: { $sum: '$quantity' }
              }
            }
          ],
          // Revenue trends
          revenueTrends: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                revenue: { $sum: '$totalPrice' },
                orders: { $sum: 1 },
                date: { $first: '$createdAt' }
              }
            },
            { $sort: { date: 1 } },
            { $limit: 30 }
          ],
          // Top products (for wholesalers)
          topProducts: userRole === 'wholesaler' ? [
            {
              $group: {
                _id: '$product',
                orders: { $sum: 1 },
                revenue: { $sum: '$totalPrice' },
                quantity: { $sum: '$quantity' }
              }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
          ] : [],
          // Top retailers (for wholesalers)
          topRetailers: userRole === 'wholesaler' ? [
            {
              $group: {
                _id: '$retailer',
                orders: { $sum: 1 },
                revenue: { $sum: '$totalPrice' },
                averageOrderValue: { $avg: '$totalPrice' }
              }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
          ] : [],
          // Performance metrics
          performance: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalPrice' },
                completedOrders: {
                  $sum: { $cond: [{ $in: ['$status', ['certified', 'delivered']] }, 1, 0] }
                },
                pendingOrders: {
                  $sum: { $cond: [{ $in: ['$status', ['pending', 'accepted', 'processing']] }, 1, 0] }
                },
                averageOrderValue: { $avg: '$totalPrice' },
                totalQuantity: { $sum: '$quantity' }
              }
            }
          ]
        }
      }
    ]);

    const result = analytics[0];

    res.status(200).json({
      success: true,
      analytics: {
        statusBreakdown: result.statusBreakdown,
        revenueTrends: result.revenueTrends,
        topProducts: result.topProducts,
        topRetailers: result.topRetailers,
        performance: result.performance[0] || {}
      },
      timeRange: {
        type: timeRange,
        startDate: timeRange !== 'all' ? startDate : null,
        endDate: now
      },
      filters: {
        retailerId,
        productId
      },
      userRole,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order analytics',
      error: error.message,
      timestamp: new Date()
    });
  }
});

module.exports = router;