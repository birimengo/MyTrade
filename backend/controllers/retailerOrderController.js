const RetailerOrder = require('../models/RetailerOrder');
const Product = require('../models/Product');
const User = require('../models/User');
const { addSystemStockFromOrder } = require('./systemStockController');

// Create a new order
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

    // Validate required fields
    if (!product || !quantity || !deliveryPlace || !deliveryCoordinates) {
      return res.status(400).json({
        success: false,
        message: 'Product, quantity, delivery place, and coordinates are required'
      });
    }

    // Get the product details
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

    // Check stock availability
    if (productDetails.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${productDetails.quantity} ${productDetails.measurementUnit} available`
      });
    }

    // Check minimum order quantity
    if (quantity < productDetails.minOrderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum order quantity is ${productDetails.minOrderQuantity} ${productDetails.measurementUnit}`
      });
    }

    // Calculate bulk discount if applicable
    let bulkDiscount = null;
    if (productDetails.bulkDiscount && quantity >= productDetails.bulkDiscount.minQuantity) {
      bulkDiscount = {
        minQuantity: productDetails.bulkDiscount.minQuantity,
        discountPercentage: productDetails.bulkDiscount.discountPercentage,
        applied: true
      };
    }

    // Create the order
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
      status: 'pending' // Order starts as pending
    });

    // Calculate total price
    order.calculateTotal();

    // Save the order
    await order.save();

    // Populate the order with necessary details
    await order.populate([
      { path: 'product', select: 'name description images' },
      { path: 'wholesaler', select: 'businessName contactPerson phone' },
      { path: 'retailer', select: 'firstName lastName businessName phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message
    });
  }
};

// Get orders for retailer
exports.getRetailerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { retailer: req.user.id };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await RetailerOrder.find(filter)
      .populate([
        { path: 'product', select: 'name description images measurementUnit' },
        { path: 'wholesaler', select: 'businessName contactPerson phone email' },
        { path: 'transporter', select: 'firstName lastName businessName phone email' },
        { path: 'cancellationDetails.cancelledBy', select: 'firstName lastName businessName' },
        { path: 'deliveryDispute.disputedBy', select: 'firstName lastName businessName' },
        { path: 'returnDetails.returnedBy', select: 'firstName lastName businessName' },
        { path: 'assignmentHistory.transporter', select: 'firstName lastName businessName' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerOrder.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get retailer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// Get orders for wholesaler
exports.getWholesalerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { wholesaler: req.user.id };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await RetailerOrder.find(filter)
      .populate([
        { path: 'product', select: 'name description images measurementUnit' },
        { path: 'retailer', select: 'firstName lastName businessName phone email' },
        { path: 'transporter', select: 'firstName lastName businessName phone email' },
        { path: 'cancellationDetails.cancelledBy', select: 'firstName lastName businessName' },
        { path: 'deliveryDispute.disputedBy', select: 'firstName lastName businessName' },
        { path: 'returnDetails.returnedBy', select: 'firstName lastName businessName' },
        { path: 'assignmentHistory.transporter', select: 'firstName lastName businessName' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerOrder.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get wholesaler orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// Get orders for transporter
exports.getTransporterOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filter = {
      $or: [
        { transporter: req.user.id },
        { 
          status: 'assigned_to_transporter',
          transporter: null 
        }
      ]
    };
    
    if (status && status !== 'all') {
      // If a status is specified, we filter both assigned and unassigned by that status
      filter.$or[0].status = status;
      filter.$or[1].status = status;
    }

    const orders = await RetailerOrder.find(filter)
      .populate([
        { path: 'product', select: 'name description images measurementUnit' },
        { path: 'retailer', select: 'firstName lastName businessName phone email address' },
        { path: 'wholesaler', select: 'businessName contactPerson phone email address' },
        { path: 'cancellationDetails.cancelledBy', select: 'firstName lastName businessName' },
        { path: 'deliveryDispute.disputedBy', select: 'firstName lastName businessName' },
        { path: 'returnDetails.returnedBy', select: 'firstName lastName businessName' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerOrder.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get transporter orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await RetailerOrder.findById(id)
      .populate([
        { path: 'product', select: 'name description images measurementUnit' },
        { path: 'wholesaler', select: 'businessName contactPerson phone email address' },
        { path: 'retailer', select: 'firstName lastName businessName phone email address' },
        { path: 'transporter', select: 'firstName lastName businessName phone email address' },
        { path: 'cancellationDetails.cancelledBy', select: 'firstName lastName businessName' },
        { path: 'deliveryDispute.disputedBy', select: 'firstName lastName businessName' },
        { path: 'returnDetails.returnedBy', select: 'firstName lastName businessName' },
        { path: 'assignmentHistory.transporter', select: 'firstName lastName businessName' }
      ]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has permission to view this order
    if (!order.canUserPerformAction(req.user.id, req.user.role) && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: error.message
    });
  }
};

// Update product stock when order is certified
exports.updateProductStock = async (order) => {
  try {
    const product = await Product.findById(order.product);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if there's sufficient stock
    if (product.quantity < order.quantity) {
      throw new Error(`Insufficient stock. Available: ${product.quantity}, Ordered: ${order.quantity}`);
    }

    // Store original stock quantity if not already set
    if (!product.originalStockQuantity) {
      product.originalStockQuantity = product.quantity;
    }

    // Update product quantity
    const previousQuantity = product.quantity;
    product.quantity -= order.quantity;
    
    // Calculate low stock threshold (50% of original stock)
    const lowStockThreshold = product.originalStockQuantity * 0.5;
    
    // Set low stock alert if quantity falls below 50% threshold
    const wasLowStock = product.lowStockAlert;
    product.lowStockAlert = product.quantity <= lowStockThreshold;
    
    if (product.lowStockAlert && !wasLowStock) {
      product.lowStockAlertAt = new Date();
      console.log(`Low stock alert triggered for product: ${product.name}`);
    }
    
    product.lastStockUpdate = new Date();

    await product.save();
    
    console.log(`Product stock updated: ${product.name} - Previous: ${previousQuantity}, New: ${product.quantity}, Low Stock Alert: ${product.lowStockAlert}`);
    
    return product;
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};

// Restore product stock when return is accepted
exports.restoreProductStock = async (order) => {
  try {
    const product = await Product.findById(order.product);
    if (!product) {
      throw new Error('Product not found');
    }

    // Restore product quantity
    const previousQuantity = product.quantity;
    product.quantity += order.quantity;
    
    // Recalculate low stock alert
    if (product.originalStockQuantity) {
      const lowStockThreshold = product.originalStockQuantity * 0.5;
      product.lowStockAlert = product.quantity <= lowStockThreshold;
    }
    
    product.lastStockUpdate = new Date();

    await product.save();
    
    console.log(`Product stock restored: ${product.name} - Previous: ${previousQuantity}, New: ${product.quantity}, Low Stock Alert: ${product.lowStockAlert}`);
    
    return product;
  } catch (error) {
    console.error('Error restoring product stock:', error);
    throw error;
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason, transporterId, assignmentType, disputeReason, returnReason } = req.body;

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has permission to update this order
    if (!order.canUserPerformAction(req.user.id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    // Check if status transition is valid
    if (!order.isValidTransition(status, req.user.role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status} for ${req.user.role}`
      });
    }

    // Handle cancellation/rejection by transporter
    if ((status === 'rejected_by_transporter' || status === 'cancelled_by_transporter') && cancellationReason) {
      order.cancellationDetails = {
        cancelledBy: req.user.id,
        cancelledAt: new Date(),
        reason: cancellationReason,
        previousStatus: order.status
      };
      
      // Add to assignment history
      order.addAssignmentHistory(
        order.transporter,
        order.assignmentHistory.length > 0 ? order.getLastAssignment().assignmentType : 'specific',
        status === 'rejected_by_transporter' ? 'rejected' : 'cancelled',
        cancellationReason
      );
      
      // Clear transporter for reassignment
      order.transporter = null;
    }

    // Handle delivery certification by retailer - UPDATE STOCK HERE
    if (status === 'certified') {
      order.deliveryCertificationDate = new Date();
      order.paymentStatus = 'paid'; // Automatically mark as paid when certified
      
      // Update product stock quantity when order is certified
      try {
        await this.updateProductStock(order);
      } catch (stockError) {
        console.error('Error updating product stock:', stockError);
        return res.status(500).json({
          success: false,
          message: 'Error updating product stock',
          error: stockError.message
        });
      }
      
      // Add system stock when order is certified
      try {
        await addSystemStockFromOrder(order);
      } catch (stockError) {
        console.error('Error adding system stock:', stockError);
        // Continue with order update even if system stock update fails
      }
    }

    // Handle delivery dispute by retailer
    if (status === 'disputed' && disputeReason) {
      order.deliveryDispute = {
        disputedBy: req.user.id,
        disputedAt: new Date(),
        reason: disputeReason,
        resolved: false
      };
    }

    // Handle return to wholesaler by transporter
    if (status === 'return_to_wholesaler' && returnReason) {
      order.returnDetails = {
        returnedBy: req.user.id,
        returnRequestedAt: new Date(),
        returnReason: returnReason
      };
      order.returnRequestedAt = new Date();
      order.returnReason = returnReason;
    }

    // Handle return acceptance by wholesaler - RESTORE STOCK HERE
    if (status === 'return_accepted') {
      order.returnDetails.returnAcceptedAt = new Date();
      order.returnCompletedAt = new Date();
      order.paymentStatus = 'refunded'; // Refund payment when return is accepted
      
      // Restore product stock quantity when return is accepted
      try {
        await this.restoreProductStock(order);
      } catch (stockError) {
        console.error('Error restoring product stock:', stockError);
        // Continue with return processing even if stock update fails
      }
    }

    // Handle return rejection by wholesaler
    if (status === 'return_rejected') {
      order.returnDetails.returnRejectedAt = new Date();
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
    
    // Assign transporter if provided OR if transporter is accepting a free order
    if ((transporterId && status === 'assigned_to_transporter') || 
        (status === 'accepted_by_transporter' && req.user.role === 'transporter')) {
      order.transporter = transporterId || req.user.id;
      
      // Add to assignment history for new assignments
      if (status === 'assigned_to_transporter') {
        order.addAssignmentHistory(
          transporterId || null,
          assignmentType || 'specific',
          'assigned'
        );
      }
    }
    
    // Set actual delivery date if status is delivered
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    await order.populate([
      { path: 'product', select: 'name description images' },
      { path: 'retailer', select: 'firstName lastName businessName phone' },
      { path: 'transporter', select: 'firstName lastName businessName phone' },
      { path: 'cancellationDetails.cancelledBy', select: 'firstName lastName businessName' },
      { path: 'deliveryDispute.disputedBy', select: 'firstName lastName businessName' },
      { path: 'returnDetails.returnedBy', select: 'firstName lastName businessName' },
      { path: 'assignmentHistory.transporter', select: 'firstName lastName businessName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status',
      error: error.message
    });
  }
};

// Resolve delivery dispute (for wholesaler)
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes, reassign } = req.body;

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is the wholesaler
    if (order.wholesaler.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to resolve this dispute'
      });
    }

    // Check if order is in disputed status
    if (order.status !== 'disputed') {
      return res.status(400).json({
        success: false,
        message: 'Order is not in disputed status'
      });
    }

    // Update dispute resolution
    order.deliveryDispute.resolved = true;
    order.deliveryDispute.resolvedAt = new Date();
    order.deliveryDispute.resolutionNotes = resolutionNotes;

    // If reassign is requested, change status back to assigned_to_transporter
    if (reassign) {
      order.status = 'assigned_to_transporter';
      order.transporter = null; // Clear transporter for reassignment
    }

    await order.save();

    await order.populate([
      { path: 'product', select: 'name description images' },
      { path: 'retailer', select: 'firstName lastName businessName phone' },
      { path: 'transporter', select: 'firstName lastName businessName phone' },
      { path: 'deliveryDispute.disputedBy', select: 'firstName lastName businessName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      order
    });

  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resolving dispute',
      error: error.message
    });
  }
};

// Handle return request (for wholesaler)
exports.handleReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'accept' or 'reject'

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is the wholesaler
    if (order.wholesaler.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to handle this return request'
      });
    }

    // Check if order is in return_to_wholesaler status
    if (order.status !== 'return_to_wholesaler') {
      return res.status(400).json({
        success: false,
        message: 'Order is not in return requested status'
      });
    }

    if (action === 'accept') {
      // Accept the return
      order.status = 'return_accepted';
      order.returnDetails.returnAcceptedAt = new Date();
      order.returnCompletedAt = new Date();
      order.paymentStatus = 'refunded';
    } else if (action === 'reject') {
      // Reject the return
      order.status = 'return_rejected';
      order.returnDetails.returnRejectedAt = new Date();
      order.returnDetails.returnRejectionReason = rejectionReason;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "accept" or "reject"'
      });
    }

    await order.save();

    await order.populate([
      { path: 'product', select: 'name description images' },
      { path: 'retailer', select: 'firstName lastName businessName phone' },
      { path: 'transporter', select: 'firstName lastName businessName phone' },
      { path: 'returnDetails.returnedBy', select: 'firstName lastName businessName' }
    ]);

    res.status(200).json({
      success: true,
      message: `Return request ${action}ed successfully`,
      order
    });

  } catch (error) {
    console.error('Handle return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while handling return request',
      error: error.message
    });
  }
};

// Delete order (only for retailer and only when status is pending)
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

    // Check if user is the retailer
    if (!order.canUserPerformAction(req.user.id, 'retailer')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this order'
      });
    }

    // Check if order can be deleted (only pending orders)
    if (!['pending', 'rejected', 'return_rejected', 'rejected', 'return_accepted', 'cancelled_by_wholesaler'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be deleted in ${order.status} status`
      });
    }

    await RetailerOrder.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting order',
      error: error.message
    });
  }
};

// Get order statistics
exports.getOrderStatistics = async (req, res) => {
  try {
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

    const statistics = await RetailerOrder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' }
        }
      }
    ]);

    const total = await RetailerOrder.countDocuments(filter);
    const totalRevenue = await RetailerOrder.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.status(200).json({
      success: true,
      statistics,
      totalOrders: total,
      totalRevenue: totalRevenue[0]?.total || 0
    });

  } catch (error) {
    console.error('Get order statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
      error: error.message
    });
  }
};