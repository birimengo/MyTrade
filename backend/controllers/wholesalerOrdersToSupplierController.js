const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');
const SupplierProduct = require('../models/SupplierProduct');

// Create a new order
const createOrder = async (req, res) => {
  try {
    const { supplierId, items, orderNotes, shippingAddress } = req.body;
    const wholesalerId = req.user.id;

    console.log('Creating order with data:', { 
      supplierId, 
      items, 
      wholesalerId,
      orderNotes,
      shippingAddress 
    });

    // Validate required fields
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier ID is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required and must be a non-empty array'
      });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.country) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required (street, city, country)'
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId and quantity'
        });
      }

      if (item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1'
        });
      }
    }

    // Calculate total amount and validate products
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await SupplierProduct.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found with ID: ${item.productId}`
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available for ordering`
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        });
      }

      if (item.quantity < product.minOrderQuantity) {
        return res.status(400).json({
          success: false,
          message: `Minimum order quantity for ${product.name} is ${product.minOrderQuantity}`
        });
      }

      const itemTotal = product.sellingPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        totalPrice: itemTotal
      });
    }

    // NEW: Update product quantities using bulk update
    const stockUpdates = items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      operation: 'decrease'
    }));

    try {
      await SupplierProduct.bulkUpdateStock(stockUpdates);
      console.log('Stock updated successfully for order items');
    } catch (stockError) {
      console.error('Error updating stock:', stockError);
      return res.status(400).json({
        success: false,
        message: `Stock update failed: ${stockError.message}`
      });
    }

    // Create the order with all required fields
    const orderData = {
      wholesaler: wholesalerId,
      supplier: supplierId,
      items: orderItems,
      totalAmount: totalAmount,
      finalAmount: totalAmount,
      orderNotes: orderNotes || '',
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state || '',
        country: shippingAddress.country,
        postalCode: shippingAddress.postalCode || ''
      },
      status: 'pending',
      paymentStatus: 'pending'
    };

    console.log('Final order data:', orderData);

    const order = new WholesalerOrderToSupplier(orderData);
    
    // Validate the order before saving
    const validationError = order.validateSync();
    if (validationError) {
      const errors = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Order validation failed',
        errors: errors
      });
    }

    await order.save();
    
    // Populate the order with details for response
    const populatedOrder = await WholesalerOrderToSupplier.findById(order._id)
      .populate('items.product', 'name description images measurementUnit category')
      .populate('supplier', 'businessName firstName lastName email phone')
      .populate('wholesaler', 'businessName firstName lastName email phone');

    console.log('Order created successfully:', order.orderNumber);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        orderNumber: populatedOrder.orderNumber,
        _id: populatedOrder._id,
        items: populatedOrder.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        totalAmount: populatedOrder.totalAmount,
        status: populatedOrder.status,
        supplier: populatedOrder.supplier,
        shippingAddress: populatedOrder.shippingAddress,
        createdAt: populatedOrder.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Order validation failed',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Order number already exists. Please try again.'
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Get all orders for wholesaler with pagination and filtering
const getWholesalerOrders = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { 
      status, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { wholesaler: wholesalerId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const orders = await WholesalerOrderToSupplier.find(query)
      .populate('items.product', 'name description images measurementUnit')
      .populate('supplier', 'businessName firstName lastName email phone')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single order details
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const wholesalerId = req.user.id;

    // Validate orderId format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      wholesaler: wholesalerId
    })
    .populate('items.product', 'name description images measurementUnit category tags')
    .populate('supplier', 'businessName firstName lastName email phone address city country')
    .populate('wholesaler', 'businessName firstName lastName email phone address')
    .populate('assignedTransporter', 'firstName lastName businessName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to view this order'
      });
    }

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        orderAge: Math.floor((new Date() - order.createdAt) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update order status - EXPANDED VERSION
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;
    const wholesalerId = req.user.id;

    // Validate orderId format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    // Expanded valid statuses for wholesaler
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'certified', 'return_requested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      wholesaler: wholesalerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Enhanced status transition validation
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['cancelled'],
      in_production: [], // No transitions allowed by wholesaler
      ready_for_delivery: [], // No transitions allowed by wholesaler
      assigned_to_transporter: [], // No transitions allowed by wholesaler
      accepted_by_transporter: [], // No transitions allowed by wholesaler
      in_transit: [], // No transitions allowed by wholesaler
      delivered: ['certified', 'return_requested'], // New transitions for delivered orders
      certified: [], // Final status
      return_requested: [], // Return process initiated
      return_accepted: [], // Managed by transporter/supplier
      return_in_transit: [], // Managed by transporter
      returned_to_supplier: [], // Final status
      cancelled: [] // Final status
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // Handle specific status changes
    const previousStatus = order.status;
    order.status = status;

    // Add status change notes
    if (reason) {
      const timestamp = new Date().toISOString();
      const statusNote = `[${timestamp}] Status changed from ${previousStatus} to ${status}: ${reason}`;
      order.internalNotes = order.internalNotes 
        ? `${order.internalNotes}\n${statusNote}`
        : statusNote;
      
      // Store return reason separately for return requests
      if (status === 'return_requested') {
        order.returnReason = reason;
      }
    }

    // Set timestamps for specific status changes
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      
      // NEW: Restore product quantities using bulk update when cancelling
      if (previousStatus === 'pending' || previousStatus === 'confirmed') {
        const stockUpdates = order.items.map(item => ({
          productId: item.product,
          quantity: item.quantity,
          operation: 'increase'
        }));

        try {
          await SupplierProduct.bulkUpdateStock(stockUpdates);
          console.log('Stock restored successfully for cancelled order');
        } catch (stockError) {
          console.error('Error restoring stock for cancelled order:', stockError);
          return res.status(400).json({
            success: false,
            message: `Failed to restore stock: ${stockError.message}`
          });
        }
      }
    }

    await order.save();

    // Populate the updated order for response
    const updatedOrder = await WholesalerOrderToSupplier.findById(order._id)
      .populate('items.product', 'name measurementUnit')
      .populate('supplier', 'businessName firstName lastName')
      .populate('assignedTransporter', 'firstName lastName businessName');

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        items: updatedOrder.items,
        supplier: updatedOrder.supplier,
        assignedTransporter: updatedOrder.assignedTransporter
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
};

// Get comprehensive order statistics - EXPANDED VERSION
const getOrderStatistics = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { timeframe = 'all' } = req.query;

    // Calculate date range based on timeframe
    let dateFilter = {};
    if (timeframe !== 'all') {
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
          startDate = new Date(0); // All time
      }

      dateFilter.createdAt = { $gte: startDate };
    }

    const baseMatch = { 
      wholesaler: wholesalerId,
      ...dateFilter
    };

    const statistics = await WholesalerOrderToSupplier.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmedOrders: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          inProductionOrders: { $sum: { $cond: [{ $eq: ['$status', 'in_production'] }, 1, 0] } },
          readyForDeliveryOrders: { $sum: { $cond: [{ $eq: ['$status', 'ready_for_delivery'] }, 1, 0] } },
          shippedOrders: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          certifiedOrders: { $sum: { $cond: [{ $eq: ['$status', 'certified'] }, 1, 0] } },
          returnRequestedOrders: { $sum: { $cond: [{ $eq: ['$status', 'return_requested'] }, 1, 0] } },
          returnAcceptedOrders: { $sum: { $cond: [{ $eq: ['$status', 'return_accepted'] }, 1, 0] } },
          returnInTransitOrders: { $sum: { $cond: [{ $eq: ['$status', 'return_in_transit'] }, 1, 0] } },
          returnedToSupplierOrders: { $sum: { $cond: [{ $eq: ['$status', 'returned_to_supplier'] }, 1, 0] } }
        }
      }
    ]);

    const stats = statistics[0] || {
      totalOrders: 0,
      totalAmount: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      inProductionOrders: 0,
      readyForDeliveryOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      certifiedOrders: 0,
      returnRequestedOrders: 0,
      returnAcceptedOrders: 0,
      returnInTransitOrders: 0,
      returnedToSupplierOrders: 0
    };

    // Get recent orders for activity
    const recentOrders = await WholesalerOrderToSupplier.find(baseMatch)
      .populate('supplier', 'businessName')
      .populate('assignedTransporter', 'firstName lastName businessName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber status totalAmount createdAt shippingAddress assignedTransporter');

    res.json({
      success: true,
      statistics: {
        ...stats,
        timeframe: timeframe,
        recentOrders: recentOrders
      }
    });

  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add internal notes to order
const addOrderNotes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { internalNotes } = req.body;
    const wholesalerId = req.user.id;

    // Validate orderId format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    if (!internalNotes || internalNotes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notes cannot be empty'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      wholesaler: wholesalerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Append new notes with timestamp
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${internalNotes.trim()}`;
    
    order.internalNotes = order.internalNotes 
      ? `${order.internalNotes}\n${newNote}`
      : newNote;

    await order.save();

    res.json({
      success: true,
      message: 'Internal notes added successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        internalNotes: order.internalNotes
      }
    });

  } catch (error) {
    console.error('Error adding internal notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding internal notes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get orders by supplier
const getOrdersBySupplier = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { supplierId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const orders = await WholesalerOrderToSupplier.find({
      wholesaler: wholesalerId,
      supplier: supplierId
    })
    .populate('items.product', 'name description images measurementUnit')
    .populate('assignedTransporter', 'firstName lastName businessName')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments({
      wholesaler: wholesalerId,
      supplier: supplierId
    });

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total
      }
    });

  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier orders'
    });
  }
};

// NEW: Delete order (only for pending status)
const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const wholesalerId = req.user.id;

    // Validate orderId format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      wholesaler: wholesalerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow deletion of pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be deleted'
      });
    }

    // NEW: Restore product quantities using bulk update
    const stockUpdates = order.items.map(item => ({
      productId: item.product,
      quantity: item.quantity,
      operation: 'increase'
    }));

    try {
      await SupplierProduct.bulkUpdateStock(stockUpdates);
      console.log('Stock restored successfully for deleted order');
    } catch (stockError) {
      console.error('Error restoring stock for deleted order:', stockError);
      return res.status(400).json({
        success: false,
        message: `Failed to restore stock: ${stockError.message}`
      });
    }

    // Delete the order
    await WholesalerOrderToSupplier.findByIdAndDelete(orderId);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createOrder,
  getWholesalerOrders,
  getOrderDetails,
  updateOrderStatus,
  getOrderStatistics,
  addOrderNotes,
  getOrdersBySupplier,
  deleteOrder
};