// routes/transporters.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');
const auth = require('../middleware/auth');

// Get transporter status
router.get('/status/:id', async (req, res) => {
  try {
    console.log('Fetching transporter status for ID:', req.params.id);
    
    const transporter = await User.findById(req.params.id);
    
    if (!transporter || transporter.role !== 'transporter') {
      console.log('Transporter not found or not a transporter');
      return res.status(404).json({
        success: false,
        message: 'Transporter not found'
      });
    }
    
    console.log('Transporter status:', transporter.isActive);
    
    res.json({
      success: true,
      isActive: transporter.isActive || false
    });
  } catch (error) {
    console.error('Error fetching transporter status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Toggle transporter status
router.post('/toggle-status', async (req, res) => {
  try {
    console.log('Toggling transporter status:', req.body);
    
    const { transporterId, isActive } = req.body;
    
    const transporter = await User.findById(transporterId);
    
    if (!transporter || transporter.role !== 'transporter') {
      console.log('Transporter not found for toggle');
      return res.status(404).json({
        success: false,
        message: 'Transporter not found'
      });
    }
    
    transporter.isActive = isActive;
    await transporter.save();
    
    console.log('Transporter status updated to:', isActive);
    
    res.json({
      success: true,
      message: `Transporter status updated to ${isActive ? 'active' : 'inactive'}`
    });
  } catch (error) {
    console.error('Error toggling transporter status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get active transporters
router.get('/active', async (req, res) => {
  try {
    console.log('Fetching active transporters...');
    
    // Check authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('No authorization header provided');
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }
    
    const transporters = await User.find({
      role: 'transporter',
      isActive: true
    }).select('firstName lastName businessName email phone vehicleType isOnline lastSeen');
    
    console.log(`Found ${transporters.length} active transporters`);
    
    res.json({
      success: true,
      transporters: transporters || []
    });
  } catch (error) {
    console.error('Error fetching active transporters:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get orders assigned to transporter (requires authentication)
router.get('/assigned-orders', auth, async (req, res) => {
  try {
    console.log('Fetching assigned orders for transporter:', req.user.id);
    
    const transporterId = req.user.id;

    // Verify user is a transporter
    const transporter = await User.findById(transporterId);
    if (!transporter || transporter.role !== 'transporter') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only transporters can view assigned orders.'
      });
    }

    const { status, page = 1, limit = 10, type = 'all' } = req.query;

    // Build query for orders assigned to this transporter (both delivery and return)
    const query = { 
      $or: [
        { assignedTransporter: transporterId },
        { returnTransporter: transporterId }
      ]
    };
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    } else {
      // Show all transporter-related statuses by default (both delivery and return)
      query.status = { 
        $in: [
          'assigned_to_transporter', 'accepted_by_transporter', 'in_transit', 'delivered', 'cancelled',
          'return_requested', 'return_accepted', 'return_in_transit', 'returned_to_supplier'
        ] 
      };
    }

    // Filter by order type
    if (type !== 'all') {
      if (type === 'delivery') {
        query.assignedTransporter = transporterId;
        delete query.$or;
      } else if (type === 'return') {
        query.returnTransporter = transporterId;
        delete query.$or;
      }
    }

    const orders = await WholesalerOrderToSupplier.find(query)
      .populate('supplier', 'firstName lastName businessName email phone city country avatar')
      .populate('wholesaler', 'firstName lastName businessName email phone city country')
      .populate('items.product', 'name description images measurementUnit category')
      .populate('assignedTransporter', 'firstName lastName businessName email phone')
      .populate('returnTransporter', 'firstName lastName businessName email phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments(query);

    console.log(`Found ${orders.length} assigned orders for transporter ${transporterId}`);

    // Separate statistics for delivery and return orders
    const deliveryOrders = orders.filter(order => 
      order.assignedTransporter && order.assignedTransporter._id.toString() === transporterId
    );
    
    const returnOrders = orders.filter(order => 
      order.returnTransporter && order.returnTransporter._id.toString() === transporterId
    );

    res.json({
      success: true,
      orders,
      statistics: {
        total: orders.length,
        delivery: deliveryOrders.length,
        return: returnOrders.length,
        assigned_to_transporter: orders.filter(o => o.status === 'assigned_to_transporter').length,
        accepted_by_transporter: orders.filter(o => o.status === 'accepted_by_transporter').length,
        in_transit: orders.filter(o => o.status === 'in_transit').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        return_requested: orders.filter(o => o.status === 'return_requested').length,
        return_accepted: orders.filter(o => o.status === 'return_accepted').length,
        return_in_transit: orders.filter(o => o.status === 'return_in_transit').length,
        returned_to_supplier: orders.filter(o => o.status === 'returned_to_supplier').length
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching assigned orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assigned orders',
      error: error.message
    });
  }
});

// Update order status (requires authentication) - COMPLETELY FIXED VERSION
router.put('/orders/:orderId/status', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const transporterId = req.user.id;

    console.log('=== STATUS UPDATE DEBUG ===');
    console.log('Order ID:', orderId);
    console.log('Requested Status:', status);
    console.log('Transporter ID:', transporterId);
    console.log('Notes:', notes);

    // Validate status
    const validStatuses = [
      'accepted_by_transporter', 'in_transit', 'delivered', 'cancelled',
      'return_accepted', 'return_in_transit', 'returned_to_supplier'
    ];
    
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status provided:', status);
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find order with detailed population for debugging
    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      $or: [
        { assignedTransporter: transporterId },
        { returnTransporter: transporterId }
      ]
    })
    .populate('assignedTransporter', '_id firstName lastName')
    .populate('returnTransporter', '_id firstName lastName');

    if (!order) {
      console.log('❌ Order not found or not assigned to this transporter');
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you'
      });
    }

    console.log('✅ Order found:');
    console.log('   - Current Status:', order.status);
    console.log('   - Order Number:', order.orderNumber);
    console.log('   - Assigned Transporter:', order.assignedTransporter?._id);
    console.log('   - Return Transporter:', order.returnTransporter?._id);

    // FIXED: Determine order type - prioritize return orders when both are present
    const isDeliveryOrder = order.assignedTransporter && 
                           order.assignedTransporter._id.toString() === transporterId.toString();
    const isReturnOrder = order.returnTransporter && 
                         order.returnTransporter._id.toString() === transporterId.toString();

    console.log('   - Is Delivery Order:', isDeliveryOrder);
    console.log('   - Is Return Order:', isReturnOrder);

    let orderType;
    if (isReturnOrder) {
      orderType = 'return';
    } else if (isDeliveryOrder) {
      orderType = 'delivery';
    } else {
      console.log('❌ Order not properly assigned to this transporter');
      return res.status(400).json({
        success: false,
        message: 'Order not properly assigned to you'
      });
    }

    console.log('   - Final Order Type:', orderType);

    // Define valid transitions
    const deliveryTransitions = {
      'assigned_to_transporter': ['accepted_by_transporter', 'cancelled'],
      'accepted_by_transporter': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };

    const returnTransitions = {
      'return_requested': ['return_accepted', 'cancelled'],
      'return_accepted': ['return_in_transit', 'cancelled'],
      'return_in_transit': ['returned_to_supplier', 'cancelled'],
      'returned_to_supplier': [],
      'cancelled': []
    };

    const validTransitions = orderType === 'delivery' ? deliveryTransitions : returnTransitions;

    console.log('   - Valid transitions from current status:', validTransitions[order.status]);

    // Check if current status is valid for transitions
    if (!validTransitions[order.status]) {
      console.log('❌ Invalid current order status for transitions');
      return res.status(400).json({
        success: false,
        message: `Invalid current order status: ${order.status}`
      });
    }

    if (!validTransitions[order.status].includes(status)) {
      console.log('❌ Invalid status transition');
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    console.log('✅ Status transition validated successfully');

    // Update the order status
    const previousStatus = order.status;
    order.status = status;

    // Add notes if provided
    if (notes) {
      const timestamp = new Date().toISOString();
      const statusNote = `[${timestamp}] Transporter: Status changed from ${previousStatus} to ${status}. ${notes}`;
      order.internalNotes = order.internalNotes 
        ? `${order.internalNotes}\n${statusNote}`
        : statusNote;

      // Store notes in appropriate field based on order type
      if (orderType === 'delivery') {
        order.transporterNotes = notes;
      } else if (orderType === 'return') {
        order.returnNotes = notes;
      }
    }

    // Set timestamps for specific status changes
    const now = new Date();
    if (status === 'accepted_by_transporter') {
      order.transporterAcceptedAt = now;
    } else if (status === 'in_transit') {
      order.inTransitAt = now;
    } else if (status === 'delivered') {
      order.actualDeliveryDate = now;
      order.deliveredAt = now;
    } else if (status === 'return_accepted') {
      order.returnAcceptedAt = now;
    } else if (status === 'return_in_transit') {
      order.returnInTransitAt = now;
    } else if (status === 'returned_to_supplier') {
      order.returnedToSupplierAt = now;
    } else if (status === 'cancelled') {
      order.cancelledAt = now;
    }

    await order.save();

    console.log('✅ Order status updated successfully');

    // Populate the updated order for response
    const updatedOrder = await WholesalerOrderToSupplier.findById(orderId)
      .populate('supplier', 'firstName lastName businessName')
      .populate('wholesaler', 'firstName lastName businessName')
      .populate('items.product', 'name measurementUnit')
      .populate('assignedTransporter', 'firstName lastName businessName')
      .populate('returnTransporter', 'firstName lastName businessName');

    res.json({
      success: true,
      message: `Order status updated from ${previousStatus} to ${status}`,
      order: updatedOrder,
      orderType: orderType,
      statusChange: {
        from: previousStatus,
        to: status,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// Get return orders available for assignment
router.get('/return-orders', auth, async (req, res) => {
  try {
    const transporterId = req.user.id;

    // Verify user is a transporter
    const transporter = await User.findById(transporterId);
    if (!transporter || transporter.role !== 'transporter') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only transporters can view return orders.'
      });
    }

    const { status = 'return_requested', page = 1, limit = 10 } = req.query;

    // Build query for return orders that need transporters
    const query = {
      status: status,
      returnTransporter: { $exists: false } // Only show orders not yet assigned
    };

    const orders = await WholesalerOrderToSupplier.find(query)
      .populate('supplier', 'firstName lastName businessName email phone city country')
      .populate('wholesaler', 'firstName lastName businessName email phone city country')
      .populate('items.product', 'name description images measurementUnit category')
      .populate('assignedTransporter', 'firstName lastName businessName')
      .sort({ returnRequestedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments(query);

    res.json({
      success: true,
      orders,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching return orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching return orders',
      error: error.message
    });
  }
});

// Accept return order assignment - FIXED VERSION
router.put('/return-orders/:orderId/accept', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const transporterId = req.user.id;

    console.log('=== ACCEPT RETURN ORDER DEBUG ===');
    console.log('Order ID:', orderId);
    console.log('Transporter ID:', transporterId);

    // Validate orderId format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      status: 'return_requested',
      returnTransporter: { $exists: false } // Not yet assigned
    });

    if (!order) {
      console.log('❌ Return order not found or already assigned');
      return res.status(404).json({
        success: false,
        message: 'Return order not found or already assigned'
      });
    }

    console.log('✅ Return order found, assigning transporter...');

    // Assign transporter to return order
    order.returnTransporter = transporterId;
    order.status = 'return_accepted';
    order.returnAcceptedAt = new Date();

    await order.save();

    console.log('✅ Return order accepted successfully');

    // Populate the updated order for response
    const updatedOrder = await WholesalerOrderToSupplier.findById(orderId)
      .populate('supplier', 'firstName lastName businessName')
      .populate('wholesaler', 'firstName lastName businessName')
      .populate('items.product', 'name measurementUnit')
      .populate('returnTransporter', 'firstName lastName businessName');

    res.json({
      success: true,
      message: 'Return order accepted successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ Error accepting return order:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting return order',
      error: error.message
    });
  }
});

// Get specific assigned order details (requires authentication)
router.get('/orders/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const transporterId = req.user.id;

    console.log(`Fetching order details for ${orderId} by transporter ${transporterId}`);

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      $or: [
        { assignedTransporter: transporterId },
        { returnTransporter: transporterId }
      ]
    })
    .populate('supplier', 'firstName lastName businessName email phone address city country')
    .populate('wholesaler', 'firstName lastName businessName email phone address city country')
    .populate('items.product', 'name description images measurementUnit category productionStatus')
    .populate('assignedTransporter', 'firstName lastName businessName vehicleType')
    .populate('returnTransporter', 'firstName lastName businessName vehicleType');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you'
      });
    }

    // FIXED: Determine order type with proper prioritization
    const isDeliveryOrder = order.assignedTransporter && 
                           order.assignedTransporter._id.toString() === transporterId;
    const isReturnOrder = order.returnTransporter && 
                         order.returnTransporter._id.toString() === transporterId;

    let orderType = 'unknown';
    if (isReturnOrder) {
      orderType = 'return';
    } else if (isDeliveryOrder) {
      orderType = 'delivery';
    }

    res.json({
      success: true,
      order,
      orderType: orderType
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: error.message
    });
  }
});

module.exports = router;