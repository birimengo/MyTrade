const RetailerOrder = require('../models/RetailerOrder');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { addSystemStockFromOrder } = require('./systemStockController');

// Create a new order with enhanced real-time notifications
exports.createOrder = async (req, res) => {
  try {
    const {
      product,
      quantity,
      deliveryPlace,
      deliveryCoordinates,
      orderNotes,
      paymentMethod = 'cash_on_delivery'
    } = req.body;

    console.log('🛒 Creating new order with data:', {
      product,
      quantity,
      deliveryPlace,
      retailer: req.user.id
    });

    // Validate required fields
    if (!product || !quantity || !deliveryPlace || !deliveryCoordinates) {
      return res.status(400).json({
        success: false,
        message: 'Product, quantity, delivery place, and coordinates are required'
      });
    }

    // Get the product details with enhanced stock validation
    const productDetails = await Product.findById(product).populate('wholesaler');
    if (!productDetails) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is available
    if (!productDetails.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available for ordering'
      });
    }

    // Enhanced stock availability check with detailed information
    if (productDetails.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${productDetails.quantity} ${productDetails.measurementUnit} available`,
        availableStock: productDetails.quantity,
        requestedQuantity: quantity,
        shortage: quantity - productDetails.quantity,
        productName: productDetails.name
      });
    }

    // Check minimum order quantity
    if (quantity < productDetails.minOrderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum order quantity is ${productDetails.minOrderQuantity} ${productDetails.measurementUnit}`,
        minOrderQuantity: productDetails.minOrderQuantity,
        requestedQuantity: quantity
      });
    }

    // Enhanced bulk discount calculation
    let bulkDiscount = null;
    let discountAmount = 0;
    
    if (productDetails.bulkDiscount && quantity >= productDetails.bulkDiscount.minQuantity) {
      bulkDiscount = {
        minQuantity: productDetails.bulkDiscount.minQuantity,
        discountPercentage: productDetails.bulkDiscount.discountPercentage,
        applied: true
      };
      discountAmount = (productDetails.price * quantity) * (productDetails.bulkDiscount.discountPercentage / 100);
    }

    // Create the order with enhanced data tracking
    const order = new RetailerOrder({
      retailer: req.user.id,
      wholesaler: productDetails.wholesaler._id,
      product: productDetails._id,
      quantity,
      unitPrice: productDetails.price,
      measurementUnit: productDetails.measurementUnit,
      deliveryPlace,
      deliveryCoordinates,
      orderNotes,
      paymentMethod,
      bulkDiscount,
      discountApplied: discountAmount,
      status: 'pending',
      // Enhanced order metadata
      metadata: {
        productCategory: productDetails.category,
        productTags: productDetails.tags,
        wholesalerBusinessName: productDetails.wholesaler.businessName,
        createdAt: new Date()
      }
    });

    // Calculate total price
    order.calculateTotal();

    // Save the order
    await order.save();
    console.log('✅ Order saved successfully:', {
      orderId: order._id,
      product: productDetails.name,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      retailer: req.user.id
    });

    // Get retailer details for notification
    const retailer = await User.findById(req.user.id);
    const retailerName = retailer.businessName || `${retailer.firstName} ${retailer.lastName}`;

    console.log('🔔 Creating notification for wholesaler:', productDetails.wholesaler._id);

    // Enhanced notification with more details
    const notification = new Notification({
      user: productDetails.wholesaler._id,
      type: 'new_order',
      title: 'New Order Received! 🛒',
      message: `You have received a new order for ${quantity} ${productDetails.measurementUnit} of ${productDetails.name} from ${retailerName}`,
      data: {
        orderId: order._id,
        productName: productDetails.name,
        productId: productDetails._id,
        quantity: quantity,
        retailerName: retailerName,
        retailerId: req.user.id,
        totalPrice: order.totalPrice,
        status: 'pending',
        measurementUnit: productDetails.measurementUnit,
        deliveryPlace: deliveryPlace,
        coordinates: deliveryCoordinates,
        orderNotes: orderNotes,
        bulkDiscountApplied: bulkDiscount?.applied || false,
        discountAmount: discountAmount,
        createdAt: new Date()
      },
      priority: 'high',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire in 7 days
    });

    await notification.save();
    console.log('✅ Notification saved:', notification._id);

    // Enhanced real-time notification system with retry logic
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      
      console.log('📢 Emitting enhanced real-time notifications to wholesaler:', productDetails.wholesaler._id);
      
      try {
        // Emit to wholesaler's personal room
        io.to(`user_${productDetails.wholesaler._id.toString()}`).emit('new_notification', {
          notification: {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            read: notification.read,
            createdAt: notification.createdAt,
            priority: notification.priority,
            expiresAt: notification.expiresAt
          },
          timestamp: new Date()
        });
        
        // Emit specific new_order event for immediate order processing
        io.to(`user_${productDetails.wholesaler._id.toString()}`).emit('new_order', {
          order: {
            _id: order._id,
            product: {
              name: productDetails.name,
              images: productDetails.images,
              category: productDetails.category,
              measurementUnit: productDetails.measurementUnit
            },
            retailer: {
              firstName: retailer.firstName,
              lastName: retailer.lastName,
              businessName: retailer.businessName,
              phone: retailer.phone,
              email: retailer.email
            },
            quantity: order.quantity,
            measurementUnit: order.measurementUnit,
            unitPrice: order.unitPrice,
            totalPrice: order.totalPrice,
            status: order.status,
            deliveryPlace: order.deliveryPlace,
            coordinates: order.deliveryCoordinates,
            createdAt: order.createdAt,
            bulkDiscount: order.bulkDiscount,
            discountApplied: order.discountApplied
          },
          notification: {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority
          },
          metadata: {
            serverTime: new Date(),
            eventType: 'new_order_created'
          }
        });

        // Emit global order creation event for any interested listeners
        io.emit('new_order_created', {
          _id: order._id,
          productName: productDetails.name,
          productId: productDetails._id,
          quantity: order.quantity,
          measurementUnit: order.measurementUnit,
          totalPrice: order.totalPrice,
          deliveryPlace: order.deliveryPlace,
          wholesalerId: productDetails.wholesaler._id,
          retailerId: req.user.id,
          product: {
            name: productDetails.name,
            category: productDetails.category
          },
          retailer: {
            firstName: retailer.firstName,
            lastName: retailer.lastName,
            businessName: retailer.businessName
          },
          timestamp: new Date()
        });

        console.log('✅ Enhanced real-time notifications emitted successfully');
      } catch (socketError) {
        console.error('❌ Socket emission error:', socketError);
        // Continue with response even if socket fails
      }
    } else {
      console.log('⚠️ Socket.IO not available for real-time notifications');
    }

    // Enhanced order population with more details
    await order.populate([
      { 
        path: 'product', 
        select: 'name description images measurementUnit category tags price costPrice' 
      },
      { 
        path: 'wholesaler', 
        select: 'businessName contactPerson phone email address rating' 
      },
      { 
        path: 'retailer', 
        select: 'firstName lastName businessName phone email address' 
      }
    ]);

    // Send enhanced response
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        ...order.toObject(),
        stockInfo: {
          availableStock: productDetails.quantity,
          remainingStock: productDetails.quantity - quantity,
          lowStockAlert: productDetails.lowStockAlert
        }
      },
      notification: {
        id: notification._id,
        message: `Wholesaler has been notified about the new order`,
        socketDelivered: !!req.app.get('socketio')
      },
      metadata: {
        orderCreated: true,
        notificationSent: true,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced get orders for retailer with advanced filtering
exports.getRetailerOrders = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      productCategory,
      minAmount,
      maxAmount
    } = req.query;
    
    const filter = { retailer: req.user.id };
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.totalPrice = {};
      if (minAmount) filter.totalPrice.$gte = parseFloat(minAmount);
      if (maxAmount) filter.totalPrice.$lte = parseFloat(maxAmount);
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await RetailerOrder.find(filter)
      .populate([
        { 
          path: 'product', 
          select: 'name description images measurementUnit category tags' 
        },
        { 
          path: 'wholesaler', 
          select: 'businessName contactPerson phone email address rating' 
        },
        { 
          path: 'transporter', 
          select: 'firstName lastName businessName phone email vehicleType' 
        },
        { 
          path: 'cancellationDetails.cancelledBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'deliveryDispute.disputedBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'returnDetails.returnedBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'assignmentHistory.transporter', 
          select: 'firstName lastName businessName' 
        }
      ])
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerOrder.countDocuments(filter);

    // Calculate additional statistics
    const stats = await RetailerOrder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalPrice' },
          averageOrderValue: { $avg: '$totalPrice' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      statistics: stats[0] || {
        totalAmount: 0,
        averageOrderValue: 0,
        orderCount: 0
      },
      filters: {
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount
      }
    });

  } catch (error) {
    console.error('Get retailer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced get orders for wholesaler with business analytics
exports.getWholesalerOrders = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      retailerId,
      productId,
      timeRange = 'all' // today, week, month, year, all
    } = req.query;
    
    const filter = { wholesaler: req.user.id };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (retailerId) {
      filter.retailer = retailerId;
    }

    if (productId) {
      filter.product = productId;
    }

    // Time range filter
    if (timeRange !== 'all') {
      const now = new Date();
      filter.createdAt = {};
      
      switch (timeRange) {
        case 'today':
          filter.createdAt.$gte = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          filter.createdAt.$gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          filter.createdAt.$gte = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          filter.createdAt.$gte = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await RetailerOrder.find(filter)
      .populate([
        { 
          path: 'product', 
          select: 'name description images measurementUnit category sku' 
        },
        { 
          path: 'retailer', 
          select: 'firstName lastName businessName phone email address' 
        },
        { 
          path: 'transporter', 
          select: 'firstName lastName businessName phone email' 
        },
        { 
          path: 'cancellationDetails.cancelledBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'deliveryDispute.disputedBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'returnDetails.returnedBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'assignmentHistory.transporter', 
          select: 'firstName lastName businessName' 
        }
      ])
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerOrder.countDocuments(filter);

    // Get business analytics
    const analytics = await RetailerOrder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          averageValue: { $avg: '$totalPrice' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      analytics,
      filters: {
        status,
        timeRange,
        retailerId,
        productId
      }
    });

  } catch (error) {
    console.error('Get wholesaler orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced get orders for transporter with assignment tracking
exports.getTransporterOrders = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10,
      assignmentType,
      includeAvailable = 'true'
    } = req.query;
    
    let filter = {
      $or: []
    };

    // Orders assigned to this transporter
    const assignedFilter = { transporter: req.user.id };
    if (status && status !== 'all') {
      assignedFilter.status = status;
    }
    filter.$or.push(assignedFilter);

    // Available orders for pickup (if includeAvailable is true)
    if (includeAvailable === 'true') {
      const availableFilter = { 
        status: 'assigned_to_transporter',
        transporter: null 
      };
      if (status && status !== 'all') {
        availableFilter.status = status;
      }
      filter.$or.push(availableFilter);
    }

    // If no conditions, set a default filter
    if (filter.$or.length === 0) {
      filter = { transporter: req.user.id };
    }

    const orders = await RetailerOrder.find(filter)
      .populate([
        { 
          path: 'product', 
          select: 'name description images measurementUnit category' 
        },
        { 
          path: 'retailer', 
          select: 'firstName lastName businessName phone email address coordinates' 
        },
        { 
          path: 'wholesaler', 
          select: 'businessName contactPerson phone email address coordinates' 
        },
        { 
          path: 'cancellationDetails.cancelledBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'deliveryDispute.disputedBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'returnDetails.returnedBy', 
          select: 'firstName lastName businessName' 
        }
      ])
      .sort({ 
        // Prioritize available orders, then by creation date
        transporter: 1,
        createdAt: -1 
      })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerOrder.countDocuments(filter);

    // Calculate transporter statistics
    const transporterStats = await RetailerOrder.aggregate([
      { $match: { transporter: req.user.id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEarnings: { 
            $sum: {
              $cond: [
                { $eq: ['$status', 'certified'] },
                '$totalPrice',
                0
              ]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      transporterStats,
      availableOrders: includeAvailable === 'true',
      filters: {
        status,
        assignmentType,
        includeAvailable
      }
    });

  } catch (error) {
    console.error('Get transporter orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced get single order with comprehensive details
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await RetailerOrder.findById(id)
      .populate([
        { 
          path: 'product', 
          select: 'name description images measurementUnit category sku price costPrice quantity lowStockAlert' 
        },
        { 
          path: 'wholesaler', 
          select: 'businessName contactPerson phone email address coordinates rating' 
        },
        { 
          path: 'retailer', 
          select: 'firstName lastName businessName phone email address coordinates' 
        },
        { 
          path: 'transporter', 
          select: 'firstName lastName businessName phone email vehicleType rating' 
        },
        { 
          path: 'cancellationDetails.cancelledBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'deliveryDispute.disputedBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'returnDetails.returnedBy', 
          select: 'firstName lastName businessName' 
        },
        { 
          path: 'assignmentHistory.transporter', 
          select: 'firstName lastName businessName phone vehicleType' 
        }
      ]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        timestamp: new Date()
      });
    }

    // Enhanced permission check
    if (!order.canUserPerformAction(req.user.id, req.user.role) && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
        requiredRole: order.getRequiredRoleForAction('view'),
        userRole: req.user.role,
        timestamp: new Date()
      });
    }

    // Get order timeline
    const timeline = await this.generateOrderTimeline(order);

    res.status(200).json({
      success: true,
      order: {
        ...order.toObject(),
        timeline,
        permissions: {
          canUpdate: order.canUserPerformAction(req.user.id, req.user.role),
          allowedStatuses: order.getAllowedTransitions(req.user.role),
          canDelete: order.status === 'pending' && req.user.role === 'retailer'
        }
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced stock management with comprehensive tracking
exports.updateProductStock = async (order) => {
  try {
    const product = await Product.findById(order.product);
    if (!product) {
      throw new Error(`Product not found: ${order.product}`);
    }

    console.log(`🔄 Updating stock for order certification:`, {
      product: product.name,
      orderId: order._id,
      quantity: order.quantity,
      currentStock: product.quantity
    });

    // Use the enhanced reduceStock method from Product model
    const stockUpdate = product.reduceStock(
      order.quantity,
      order.retailer, // Using retailer ID as the changer
      'Order certified by retailer',
      order._id,
      `Stock reduced for certified order ${order._id}`
    );

    await product.save();
    
    console.log(`✅ Stock updated successfully:`, {
      product: product.name,
      orderId: order._id,
      previousStock: stockUpdate.previousQuantity,
      newStock: stockUpdate.newQuantity,
      reduction: order.quantity,
      stockHistoryId: stockUpdate.stockHistoryId
    });
    
    return {
      product,
      stockUpdate,
      lowStockAlert: product.lowStockAlert,
      remainingStock: product.quantity
    };
  } catch (error) {
    console.error('❌ Error updating product stock:', error);
    throw error;
  }
};

// Enhanced stock restoration with comprehensive tracking
exports.restoreProductStock = async (order) => {
  try {
    const product = await Product.findById(order.product);
    if (!product) {
      throw new Error(`Product not found: ${order.product}`);
    }

    console.log(`🔄 Restoring stock for order return:`, {
      product: product.name,
      orderId: order._id,
      quantity: order.quantity,
      currentStock: product.quantity
    });

    // Use the enhanced restoreStock method from Product model
    const stockUpdate = product.restoreStock(
      order.quantity,
      order.wholesaler, // Using wholesaler ID as the changer
      'Order return accepted by wholesaler',
      order._id,
      `Stock restored for returned order ${order._id}`
    );

    await product.save();
    
    console.log(`✅ Stock restored successfully:`, {
      product: product.name,
      orderId: order._id,
      previousStock: stockUpdate.previousQuantity,
      newStock: stockUpdate.newQuantity,
      restoration: order.quantity,
      stockHistoryId: stockUpdate.stockHistoryId
    });
    
    return {
      product,
      stockUpdate,
      lowStockAlert: product.lowStockAlert,
      currentStock: product.quantity
    };
  } catch (error) {
    console.error('❌ Error restoring product stock:', error);
    throw error;
  }
};

// Enhanced update order status with comprehensive stock management
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      cancellationReason, 
      transporterId, 
      assignmentType, 
      disputeReason, 
      returnReason,
      notes 
    } = req.body;

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Enhanced permission check
    if (!order.canUserPerformAction(req.user.id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order',
        requiredRole: order.getRequiredRoleForAction('update'),
        userRole: req.user.role
      });
    }

    // Enhanced status transition validation
    if (!order.isValidTransition(status, req.user.role)) {
      const allowedTransitions = order.getAllowedTransitions(req.user.role);
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status} for ${req.user.role}`,
        currentStatus: order.status,
        requestedStatus: status,
        allowedTransitions: allowedTransitions,
        userRole: req.user.role
      });
    }

    const previousStatus = order.status;
    const updateMetadata = {
      changedBy: req.user.id,
      changedAt: new Date(),
      previousStatus: previousStatus,
      newStatus: status,
      notes: notes
    };

    // Handle cancellation/rejection by transporter
    if ((status === 'rejected_by_transporter' || status === 'cancelled_by_transporter') && cancellationReason) {
      order.cancellationDetails = {
        cancelledBy: req.user.id,
        cancelledAt: new Date(),
        reason: cancellationReason,
        previousStatus: order.status,
        userRole: req.user.role
      };
      
      // Enhanced assignment history
      order.addAssignmentHistory(
        order.transporter,
        order.assignmentHistory.length > 0 ? order.getLastAssignment().assignmentType : 'specific',
        status === 'rejected_by_transporter' ? 'rejected' : 'cancelled',
        cancellationReason,
        new Date(Date.now() + 30 * 60 * 1000) // Expire in 30 minutes
      );
      
      // Clear transporter for reassignment
      order.transporter = null;
    }

    // Handle delivery certification by retailer - ENHANCED STOCK UPDATE
    if (status === 'certified') {
      order.deliveryCertificationDate = new Date();
      order.paymentStatus = 'paid';
      
      // Enhanced product stock quantity update when order is certified
      try {
        const stockUpdateResult = await this.updateProductStock(order);
        
        console.log(`📦 Stock updated for certified order:`, {
          orderId: order._id,
          productId: order.product,
          quantityReduced: order.quantity,
          stockUpdate: stockUpdateResult.stockUpdate,
          lowStockAlert: stockUpdateResult.lowStockAlert
        });

        // Add stock update info to order metadata
        order.metadata = order.metadata || {};
        order.metadata.stockUpdate = {
          previousStock: stockUpdateResult.stockUpdate.previousQuantity,
          newStock: stockUpdateResult.stockUpdate.newQuantity,
          reducedBy: order.quantity,
          updatedAt: new Date(),
          lowStockAlertTriggered: stockUpdateResult.lowStockAlert
        };
        
      } catch (stockError) {
        console.error('❌ Error updating product stock during certification:', stockError);
        return res.status(500).json({
          success: false,
          message: 'Error updating product stock during certification',
          error: stockError.message,
          orderId: order._id,
          productId: order.product
        });
      }
      
      // Add system stock when order is certified
      try {
        await addSystemStockFromOrder(order);
      } catch (stockError) {
        console.error('Error adding system stock:', stockError);
        // Continue with order update even if system stock update fails
      }

      // Enhanced notification for certification
      const certificationNotification = await Notification.create({
        user: order.retailer,
        type: 'order_status_update',
        title: 'Order Certified ✅',
        message: `Your order for ${order.quantity} ${order.measurementUnit} of ${order.product?.name} has been certified and completed successfully. Stock has been updated.`,
        data: {
          orderId: order._id,
          status: 'certified',
          productName: order.product?.name,
          quantity: order.quantity,
          totalPrice: order.totalPrice,
          stockUpdated: true,
          deliveryCertificationDate: order.deliveryCertificationDate
        },
        priority: 'medium',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      });

      // Enhanced real-time notification for certification
      if (req.app.get('socketio')) {
        const io = req.app.get('socketio');
        io.to(`user_${order.retailer.toString()}`).emit('order_status_update', {
          orderId: order._id,
          status: 'certified',
          previousStatus: previousStatus,
          notification: certificationNotification,
          stockUpdated: true,
          timestamp: new Date()
        });
      }
    }

    // Handle delivery dispute by retailer
    if (status === 'disputed' && disputeReason) {
      order.deliveryDispute = {
        disputedBy: req.user.id,
        disputedAt: new Date(),
        reason: disputeReason,
        resolved: false,
        userRole: req.user.role
      };

      // Enhanced dispute notification
      const disputeNotification = await Notification.create({
        user: order.wholesaler,
        type: 'order_disputed',
        title: 'Order Disputed ⚠️',
        message: `Order #${order._id.toString().slice(-8)} has been disputed by the retailer. Reason: ${disputeReason}`,
        data: {
          orderId: order._id,
          status: 'disputed',
          disputeReason: disputeReason,
          retailerName: order.retailer?.businessName || `${order.retailer?.firstName} ${order.retailer?.lastName}`,
          disputedAt: new Date(),
          priority: 'high'
        },
        priority: 'high',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
      });

      // Enhanced real-time notification for dispute
      if (req.app.get('socketio')) {
        const io = req.app.get('socketio');
        io.to(`user_${order.wholesaler.toString()}`).emit('order_disputed', {
          orderId: order._id,
          disputeReason: disputeReason,
          retailer: order.retailer,
          notification: disputeNotification,
          timestamp: new Date()
        });
      }
    }

    // Handle return to wholesaler by transporter
    if (status === 'return_to_wholesaler' && returnReason) {
      order.returnDetails = {
        returnedBy: req.user.id,
        returnRequestedAt: new Date(),
        returnReason: returnReason,
        userRole: req.user.role
      };
      order.returnRequestedAt = new Date();
      order.returnReason = returnReason;

      // Enhanced return notification
      const returnNotification = await Notification.create({
        user: order.wholesaler,
        type: 'order_return',
        title: 'Return Request 🔄',
        message: `Transporter has requested to return order #${order._id.toString().slice(-8)}. Reason: ${returnReason}`,
        data: {
          orderId: order._id,
          status: 'return_to_wholesaler',
          returnReason: returnReason,
          transporterName: order.transporter?.businessName || `${order.transporter?.firstName} ${order.transporter?.lastName}`,
          returnRequestedAt: new Date()
        },
        priority: 'high',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
      });

      // Enhanced real-time notification for return request
      if (req.app.get('socketio')) {
        const io = req.app.get('socketio');
        io.to(`user_${order.wholesaler.toString()}`).emit('order_return', {
          orderId: order._id,
          returnReason: returnReason,
          transporter: order.transporter,
          notification: returnNotification,
          timestamp: new Date()
        });
      }
    }

    // Handle return acceptance by wholesaler - ENHANCED STOCK RESTORATION
    if (status === 'return_accepted') {
      order.returnDetails.returnAcceptedAt = new Date();
      order.returnCompletedAt = new Date();
      order.paymentStatus = 'refunded';
      
      // Enhanced product stock restoration when return is accepted
      try {
        const stockRestoreResult = await this.restoreProductStock(order);
        
        console.log(`📦 Stock restored for returned order:`, {
          orderId: order._id,
          productId: order.product,
          quantityRestored: order.quantity,
          stockUpdate: stockRestoreResult.stockUpdate,
          lowStockAlert: stockRestoreResult.lowStockAlert
        });

        // Add stock restoration info to order metadata
        order.metadata = order.metadata || {};
        order.metadata.stockRestoration = {
          previousStock: stockRestoreResult.stockUpdate.previousQuantity,
          newStock: stockRestoreResult.stockUpdate.newQuantity,
          restoredBy: order.quantity,
          updatedAt: new Date(),
          lowStockAlertResolved: !stockRestoreResult.lowStockAlert
        };
        
      } catch (stockError) {
        console.error('❌ Error restoring product stock during return:', stockError);
        // Continue with return processing even if stock update fails
      }

      // Enhanced return acceptance notification
      const returnAcceptNotification = await Notification.create({
        user: order.retailer,
        type: 'order_status_update',
        title: 'Return Accepted ✅',
        message: `Your return request for order #${order._id.toString().slice(-8)} has been accepted and payment has been refunded. Stock has been restored.`,
        data: {
          orderId: order._id,
          status: 'return_accepted',
          refundAmount: order.totalPrice,
          stockRestored: true,
          returnCompletedAt: order.returnCompletedAt
        },
        priority: 'medium',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      });

      // Enhanced real-time notification for return acceptance
      if (req.app.get('socketio')) {
        const io = req.app.get('socketio');
        io.to(`user_${order.retailer.toString()}`).emit('order_status_update', {
          orderId: order._id,
          status: 'return_accepted',
          refundAmount: order.totalPrice,
          notification: returnAcceptNotification,
          stockRestored: true,
          timestamp: new Date()
        });
      }
    }

    // Handle return rejection by wholesaler
    if (status === 'return_rejected') {
      order.returnDetails.returnRejectedAt = new Date();
      order.returnDetails.returnRejectionReason = returnReason;

      // Enhanced return rejection notification
      const returnRejectNotification = await Notification.create({
        user: order.retailer,
        type: 'order_status_update',
        title: 'Return Rejected ❌',
        message: `Your return request for order #${order._id.toString().slice(-8)} has been rejected. Reason: ${returnReason}`,
        data: {
          orderId: order._id,
          status: 'return_rejected',
          rejectionReason: returnReason,
          returnRejectedAt: new Date()
        },
        priority: 'medium',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      });

      // Enhanced real-time notification for return rejection
      if (req.app.get('socketio')) {
        const io = req.app.get('socketio');
        io.to(`user_${order.retailer.toString()}`).emit('order_status_update', {
          orderId: order._id,
          status: 'return_rejected',
          rejectionReason: returnReason,
          notification: returnRejectNotification,
          timestamp: new Date()
        });
      }
    }

    // Handle reassignment by wholesaler
    if (status === 'assigned_to_transporter' && 
        (order.status === 'rejected_by_transporter' || order.status === 'cancelled_by_transporter' || order.status === 'disputed' || order.status === 'return_rejected')) {
      // Clear previous cancellation/dispute/return details for reassignment
      order.cancellationDetails = undefined;
      order.deliveryDispute = undefined;
      order.returnDetails = undefined;
      order.returnReason = undefined;
      order.returnRequestedAt = undefined;
    }

    // Update order status
    order.status = status;
    order.metadata = order.metadata || {};
    order.metadata.lastStatusUpdate = updateMetadata;
    
    // Enhanced transporter assignment
    if ((transporterId && status === 'assigned_to_transporter') || 
        (status === 'accepted_by_transporter' && req.user.role === 'transporter')) {
      order.transporter = transporterId || req.user.id;
      
      // Enhanced assignment history for new assignments
      if (status === 'assigned_to_transporter') {
        order.addAssignmentHistory(
          transporterId || null,
          assignmentType || 'specific',
          'assigned',
          `Order assigned by ${req.user.role}`,
          new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire in 24 hours
        );

        // Enhanced assignment notification
        if (transporterId) {
          const assignmentNotification = await Notification.create({
            user: transporterId,
            type: 'order_assigned',
            title: 'New Order Assigned 🚚',
            message: `You have been assigned a new order for delivery. Order #${order._id.toString().slice(-8)}`,
            data: {
              orderId: order._id,
              status: 'assigned_to_transporter',
              productName: order.product?.name,
              quantity: order.quantity,
              deliveryPlace: order.deliveryPlace,
              totalPrice: order.totalPrice,
              assignmentType: assignmentType,
              assignedAt: new Date()
            },
            priority: 'high',
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
          });

          // Enhanced real-time notification for order assignment
          if (req.app.get('socketio')) {
            const io = req.app.get('socketio');
            io.to(`user_${transporterId.toString()}`).emit('order_assigned', {
              orderId: order._id,
              productName: order.product?.name,
              quantity: order.quantity,
              deliveryPlace: order.deliveryPlace,
              totalPrice: order.totalPrice,
              assignmentType: assignmentType,
              notification: assignmentNotification,
              timestamp: new Date()
            });
          }
        }
      }
    }
    
    // Enhanced delivery tracking
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();

      // Enhanced delivery notification
      const deliveryNotification = await Notification.create({
        user: order.retailer,
        type: 'order_delivered',
        title: 'Order Delivered 📦',
        message: `Your order for ${order.quantity} ${order.measurementUnit} of ${order.product?.name} has been delivered. Please certify the delivery.`,
        data: {
          orderId: order._id,
          status: 'delivered',
          productName: order.product?.name,
          quantity: order.quantity,
          actualDeliveryDate: order.actualDeliveryDate,
          transporter: order.transporter?.businessName || `${order.transporter?.firstName} ${order.transporter?.lastName}`
        },
        priority: 'medium',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      // Enhanced real-time notification for delivery
      if (req.app.get('socketio')) {
        const io = req.app.get('socketio');
        io.to(`user_${order.retailer.toString()}`).emit('order_delivered', {
          orderId: order._id,
          productName: order.product?.name,
          quantity: order.quantity,
          actualDeliveryDate: order.actualDeliveryDate,
          notification: deliveryNotification,
          timestamp: new Date()
        });
      }
    }

    // Enhanced status update notifications
    if (['accepted', 'processing', 'in_transit'].includes(status)) {
      let notificationMessage = '';
      let notificationTitle = '';

      switch (status) {
        case 'accepted':
          notificationTitle = 'Order Accepted ✅';
          notificationMessage = `Your order for ${order.quantity} ${order.measurementUnit} of ${order.product?.name} has been accepted by the wholesaler.`;
          break;
        case 'processing':
          notificationTitle = 'Order Processing ⚙️';
          notificationMessage = `Your order is now being processed by the wholesaler. Estimated delivery preparation time: 1-2 hours.`;
          break;
        case 'in_transit':
          notificationTitle = 'Order In Transit 🚛';
          notificationMessage = `Your order is now in transit and on its way to you. Estimated delivery time: 2-4 hours.`;
          break;
      }

      if (notificationMessage) {
        const statusNotification = await Notification.create({
          user: order.retailer,
          type: 'order_status_update',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            orderId: order._id,
            status: status,
            productName: order.product?.name,
            quantity: order.quantity,
            estimatedDelivery: status === 'in_transit' ? new Date(Date.now() + 4 * 60 * 60 * 1000) : null
          },
          priority: 'medium',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        // Enhanced real-time notification for status updates
        if (req.app.get('socketio')) {
          const io = req.app.get('socketio');
          io.to(`user_${order.retailer.toString()}`).emit('order_status_update', {
            orderId: order._id,
            status: status,
            previousStatus: previousStatus,
            productName: order.product?.name,
            notification: statusNotification,
            timestamp: new Date()
          });
        }
      }
    }

    await order.save();

    // Enhanced order population
    await order.populate([
      { 
        path: 'product', 
        select: 'name description images measurementUnit category sku price quantity lowStockAlert' 
      },
      { 
        path: 'retailer', 
        select: 'firstName lastName businessName phone email address' 
      },
      { 
        path: 'transporter', 
        select: 'firstName lastName businessName phone email vehicleType rating' 
      },
      { 
        path: 'cancellationDetails.cancelledBy', 
        select: 'firstName lastName businessName' 
      },
      { 
        path: 'deliveryDispute.disputedBy', 
        select: 'firstName lastName businessName' 
      },
      { 
        path: 'returnDetails.returnedBy', 
        select: 'firstName lastName businessName' 
      },
      { 
        path: 'assignmentHistory.transporter', 
        select: 'firstName lastName businessName phone vehicleType' 
      }
    ]);

    // Enhanced response with additional metadata
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order,
      statusUpdate: {
        previousStatus,
        newStatus: status,
        changedBy: req.user.id,
        changedAt: new Date(),
        stockUpdated: status === 'certified',
        stockRestored: status === 'return_accepted'
      },
      metadata: {
        notificationSent: true,
        socketEmitted: !!req.app.get('socketio'),
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced resolve delivery dispute with comprehensive resolution tracking
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes, reassign, compensationAmount, resolutionType } = req.body;

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Enhanced authorization check
    if (order.wholesaler.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to resolve this dispute',
        requiredRole: ['wholesaler', 'admin'],
        userRole: req.user.role
      });
    }

    // Enhanced status validation
    if (order.status !== 'disputed') {
      return res.status(400).json({
        success: false,
        message: 'Order is not in disputed status',
        currentStatus: order.status,
        requiredStatus: 'disputed'
      });
    }

    // Enhanced dispute resolution tracking
    order.deliveryDispute.resolved = true;
    order.deliveryDispute.resolvedAt = new Date();
    order.deliveryDispute.resolutionNotes = resolutionNotes;
    order.deliveryDispute.resolvedBy = req.user.id;
    order.deliveryDispute.resolutionType = resolutionType || 'standard';
    
    if (compensationAmount) {
      order.deliveryDispute.compensationAmount = compensationAmount;
    }

    // Enhanced reassignment logic
    if (reassign) {
      order.status = 'assigned_to_transporter';
      order.transporter = null;
      order.deliveryDispute.reassigned = true;
      order.deliveryDispute.reassignmentDate = new Date();
    } else {
      order.status = 'certified';
      order.deliveryCertificationDate = new Date();
      order.paymentStatus = 'paid';
    }

    await order.save();

    // Enhanced dispute resolution notification
    const disputeResolutionNotification = await Notification.create({
      user: order.retailer,
      type: 'order_status_update',
      title: 'Dispute Resolved ✅',
      message: `The dispute for order #${order._id.toString().slice(-8)} has been resolved. ${resolutionNotes}`,
      data: {
        orderId: order._id,
        status: reassign ? 'assigned_to_transporter' : 'certified',
        resolutionNotes: resolutionNotes,
        resolutionType: order.deliveryDispute.resolutionType,
        compensationAmount: order.deliveryDispute.compensationAmount,
        resolvedBy: req.user.id,
        resolvedAt: new Date()
      },
      priority: 'medium',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    });

    // Enhanced real-time notification for dispute resolution
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      io.to(`user_${order.retailer.toString()}`).emit('order_status_update', {
        orderId: order._id,
        status: reassign ? 'assigned_to_transporter' : 'certified',
        resolutionNotes: resolutionNotes,
        resolutionType: order.deliveryDispute.resolutionType,
        compensationAmount: order.deliveryDispute.compensationAmount,
        notification: disputeResolutionNotification,
        timestamp: new Date()
      });
    }

    // Enhanced order population
    await order.populate([
      { 
        path: 'product', 
        select: 'name description images measurementUnit' 
      },
      { 
        path: 'retailer', 
        select: 'firstName lastName businessName phone email' 
      },
      { 
        path: 'transporter', 
        select: 'firstName lastName businessName phone email' 
      },
      { 
        path: 'deliveryDispute.disputedBy', 
        select: 'firstName lastName businessName' 
      },
      { 
        path: 'deliveryDispute.resolvedBy', 
        select: 'firstName lastName businessName' 
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      order,
      resolutionDetails: {
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
        resolutionType: order.deliveryDispute.resolutionType,
        compensationAmount: order.deliveryDispute.compensationAmount,
        reassigned: reassign
      }
    });

  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resolving dispute',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced handle return request with comprehensive tracking
exports.handleReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      action, 
      rejectionReason, 
      returnNotes,
      inspectionNotes,
      condition 
    } = req.body;

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Enhanced authorization check
    if (order.wholesaler.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to handle this return request',
        requiredRole: ['wholesaler', 'admin'],
        userRole: req.user.role
      });
    }

    // Enhanced status validation
    if (order.status !== 'return_to_wholesaler') {
      return res.status(400).json({
        success: false,
        message: 'Order is not in return requested status',
        currentStatus: order.status,
        requiredStatus: 'return_to_wholesaler'
      });
    }

    // Enhanced return handling with comprehensive tracking
    if (action === 'accept') {
      // Accept the return with enhanced tracking
      order.status = 'return_accepted';
      order.returnDetails.returnAcceptedAt = new Date();
      order.returnDetails.returnCompletedAt = new Date();
      order.returnDetails.returnNotes = returnNotes;
      order.returnDetails.inspectionNotes = inspectionNotes;
      order.returnDetails.condition = condition || 'good';
      order.returnDetails.handledBy = req.user.id;
      order.paymentStatus = 'refunded';
      
      // Enhanced stock restoration
      try {
        const stockRestoreResult = await this.restoreProductStock(order);
        order.metadata = order.metadata || {};
        order.metadata.returnStockRestoration = {
          previousStock: stockRestoreResult.stockUpdate.previousQuantity,
          newStock: stockRestoreResult.stockUpdate.newQuantity,
          restoredBy: order.quantity,
          updatedAt: new Date()
        };
      } catch (stockError) {
        console.error('Error restoring stock during return acceptance:', stockError);
      }
    } else if (action === 'reject') {
      // Enhanced return rejection
      order.status = 'return_rejected';
      order.returnDetails.returnRejectedAt = new Date();
      order.returnDetails.returnRejectionReason = rejectionReason;
      order.returnDetails.returnNotes = returnNotes;
      order.returnDetails.handledBy = req.user.id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "accept" or "reject"',
        validActions: ['accept', 'reject']
      });
    }

    await order.save();

    // Enhanced notification based on action
    let notification;
    if (action === 'accept') {
      notification = await Notification.create({
        user: order.retailer,
        type: 'order_status_update',
        title: 'Return Accepted ✅',
        message: `Your return request for order #${order._id.toString().slice(-8)} has been accepted and payment has been refunded.`,
        data: {
          orderId: order._id,
          status: 'return_accepted',
          refundAmount: order.totalPrice,
          returnNotes: returnNotes,
          inspectionNotes: inspectionNotes,
          condition: order.returnDetails.condition,
          stockRestored: true,
          returnCompletedAt: order.returnCompletedAt
        },
        priority: 'medium',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      });
    } else {
      notification = await Notification.create({
        user: order.retailer,
        type: 'order_status_update',
        title: 'Return Rejected ❌',
        message: `Your return request for order #${order._id.toString().slice(-8)} has been rejected. Reason: ${rejectionReason}`,
        data: {
          orderId: order._id,
          status: 'return_rejected',
          rejectionReason: rejectionReason,
          returnNotes: returnNotes,
          returnRejectedAt: new Date()
        },
        priority: 'medium',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      });
    }

    // Enhanced real-time notification for return handling
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      io.to(`user_${order.retailer.toString()}`).emit('order_status_update', {
        orderId: order._id,
        status: action === 'accept' ? 'return_accepted' : 'return_rejected',
        refundAmount: action === 'accept' ? order.totalPrice : null,
        rejectionReason: action === 'reject' ? rejectionReason : null,
        returnNotes: returnNotes,
        notification: notification,
        timestamp: new Date()
      });
    }

    // Enhanced order population
    await order.populate([
      { 
        path: 'product', 
        select: 'name description images measurementUnit' 
      },
      { 
        path: 'retailer', 
        select: 'firstName lastName businessName phone email' 
      },
      { 
        path: 'transporter', 
        select: 'firstName lastName businessName phone email' 
      },
      { 
        path: 'returnDetails.returnedBy', 
        select: 'firstName lastName businessName' 
      },
      { 
        path: 'returnDetails.handledBy', 
        select: 'firstName lastName businessName' 
      }
    ]);

    res.status(200).json({
      success: true,
      message: `Return request ${action}ed successfully`,
      order,
      returnDetails: {
        action: action,
        handledBy: req.user.id,
        handledAt: new Date(),
        ...(action === 'accept' && {
          refundAmount: order.totalPrice,
          stockRestored: true
        }),
        ...(action === 'reject' && {
          rejectionReason: rejectionReason
        })
      }
    });

  } catch (error) {
    console.error('Handle return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while handling return request',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced delete order with comprehensive validation
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Enhanced authorization check
    if (!order.canUserPerformAction(req.user.id, 'retailer') && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this order',
        requiredRole: ['retailer', 'admin'],
        userRole: req.user.role
      });
    }

    // Enhanced deletion validation
    const deletableStatuses = ['pending', 'rejected', 'return_rejected', 'cancelled_by_wholesaler'];
    if (!deletableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be deleted in ${order.status} status`,
        currentStatus: order.status,
        deletableStatuses: deletableStatuses
      });
    }

    // Enhanced deletion with metadata
    const deletionMetadata = {
      deletedBy: req.user.id,
      deletedAt: new Date(),
      previousStatus: order.status,
      orderValue: order.totalPrice,
      product: order.product,
      retailer: order.retailer
    };

    await RetailerOrder.findByIdAndDelete(id);

    // Log deletion for audit purposes
    console.log('🗑️ Order deleted:', deletionMetadata);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      deletionMetadata: {
        deletedAt: deletionMetadata.deletedAt,
        orderId: id,
        previousStatus: order.status
      }
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting order',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced order statistics with comprehensive analytics
exports.getOrderStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { timeRange = 'month', productId, retailerId } = req.query;

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
        startDate = new Date(0); // All time
    }
    
    if (timeRange !== 'all') {
      filter.createdAt = { $gte: startDate };
    }

    // Additional filters
    if (productId) {
      filter.product = productId;
    }
    
    if (retailerId && userRole === 'wholesaler') {
      filter.retailer = retailerId;
    }

    // Enhanced statistics aggregation
    const statistics = await RetailerOrder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          averageOrderValue: { $avg: '$totalPrice' },
          totalQuantity: { $sum: '$quantity' },
          minOrderValue: { $min: '$totalPrice' },
          maxOrderValue: { $max: '$totalPrice' }
        }
      }
    ]);

    const total = await RetailerOrder.countDocuments(filter);
    
    // Enhanced revenue calculation
    const totalRevenue = await RetailerOrder.aggregate([
      { $match: filter },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$totalPrice' },
          completedRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['certified', 'delivered']] },
                '$totalPrice',
                0
              ]
            }
          },
          pendingRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'accepted', 'processing', 'assigned_to_transporter', 'in_transit']] },
                '$totalPrice',
                0
              ]
            }
          }
        } 
      }
    ]);

    // Additional analytics for wholesalers
    let productAnalytics = [];
    let retailerAnalytics = [];
    
    if (userRole === 'wholesaler') {
      productAnalytics = await RetailerOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$product',
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: '$totalPrice' },
            totalQuantity: { $sum: '$quantity' },
            averageOrderValue: { $avg: '$totalPrice' }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ]);

      retailerAnalytics = await RetailerOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$retailer',
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: '$totalPrice' },
            totalQuantity: { $sum: '$quantity' },
            averageOrderValue: { $avg: '$totalPrice' },
            lastOrderDate: { $max: '$createdAt' }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ]);
    }

    res.status(200).json({
      success: true,
      statistics,
      totalOrders: total,
      revenue: totalRevenue[0] || {
        total: 0,
        completedRevenue: 0,
        pendingRevenue: 0
      },
      timeRange: {
        type: timeRange,
        startDate: timeRange !== 'all' ? startDate : null,
        endDate: now
      },
      ...(userRole === 'wholesaler' && {
        productAnalytics,
        retailerAnalytics
      }),
      filters: {
        productId,
        retailerId
      }
    });

  } catch (error) {
    console.error('Get order statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced pending orders count with additional metrics
exports.getPendingOrdersCount = async (req, res) => {
  try {
    const { includeAnalytics = 'false' } = req.query;

    const pendingCount = await RetailerOrder.countDocuments({
      wholesaler: req.user.id,
      status: 'pending'
    });

    // Enhanced response with additional metrics
    const response = {
      success: true,
      pendingOrdersCount: pendingCount,
      timestamp: new Date()
    };

    // Include additional analytics if requested
    if (includeAnalytics === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = await RetailerOrder.countDocuments({
        wholesaler: req.user.id,
        createdAt: { $gte: today }
      });

      const urgentOrders = await RetailerOrder.countDocuments({
        wholesaler: req.user.id,
        status: 'pending',
        createdAt: { $lte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Older than 2 hours
      });

      response.analytics = {
        todayOrders,
        urgentOrders,
        responseRate: pendingCount > 0 ? Math.round((todayOrders / pendingCount) * 100) : 0
      };
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Get pending orders count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending orders count',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced debug endpoint with comprehensive order analysis
exports.debugOrderNotification = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await RetailerOrder.findById(orderId)
      .populate('retailer', 'firstName lastName businessName phone email')
      .populate('wholesaler', 'firstName lastName businessName phone email')
      .populate('transporter', 'firstName lastName businessName phone email')
      .populate('product', 'name sku category measurementUnit');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Enhanced notification check
    const notifications = await Notification.find({
      'data.orderId': orderId
    }).sort({ createdAt: -1 });

    // Socket connection check
    const socketAvailable = !!req.app.get('socketio');
    let socketStatus = 'unavailable';
    
    if (socketAvailable) {
      const io = req.app.get('socketio');
      // Check if users are connected
      const wholesalerConnected = io.sockets.adapter.rooms.has(`user_${order.wholesaler._id.toString()}`);
      const retailerConnected = io.sockets.adapter.rooms.has(`user_${order.retailer._id.toString()}`);
      socketStatus = {
        wholesalerConnected,
        retailerConnected,
        transporterConnected: order.transporter ? 
          io.sockets.adapter.rooms.has(`user_${order.transporter._id.toString()}`) : false
      };
    }

    // Order timeline reconstruction
    const timeline = await this.generateOrderTimeline(order);

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
        timeline: timeline
      },
      notifications: notifications.map(notif => ({
        id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        createdAt: notif.createdAt,
        expiresAt: notif.expiresAt,
        priority: notif.priority
      })),
      notificationCount: notifications.length,
      socketStatus: {
        available: socketAvailable,
        connections: socketStatus
      },
      systemInfo: {
        serverTime: new Date(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('Debug order notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced test notification endpoint
exports.testOrderNotification = async (req, res) => {
  try {
    const { 
      wholesalerId, 
      productName, 
      quantity, 
      measurementUnit,
      testType = 'basic'
    } = req.body;

    const targetWholesalerId = wholesalerId || req.user.id;

    console.log('🧪 Testing order notification for wholesaler:', targetWholesalerId);

    // Enhanced test notification creation
    const testNotification = await Notification.create({
      user: targetWholesalerId,
      type: 'new_order',
      title: 'Test Order Notification 🧪',
      message: `Test order for ${quantity || 5} ${measurementUnit || 'kg'} of ${productName || 'Test Product'}`,
      data: {
        orderId: 'test_' + Date.now(),
        productName: productName || 'Test Product',
        quantity: quantity || 5,
        retailerName: 'Test Retailer',
        totalPrice: 25000,
        status: 'pending',
        measurementUnit: measurementUnit || 'kg',
        deliveryPlace: 'Test Location',
        test: true,
        testType: testType,
        testTimestamp: new Date()
      },
      priority: 'high',
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour for tests
    });

    // Enhanced real-time test notification with multiple event types
    if (req.app.get('socketio')) {
      const io = req.app.get('socketio');
      
      try {
        // Basic notification
        io.to(`user_${targetWholesalerId.toString()}`).emit('new_notification', {
          notification: {
            _id: testNotification._id,
            type: testNotification.type,
            title: testNotification.title,
            message: testNotification.message,
            data: testNotification.data,
            read: testNotification.read,
            createdAt: testNotification.createdAt,
            priority: testNotification.priority,
            expiresAt: testNotification.expiresAt
          },
          test: true,
          timestamp: new Date()
        });

        // Order-specific event
        io.to(`user_${targetWholesalerId.toString()}`).emit('new_order', {
          order: {
            _id: 'test_' + Date.now(),
            product: {
              name: productName || 'Test Product',
              images: [],
              category: 'Test Category',
              measurementUnit: measurementUnit || 'kg'
            },
            retailer: {
              firstName: 'Test',
              lastName: 'Retailer',
              businessName: 'Test Business',
              phone: '+1234567890',
              email: 'test@retailer.com'
            },
            quantity: quantity || 5,
            measurementUnit: measurementUnit || 'kg',
            unitPrice: 5000,
            totalPrice: 25000,
            status: 'pending',
            deliveryPlace: 'Test Location',
            createdAt: new Date(),
            bulkDiscount: null,
            discountApplied: 0
          },
          notification: {
            _id: testNotification._id,
            title: testNotification.title,
            message: testNotification.message,
            type: testNotification.type,
            priority: testNotification.priority
          },
          test: true,
          timestamp: new Date()
        });

        // Additional test events based on test type
        if (testType === 'comprehensive') {
          io.to(`user_${targetWholesalerId.toString()}`).emit('test_event', {
            type: 'comprehensive_test',
            data: {
              orderCount: 5,
              revenue: 125000,
              products: ['Test Product 1', 'Test Product 2'],
              timestamp: new Date()
            }
          });
        }

        console.log('✅ Enhanced test notifications emitted successfully');
      } catch (socketError) {
        console.error('❌ Test socket emission error:', socketError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      notification: testNotification,
      socketAvailable: !!req.app.get('socketio'),
      testDetails: {
        targetUser: targetWholesalerId,
        testType: testType,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Test order notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Test notification failed',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// Enhanced notification status with comprehensive user data
exports.getNotificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      includeRead = 'false', 
      limit = 10, 
      type,
      priority 
    } = req.query;

    // Enhanced notification filter
    const filter = { user: userId };
    
    if (includeRead === 'false') {
      filter.read = false;
    }
    
    if (type) {
      filter.type = type;
    }
    
    if (priority) {
      filter.priority = priority;
    }

    // Enhanced notification query with sorting and limiting
    const recentNotifications = await Notification.find(filter)
      .sort({ 
        priority: -1, 
        createdAt: -1 
      })
      .limit(parseInt(limit))
      .select('type title message read createdAt data priority expiresAt');

    const unreadCount = await Notification.countDocuments({ 
      user: userId, 
      read: false 
    });

    const totalCount = await Notification.countDocuments({ user: userId });

    // Notification statistics
    const notificationStats = await Notification.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
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
      connectionStatus = io.sockets.adapter.rooms.has(`user_${userId}`) ? 
        'connected' : 'disconnected';
    }

    res.status(200).json({
      success: true,
      unreadCount,
      totalCount,
      recentNotifications,
      notificationStats,
      socketStatus: {
        available: socketAvailable,
        connection: connectionStatus,
        userRoom: `user_${userId}`
      },
      filters: {
        includeRead: includeRead === 'true',
        limit: parseInt(limit),
        type,
        priority
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
};

// ==================== ENHANCED HELPER METHODS ====================

// Generate comprehensive order timeline
exports.generateOrderTimeline = async (order) => {
  const timeline = [];
  
  // Order creation
  timeline.push({
    event: 'order_created',
    timestamp: order.createdAt,
    description: 'Order placed by retailer',
    user: order.retailer,
    status: 'pending'
  });

  // Status changes from assignment history
  if (order.assignmentHistory && order.assignmentHistory.length > 0) {
    order.assignmentHistory.forEach(assignment => {
      timeline.push({
        event: `transporter_${assignment.status}`,
        timestamp: assignment.assignedAt,
        description: `Order ${assignment.status} by transporter`,
        user: assignment.transporter,
        status: order.status,
        assignmentType: assignment.assignmentType,
        reason: assignment.reason
      });
    });
  }

  // Cancellation events
  if (order.cancellationDetails) {
    timeline.push({
      event: 'order_cancelled',
      timestamp: order.cancellationDetails.cancelledAt,
      description: `Order cancelled: ${order.cancellationDetails.reason}`,
      user: order.cancellationDetails.cancelledBy,
      status: order.status,
      previousStatus: order.cancellationDetails.previousStatus
    });
  }

  // Delivery events
  if (order.actualDeliveryDate) {
    timeline.push({
      event: 'order_delivered',
      timestamp: order.actualDeliveryDate,
      description: 'Order delivered to retailer',
      user: order.transporter,
      status: 'delivered'
    });
  }

  // Certification events
  if (order.deliveryCertificationDate) {
    timeline.push({
      event: 'order_certified',
      timestamp: order.deliveryCertificationDate,
      description: 'Order certified by retailer',
      user: order.retailer,
      status: 'certified',
      stockUpdated: true
    });
  }

  // Dispute events
  if (order.deliveryDispute) {
    timeline.push({
      event: 'order_disputed',
      timestamp: order.deliveryDispute.disputedAt,
      description: `Order disputed: ${order.deliveryDispute.reason}`,
      user: order.deliveryDispute.disputedBy,
      status: 'disputed'
    });

    if (order.deliveryDispute.resolvedAt) {
      timeline.push({
        event: 'dispute_resolved',
        timestamp: order.deliveryDispute.resolvedAt,
        description: `Dispute resolved: ${order.deliveryDispute.resolutionNotes}`,
        user: order.deliveryDispute.resolvedBy,
        status: order.status,
        resolutionType: order.deliveryDispute.resolutionType
      });
    }
  }

  // Return events
  if (order.returnDetails) {
    if (order.returnDetails.returnRequestedAt) {
      timeline.push({
        event: 'return_requested',
        timestamp: order.returnDetails.returnRequestedAt,
        description: `Return requested: ${order.returnDetails.returnReason}`,
        user: order.returnDetails.returnedBy,
        status: 'return_to_wholesaler'
      });
    }

    if (order.returnDetails.returnAcceptedAt) {
      timeline.push({
        event: 'return_accepted',
        timestamp: order.returnDetails.returnAcceptedAt,
        description: 'Return accepted by wholesaler',
        user: order.returnDetails.handledBy,
        status: 'return_accepted',
        stockRestored: true
      });
    }

    if (order.returnDetails.returnRejectedAt) {
      timeline.push({
        event: 'return_rejected',
        timestamp: order.returnDetails.returnRejectedAt,
        description: `Return rejected: ${order.returnDetails.returnRejectionReason}`,
        user: order.returnDetails.handledBy,
        status: 'return_rejected'
      });
    }
  }

  // Sort timeline by timestamp
  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Enhanced order validation helper
exports.validateOrderCreation = async (productId, quantity, retailerId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  if (!product.isActive) {
    throw new Error('Product is not available for ordering');
  }

  if (product.quantity < quantity) {
    throw new Error(`Insufficient stock. Available: ${product.quantity}, Requested: ${quantity}`);
  }

  if (quantity < product.minOrderQuantity) {
    throw new Error(`Minimum order quantity is ${product.minOrderQuantity}`);
  }

  return {
    product,
    wholesaler: product.wholesaler,
    unitPrice: product.price,
    measurementUnit: product.measurementUnit,
    validation: {
      stockAvailable: true,
      minQuantityMet: true,
      productActive: true
    }
  };
};

// Enhanced stock management helper
exports.getProductStockInfo = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const stockAnalytics = product.getStockAnalytics(30); // 30 days analytics

  return {
    productId: product._id,
    productName: product.name,
    currentStock: product.quantity,
    measurementUnit: product.measurementUnit,
    lowStockAlert: product.lowStockAlert,
    lowStockThreshold: product.lowStockThreshold,
    originalStockQuantity: product.originalStockQuantity,
    stockValue: product.stockValue,
    potentialRevenue: product.potentialRevenue,
    analytics: stockAnalytics,
    lastStockUpdate: product.lastStockUpdate
  };
};