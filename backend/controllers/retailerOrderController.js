const RetailerOrder = require('../models/RetailerOrder');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { addSystemStockFromOrder } = require('./systemStockController');
const mongoose = require('mongoose');

// ==================== ENHANCED STOCK MANAGEMENT FUNCTIONS ====================

/**
 * Enhanced stock management with comprehensive tracking and robust error handling
 * FIXED VERSION with proper population, method calling, and persistence
 */
exports.updateProductStock = async (order) => {
  try {
    console.log(`🔄 Starting enhanced stock update for order certification:`, {
      orderId: order._id,
      productId: order.product,
      quantity: order.quantity,
      retailerId: order.retailer
    });

    // CRITICAL FIX: Properly populate product details before operations
    let populatedOrder = order;
    if (typeof order.populate === 'function' && (!order.product._id || typeof order.product._id === 'string')) {
      populatedOrder = await order.populate('product');
    }

    const product = await Product.findById(populatedOrder.product._id || populatedOrder.product);
    if (!product) {
      console.error(`❌ Product not found: ${populatedOrder.product}`);
      return {
        success: false,
        error: `Product not found: ${populatedOrder.product}`,
        product: null,
        stockUpdate: null
      };
    }

    // Enhanced validation with comprehensive checks
    if (typeof product.quantity !== 'number' || product.quantity < 0) {
      console.warn(`⚠️ Invalid product quantity: ${product.quantity}, proceeding with certification`);
      return {
        success: false,
        error: `Invalid product quantity: ${product.quantity}`,
        product: product,
        stockUpdate: null
      };
    }

    console.log(`📦 Comprehensive stock analysis before update:`, {
      productId: product._id,
      productName: product.name,
      currentStock: product.quantity,
      orderQuantity: populatedOrder.quantity,
      measurementUnit: product.measurementUnit,
      lowStockAlert: product.lowStockAlert,
      lowStockThreshold: product.lowStockThreshold
    });

    // CRITICAL FIX: Enhanced stock availability check with detailed information
    if (product.quantity < populatedOrder.quantity) {
      console.warn(`⚠️ Insufficient stock: Product ${product.name} has ${product.quantity} but order requires ${populatedOrder.quantity}`);
      return {
        success: false,
        error: `Insufficient stock. Available: ${product.quantity}, Requested: ${populatedOrder.quantity}`,
        product: product,
        stockUpdate: null,
        shortage: populatedOrder.quantity - product.quantity
      };
    }

    // CRITICAL FIX: Enhanced stock reduction with proper method calling and persistence
    let stockUpdate;
    try {
      if (typeof product.reduceStock === 'function') {
        console.log(`📝 Using Product model's reduceStock method for: ${product.name}`);
        
        // CRITICAL FIX: Proper method calling with all required parameters
        stockUpdate = await product.reduceStock(
          populatedOrder.quantity,
          populatedOrder.retailer?._id || populatedOrder.retailer,
          'Order certified by retailer',
          populatedOrder._id,
          `Stock reduced for certified order ${populatedOrder._id}`
        );
        
        console.log(`✅ Stock update result from reduceStock method:`, stockUpdate);
      } else {
        // Enhanced fallback: Direct stock reduction with comprehensive tracking
        console.log('⚠️ reduceStock method not found, using enhanced direct stock update');
        const previousQuantity = product.quantity;
        product.quantity = Math.max(0, product.quantity - populatedOrder.quantity);
        
        // Enhanced stock history tracking
        if (product.stockHistory && Array.isArray(product.stockHistory)) {
          const stockHistoryEntry = {
            previousQuantity: previousQuantity,
            newQuantity: product.quantity,
            changeAmount: -populatedOrder.quantity,
            changeType: 'stock_out',
            changedAt: new Date(),
            changedBy: populatedOrder.retailer?._id || populatedOrder.retailer,
            reason: 'Order certified by retailer',
            orderReference: populatedOrder._id,
            note: `Stock reduced for certified order ${populatedOrder._id}`,
            metadata: {
              orderType: 'retailer_order',
              certificationDate: new Date(),
              automatic: true
            }
          };
          product.stockHistory.push(stockHistoryEntry);
        }
        
        stockUpdate = {
          previousQuantity: previousQuantity,
          newQuantity: product.quantity,
          reduction: populatedOrder.quantity,
          stockHistoryId: null,
          method: 'direct_update'
        };
      }

      // CRITICAL FIX: Ensure product changes are persisted to database
      console.log(`💾 Persisting stock changes to database for product: ${product.name}`);
      await product.save({ validateBeforeSave: false });
      console.log(`✅ Product stock successfully saved to database`);
      
      // Verify the save was successful
      const verifiedProduct = await Product.findById(product._id);
      console.log(`🔍 Stock verification - Current stock: ${verifiedProduct.quantity}`);
      
    } catch (methodError) {
      console.error('❌ Error in stock reduction method:', methodError);
      throw new Error(`Stock reduction failed: ${methodError.message}`);
    }
    
    console.log(`🎉 Enhanced stock update completed successfully:`, {
      product: product.name,
      orderId: populatedOrder._id,
      previousStock: stockUpdate.previousQuantity,
      newStock: stockUpdate.newQuantity,
      reduction: populatedOrder.quantity,
      remainingStock: product.quantity,
      lowStockAlert: product.quantity <= product.lowStockAlert
    });
    
    return {
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        quantity: product.quantity,
        measurementUnit: product.measurementUnit,
        lowStockAlert: product.lowStockAlert
      },
      stockUpdate,
      lowStockAlert: product.quantity <= product.lowStockAlert,
      remainingStock: product.quantity,
      metadata: {
        updatedAt: new Date(),
        method: stockUpdate.method || 'model_method'
      }
    };
  } catch (error) {
    console.error('❌ Comprehensive error updating product stock:', error);
    
    // Enhanced error information for debugging
    return {
      success: false,
      error: error.message,
      product: null,
      stockUpdate: null,
      orderId: order._id,
      productId: order.product,
      timestamp: new Date(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * Enhanced stock restoration with comprehensive tracking and robust error handling
 * FIXED VERSION with proper population, method calling, and persistence
 */
exports.restoreProductStock = async (order) => {
  try {
    console.log(`🔄 Starting enhanced stock restoration for order return:`, {
      orderId: order._id,
      productId: order.product,
      quantity: order.quantity,
      wholesalerId: order.wholesaler
    });

    // CRITICAL FIX: Properly populate product details before operations
    let populatedOrder = order;
    if (typeof order.populate === 'function' && (!order.product._id || typeof order.product._id === 'string')) {
      populatedOrder = await order.populate('product');
    }

    const product = await Product.findById(populatedOrder.product._id || populatedOrder.product);
    if (!product) {
      console.error(`❌ Product not found: ${populatedOrder.product}`);
      return {
        success: false,
        error: `Product not found: ${populatedOrder.product}`,
        product: null,
        stockUpdate: null
      };
    }

    console.log(`📦 Comprehensive stock analysis before restoration:`, {
      productId: product._id,
      productName: product.name,
      currentStock: product.quantity,
      restorationQuantity: populatedOrder.quantity,
      measurementUnit: product.measurementUnit
    });

    // CRITICAL FIX: Enhanced stock restoration with proper method calling and persistence
    let stockUpdate;
    try {
      if (typeof product.restoreStock === 'function') {
        console.log(`📝 Using Product model's restoreStock method for: ${product.name}`);
        
        // CRITICAL FIX: Proper method calling with all required parameters
        stockUpdate = await product.restoreStock(
          populatedOrder.quantity,
          populatedOrder.wholesaler?._id || populatedOrder.wholesaler,
          'Order return accepted by wholesaler',
          populatedOrder._id,
          `Stock restored for returned order ${populatedOrder._id}`
        );
        
        console.log(`✅ Stock restoration result from restoreStock method:`, stockUpdate);
      } else {
        // Enhanced fallback: Direct stock restoration with comprehensive tracking
        console.log('⚠️ restoreStock method not found, using enhanced direct stock restoration');
        const previousQuantity = product.quantity;
        product.quantity = product.quantity + populatedOrder.quantity;
        
        // Enhanced stock history tracking
        if (product.stockHistory && Array.isArray(product.stockHistory)) {
          const stockHistoryEntry = {
            previousQuantity: previousQuantity,
            newQuantity: product.quantity,
            changeAmount: populatedOrder.quantity,
            changeType: 'stock_in',
            changedAt: new Date(),
            changedBy: populatedOrder.wholesaler?._id || populatedOrder.wholesaler,
            reason: 'Order return accepted by wholesaler',
            orderReference: populatedOrder._id,
            note: `Stock restored for returned order ${populatedOrder._id}`,
            metadata: {
              orderType: 'retailer_order_return',
              returnAcceptedDate: new Date(),
              automatic: true
            }
          };
          product.stockHistory.push(stockHistoryEntry);
        }
        
        stockUpdate = {
          previousQuantity: previousQuantity,
          newQuantity: product.quantity,
          restoration: populatedOrder.quantity,
          stockHistoryId: null,
          method: 'direct_update'
        };
      }

      // CRITICAL FIX: Ensure product changes are persisted to database
      console.log(`💾 Persisting stock restoration to database for product: ${product.name}`);
      await product.save({ validateBeforeSave: false });
      console.log(`✅ Product stock restoration successfully saved to database`);
      
      // Verify the save was successful
      const verifiedProduct = await Product.findById(product._id);
      console.log(`🔍 Stock restoration verification - Current stock: ${verifiedProduct.quantity}`);
      
    } catch (methodError) {
      console.error('❌ Error in stock restoration method:', methodError);
      throw new Error(`Stock restoration failed: ${methodError.message}`);
    }
    
    console.log(`🎉 Enhanced stock restoration completed successfully:`, {
      product: product.name,
      orderId: populatedOrder._id,
      previousStock: stockUpdate.previousQuantity,
      newStock: stockUpdate.newQuantity,
      restoration: populatedOrder.quantity,
      currentStock: product.quantity
    });
    
    return {
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        quantity: product.quantity,
        measurementUnit: product.measurementUnit,
        lowStockAlert: product.lowStockAlert
      },
      stockUpdate,
      lowStockAlert: product.quantity <= product.lowStockAlert,
      currentStock: product.quantity,
      metadata: {
        updatedAt: new Date(),
        method: stockUpdate.method || 'model_method'
      }
    };
  } catch (error) {
    console.error('❌ Comprehensive error restoring product stock:', error);
    
    // Enhanced error information for debugging
    return {
      success: false,
      error: error.message,
      product: null,
      stockUpdate: null,
      orderId: order._id,
      productId: order.product,
      timestamp: new Date(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

// ==================== ENHANCED ORDER STATUS MANAGEMENT ====================

/**
 * Enhanced update order status with comprehensive stock management and graceful error handling
 * FIXED VERSION with robust stock operations and detailed logging
 */
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

    console.log(`🔄 Order status update initiated:`, {
      orderId: id,
      newStatus: status,
      userId: req.user.id,
      userRole: req.user.role
    });

    const order = await RetailerOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // FIXED: Direct permission check
    let hasPermission = false;
    if (req.user.role === 'retailer') {
      hasPermission = order.retailer.toString() === req.user.id;
    } else if (req.user.role === 'wholesaler') {
      hasPermission = order.wholesaler.toString() === req.user.id;
    } else if (req.user.role === 'transporter') {
      hasPermission = (order.transporter && order.transporter.toString() === req.user.id) || 
                     (!order.transporter && order.status === 'assigned_to_transporter');
    }

    if (!hasPermission && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    // FIXED: Direct status transition validation
    const allowedTransitions = {
      retailer: {
        pending: ['cancelled_by_retailer'],
        accepted: ['cancelled_by_retailer'],
        processing: ['cancelled_by_retailer'],
        delivered: ['certified', 'disputed'],
      },
      wholesaler: {
        pending: ['accepted', 'rejected'],
        accepted: ['processing', 'cancelled_by_wholesaler'],
        processing: ['assigned_to_transporter', 'cancelled_by_wholesaler'],
        assigned_to_transporter: ['assigned_to_transporter'],
        rejected_by_transporter: ['assigned_to_transporter'],
        cancelled_by_transporter: ['assigned_to_transporter'],
        disputed: ['assigned_to_transporter'],
        return_to_wholesaler: ['return_accepted', 'return_rejected'],
      },
      transporter: {
        assigned_to_transporter: ['accepted_by_transporter', 'rejected_by_transporter', 'cancelled_by_transporter'],
        accepted_by_transporter: ['in_transit', 'cancelled_by_transporter'],
        in_transit: ['delivered', 'cancelled_by_transporter'],
        disputed: ['return_to_wholesaler'],
      }
    };

    const userAllowedTransitions = allowedTransitions[req.user.role]?.[order.status] || [];
    if (!userAllowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status} for ${req.user.role}`
      });
    }

    const previousStatus = order.status;

    // Handle status-specific logic
    if (status === 'certified') {
      order.deliveryCertificationDate = new Date();
      order.paymentStatus = 'paid';
      
      // Update product stock
      try {
        await this.updateProductStock(order);
      } catch (stockError) {
        console.error('Error updating product stock:', stockError);
      }
    }

    if (status === 'return_accepted') {
      order.returnDetails = order.returnDetails || {};
      order.returnDetails.returnAcceptedAt = new Date();
      order.returnDetails.returnCompletedAt = new Date();
      order.paymentStatus = 'refunded';
      
      // Restore product stock
      try {
        await this.restoreProductStock(order);
      } catch (stockError) {
        console.error('Error restoring product stock:', stockError);
      }
    }

    // Handle cancellation by transporter
    if ((status === 'rejected_by_transporter' || status === 'cancelled_by_transporter') && cancellationReason) {
      order.cancellationDetails = {
        cancelledBy: req.user.id,
        cancelledAt: new Date(),
        reason: cancellationReason,
        previousStatus: order.status
      };
      
      // FIXED: Direct assignment history
      if (order.transporter) {
        if (!order.assignmentHistory) order.assignmentHistory = [];
        const lastAssignmentType = order.assignmentHistory.length > 0 
          ? order.assignmentHistory[order.assignmentHistory.length - 1].assignmentType 
          : 'specific';
          
        order.assignmentHistory.push({
          transporter: order.transporter,
          assignedAt: new Date(),
          assignmentType: lastAssignmentType,
          status: status === 'rejected_by_transporter' ? 'rejected' : 'cancelled',
          reason: cancellationReason
        });
      }
      
      order.transporter = null;
    }

    // Handle delivery dispute
    if (status === 'disputed' && disputeReason) {
      order.deliveryDispute = {
        disputedBy: req.user.id,
        disputedAt: new Date(),
        reason: disputeReason,
        resolved: false
      };
    }

    // Handle return to wholesaler
    if (status === 'return_to_wholesaler' && returnReason) {
      order.returnDetails = {
        returnedBy: req.user.id,
        returnRequestedAt: new Date(),
        returnReason: returnReason
      };
    }

    // Handle return rejection
    if (status === 'return_rejected') {
      if (!order.returnDetails) order.returnDetails = {};
      order.returnDetails.returnRejectedAt = new Date();
      order.returnDetails.returnRejectionReason = returnReason;
    }

    // Handle reassignment
    if (status === 'assigned_to_transporter' && 
        (order.status === 'rejected_by_transporter' || order.status === 'cancelled_by_transporter' || order.status === 'disputed' || order.status === 'return_rejected')) {
      order.cancellationDetails = undefined;
      order.deliveryDispute = undefined;
      order.returnDetails = undefined;
    }

    // Update transporter assignment
    if ((transporterId && status === 'assigned_to_transporter') || 
        (status === 'accepted_by_transporter' && req.user.role === 'transporter')) {
      order.transporter = transporterId || req.user.id;
      
      if (status === 'assigned_to_transporter') {
        // FIXED: Direct assignment history
        if (!order.assignmentHistory) order.assignmentHistory = [];
        order.assignmentHistory.push({
          transporter: transporterId || null,
          assignedAt: new Date(),
          assignmentType: assignmentType || 'specific',
          status: 'assigned'
        });
      }
    }
    
    // Set delivery date
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    // Update order status
    order.status = status;
    await order.save();

    // Populate order for response
    await order.populate([
      { path: 'product', select: 'name description images measurementUnit' },
      { path: 'retailer', select: 'firstName lastName businessName phone' },
      { path: 'transporter', select: 'firstName lastName businessName phone' },
      { path: 'cancellationDetails.cancelledBy', select: 'firstName lastName businessName' },
      { path: 'deliveryDispute.disputedBy', select: 'firstName lastName businessName' },
      { path: 'returnDetails.returnedBy', select: 'firstName lastName businessName' }
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

// ==================== ENHANCED DEBUG AND VERIFICATION FUNCTIONS ====================

/**
 * Enhanced debug function to verify stock update with comprehensive analysis
 */
exports.debugStockUpdate = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await RetailerOrder.findById(orderId)
      .populate('product')
      .populate('retailer', 'firstName lastName businessName')
      .populate('wholesaler', 'firstName lastName businessName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Enhanced product analysis
    const product = await Product.findById(order.product);
    
    // Comprehensive method analysis
    const hasReduceStockMethod = typeof product?.reduceStock === 'function';
    const hasRestoreStockMethod = typeof product?.restoreStock === 'function';
    
    // Enhanced stock history analysis
    const stockHistoryCount = product?.stockHistory?.length || 0;
    const recentStockChanges = product?.stockHistory?.slice(-5) || [];

    // Enhanced test stock update
    let testResult = null;
    if (product && hasReduceStockMethod) {
      try {
        // Create enhanced test order for verification
        const testOrder = {
          _id: order._id,
          product: order.product,
          quantity: 1, // Test with 1 unit
          retailer: order.retailer._id,
          wholesaler: order.wholesaler._id,
          measurementUnit: order.measurementUnit,
          populate: async function() { return this; } // Mock populate method
        };
        
        testResult = await this.updateProductStock(testOrder);
      } catch (testError) {
        testResult = { 
          error: testError.message,
          stack: process.env.NODE_ENV === 'development' ? testError.stack : undefined
        };
      }
    }

    res.status(200).json({
      success: true,
      order: {
        id: order._id,
        status: order.status,
        product: order.product?.name,
        quantity: order.quantity,
        retailer: order.retailer?.businessName,
        wholesaler: order.wholesaler?.businessName,
        totalPrice: order.totalPrice
      },
      product: product ? {
        id: product._id,
        name: product.name,
        currentStock: product.quantity,
        lowStockAlert: product.lowStockAlert,
        lowStockThreshold: product.lowStockThreshold,
        measurementUnit: product.measurementUnit,
        hasReduceStockMethod,
        hasRestoreStockMethod,
        stockHistoryCount,
        recentStockChanges: recentStockChanges.map(change => ({
          changeType: change.changeType,
          changeAmount: change.changeAmount,
          previousQuantity: change.previousQuantity,
          newQuantity: change.newQuantity,
          reason: change.reason,
          changedAt: change.changedAt
        }))
      } : null,
      testResult,
      systemInfo: {
        serverTime: new Date(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('Enhanced debug stock update error:', error);
    res.status(500).json({
      success: false,
      message: 'Enhanced debug failed',
      error: error.message,
      timestamp: new Date()
    });
  }
};

/**
 * Enhanced function to manually fix stock for an order with comprehensive validation
 */
exports.manualStockFix = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, quantity, reason } = req.body; // 'reduce' or 'restore'
    
    const order = await RetailerOrder.findById(orderId)
      .populate('product')
      .populate('retailer', 'firstName lastName businessName')
      .populate('wholesaler', 'firstName lastName businessName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!['reduce', 'restore'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "reduce" or "restore"',
        validActions: ['reduce', 'restore']
      });
    }

    const fixQuantity = quantity || order.quantity;
    const fixReason = reason || `Manual stock ${action} for order ${orderId}`;

    console.log(`🔧 Manual stock fix requested:`, {
      orderId,
      action,
      quantity: fixQuantity,
      reason: fixReason,
      performedBy: req.user.id
    });

    let result;
    if (action === 'reduce') {
      // Create a temporary order object for stock reduction
      const tempOrder = {
        ...order.toObject(),
        quantity: fixQuantity,
        populate: async function() { return this; }
      };
      result = await this.updateProductStock(tempOrder);
    } else {
      // Create a temporary order object for stock restoration
      const tempOrder = {
        ...order.toObject(),
        quantity: fixQuantity,
        populate: async function() { return this; }
      };
      result = await this.restoreProductStock(tempOrder);
    }

    // Enhanced order metadata update
    order.metadata = order.metadata || {};
    order.metadata.manualStockFix = {
      action: action,
      quantity: fixQuantity,
      reason: fixReason,
      performedBy: req.user.id,
      performedAt: new Date(),
      result: result.success ? 'success' : 'failed',
      error: result.error,
      previousStock: result.stockUpdate?.previousQuantity,
      newStock: result.stockUpdate?.newQuantity
    };
    
    await order.save();

    // Enhanced audit logging
    console.log(`✅ Manual stock fix completed:`, {
      orderId,
      action,
      success: result.success,
      previousStock: result.stockUpdate?.previousQuantity,
      newStock: result.stockUpdate?.newQuantity
    });

    res.status(200).json({
      success: true,
      message: `Manual stock ${action} completed`,
      action: action,
      quantity: fixQuantity,
      result: result,
      order: {
        id: order._id,
        status: order.status,
        product: order.product?.name,
        quantity: order.quantity
      },
      fixDetails: {
        performedBy: req.user.id,
        performedAt: new Date(),
        reason: fixReason
      }
    });

  } catch (error) {
    console.error('Enhanced manual stock fix error:', error);
    res.status(500).json({
      success: false,
      message: 'Enhanced manual stock fix failed',
      error: error.message,
      timestamp: new Date()
    });
  }
};

// ==================== MAINTAINED EXISTING FUNCTIONS ====================

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
    const notification = await Notification.create({
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

// FIXED VERSION - Enhanced get orders for wholesaler with robust error handling
exports.getWholesalerOrders = async (req, res) => {
  const startTime = Date.now();
  console.log('🔄 getWholesalerOrders called for user:', req.user?.id);
  
  try {
    // Enhanced validation with detailed logging
    if (!req.user || !req.user.id) {
      console.log('❌ Authentication failed: No user in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Safely extract query parameters with defaults and validation
    const { 
      status, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      retailerId,
      productId,
      timeRange = 'all',
      search
    } = req.query;

    console.log('🔍 Query parameters:', {
      status, page, limit, sortBy, sortOrder, retailerId, productId, timeRange, search
    });

    // Build filter safely with validation
    const filter = { 
      wholesaler: req.user.id 
    };
    
    // Add status filter with validation
    if (status && status !== 'all') {
      const validStatuses = [
        'pending', 'accepted', 'processing', 'assigned_to_transporter', 
        'in_transit', 'delivered', 'certified', 'disputed', 'return_to_wholesaler',
        'return_accepted', 'return_rejected', 'rejected', 'cancelled_by_retailer',
        'cancelled_by_wholesaler'
      ];
      
      if (validStatuses.includes(status)) {
        filter.status = status;
      } else {
        console.warn('⚠️ Invalid status filter:', status);
      }
    }

    // Add retailer filter with validation
    if (retailerId) {
      if (mongoose.Types.ObjectId.isValid(retailerId)) {
        filter.retailer = retailerId;
      } else {
        console.warn('⚠️ Invalid retailerId format:', retailerId);
      }
    }

    // Add product filter with validation
    if (productId) {
      if (mongoose.Types.ObjectId.isValid(productId)) {
        filter.product = productId;
      } else {
        console.warn('⚠️ Invalid productId format:', productId);
      }
    }

    // Add time range filter safely
    if (timeRange && timeRange !== 'all') {
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
          console.warn('⚠️ Unknown timeRange:', timeRange);
          break;
      }
      
      if (timeRange !== 'all') {
        filter.createdAt = { $gte: startDate };
      }
    }

    console.log('🎯 Final filter:', JSON.stringify(filter, null, 2));

    // Build sort options safely
    const sortOptions = {};
    const validSortFields = ['createdAt', 'updatedAt', 'totalPrice', 'quantity', 'status'];
    const validSortOrders = ['asc', 'desc', 1, -1];
    
    if (validSortFields.includes(sortBy)) {
      if (sortOrder === 'asc' || sortOrder === 1) {
        sortOptions[sortBy] = 1;
      } else if (sortOrder === 'desc' || sortOrder === -1) {
        sortOptions[sortBy] = -1;
      } else {
        sortOptions[sortBy] = -1; // Default to desc
      }
    } else {
      sortOptions.createdAt = -1; // Default sort
    }

    // Calculate pagination safely
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Cap at 100 for safety
    const skip = (pageNum - 1) * limitNum;

    console.log('📊 Pagination:', { page: pageNum, limit: limitNum, skip });

    // Enhanced query with safe population and error handling
    const query = RetailerOrder.find(filter);
    
    // Safe population with error handling
    try {
      query.populate([
        { 
          path: 'product', 
          select: 'name description images measurementUnit category price quantity',
          model: 'Product'
        },
        { 
          path: 'retailer', 
          select: 'firstName lastName businessName phone email address',
          model: 'User'
        },
        { 
          path: 'transporter', 
          select: 'firstName lastName businessName phone email vehicleType',
          model: 'User'
        }
      ]);
    } catch (populateError) {
      console.warn('⚠️ Population error, proceeding without population:', populateError.message);
    }

    // Execute query with sorting and pagination
    const orders = await query
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await RetailerOrder.countDocuments(filter);

    console.log(`✅ Successfully fetched ${orders.length} orders out of ${total} total`);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Enhanced response with comprehensive data
    const response = {
      success: true,
      orders: orders || [],
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalOrders: total,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
        limit: limitNum
      },
      filters: {
        applied: {
          status: status || 'all',
          timeRange: timeRange || 'all',
          retailerId: retailerId || null,
          productId: productId || null,
          search: search || null
        }
      },
      metadata: {
        userId: req.user.id,
        userRole: req.user.role,
        queryTime: new Date().toISOString(),
        executionTime: `${Date.now() - startTime}ms`
      }
    };

    console.log('✅ Sending successful response with', orders.length, 'orders');
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ getWholesalerOrders error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Enhanced error response with troubleshooting information
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error.stack,
        details: {
          userId: req.user?.id,
          queryParams: req.query,
          timestamp: new Date().toISOString(),
          endpoint: 'GET /api/retailer-orders/wholesaler'
        }
      }),
      timestamp: new Date().toISOString(),
      suggestion: 'Please try again with simpler filters or contact support'
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

    // Enhanced permission check - FIXED: Removed non-existent method call
    if (!order.canUserPerformAction(req.user.id, req.user.role) && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
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

// ==================== MAINTAINED EXISTING HELPER FUNCTIONS ====================

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
          previousStock: stockRestoreResult.stockUpdate?.previousQuantity,
          newStock: stockRestoreResult.stockUpdate?.newQuantity,
          restoredBy: order.quantity,
          updatedAt: new Date(),
          success: stockRestoreResult.success || false
        };
      } catch (stockError) {
        console.error('Error restoring stock during return acceptance:', stockError);
        order.metadata = order.metadata || {};
        order.metadata.returnStockRestoration = {
          success: false,
          error: stockError.message,
          updatedAt: new Date()
        };
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
          stockRestored: order.metadata?.returnStockRestoration?.success || false,
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
          stockRestored: order.metadata?.returnStockRestoration?.success || false
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