// backend/routes/orders.js - EXPANDED WITH NOTIFICATION ENDPOINTS
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
  handleReturnRequest
} = require('../controllers/retailerOrderController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// POST /api/retailer-orders - Create a new order (retailer only)
router.post('/', createOrder);

// NEW: Test notification endpoint
router.post('/test-notification', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    if (io) {
      const testOrderData = {
        _id: 'test_order_' + Date.now(),
        productName: req.body.productName || 'Test Product',
        quantity: req.body.quantity || 5,
        measurementUnit: req.body.measurementUnit || 'kg',
        totalPrice: req.body.totalPrice || 25000,
        deliveryPlace: req.body.deliveryPlace || 'Test Location',
        wholesalerId: req.user.id, // Send to current user
        retailerId: req.user.id,
        product: {
          name: req.body.productName || 'Test Product'
        },
        retailer: {
          firstName: 'Test',
          lastName: 'Retailer',
          businessName: 'Test Business'
        }
      };

      // Emit to socket handler
      io.emit('new_order_created', testOrderData);
      
      res.json({ 
        success: true, 
        message: 'Test notification sent',
        orderData: testOrderData
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Socket IO not available' 
      });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending test notification',
      error: error.message 
    });
  }
});

// NEW: Get notifications for user
router.get('/notifications', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const Notification = require('../models/Notification');
    
    const filter = { user: req.user.id };
    
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications',
      error: error.message
    });
  }
});

// NEW: Mark notification as read
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
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notification',
      error: error.message
    });
  }
});

// NEW: Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    await Notification.updateMany(
      { 
        user: req.user.id,
        read: false
      },
      { 
        read: true,
        readAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notifications',
      error: error.message
    });
  }
});

// NEW: Get unread notifications count
router.get('/notifications/unread-count', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    const count = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });

    res.status(200).json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread count',
      error: error.message
    });
  }
});

// EXISTING ROUTES - KEEP ALL FUNCTIONALITY
// GET /api/retailer-orders/retailer - Get orders for retailer
router.get('/retailer', getRetailerOrders);

// GET /api/retailer-orders/wholesaler - Get orders for wholesaler
router.get('/wholesaler', getWholesalerOrders);

// GET /api/retailer-orders/transporter - Get orders for transporter
router.get('/transporter', getTransporterOrders);

// GET /api/retailer-orders/stats - Get order statistics
router.get('/stats', getOrderStatistics);

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

module.exports = router;