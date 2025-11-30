const mongoose = require('mongoose');

const retailerOrderSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wholesaler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  transporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  measurementUnit: {
    type: String,
    required: true,
    // REMOVED ENUM RESTRICTION - Accept any measurement unit
  },
  deliveryPlace: {
    type: String,
    required: true,
    trim: true,
  },
  deliveryCoordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  status: {
    type: String,
    enum: [
      'pending',           // Order placed, waiting for wholesaler acceptance
      'accepted',          // Wholesaler accepted the order
      'rejected',          // Wholesaler rejected the order
      'processing',        // Wholesaler is preparing the order
      'assigned_to_transporter', // Order assigned to a transporter
      'accepted_by_transporter', // Transporter accepted the order
      'in_transit',        // Order is being transported
      'delivered',         // Order delivered to retailer
      'certified',         // Retailer certified the delivery
      'disputed',          // Retailer disputed the delivery
      'return_to_wholesaler', // Transporter returning order to wholesaler
      'return_accepted',   // Wholesaler accepted the return
      'return_rejected',   // Wholesaler rejected the return
      'cancelled_by_retailer',   // Retailer cancelled the order
      'cancelled_by_wholesaler', // Wholesaler cancelled the order
      'rejected_by_transporter', // Transporter rejected the order
      'cancelled_by_transporter' // Transporter cancelled the transport
    ],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'mobile_money', 'bank_transfer', 'credit_card'],
    default: 'cash_on_delivery',
  },
  orderNotes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  estimatedDeliveryDate: {
    type: Date,
  },
  actualDeliveryDate: {
    type: Date,
  },
  deliveryCertificationDate: {
    type: Date,
  },
  returnRequestedAt: {
    type: Date,
  },
  returnCompletedAt: {
    type: Date,
  },
  trackingNumber: {
    type: String,
    trim: true,
  },
  discountApplied: {
    type: Number,
    default: 0,
    min: 0,
  },
  bulkDiscount: {
    minQuantity: Number,
    discountPercentage: Number,
    applied: {
      type: Boolean,
      default: false,
    },
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  returnReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  cancellationDetails: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    previousStatus: {
      type: String,
    }
  },
  deliveryDispute: {
    disputedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disputedAt: {
      type: Date,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    }
  },
  returnDetails: {
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    returnRequestedAt: {
      type: Date,
    },
    returnReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    returnAcceptedAt: {
      type: Date,
    },
    returnRejectedAt: {
      type: Date,
    },
    returnCompletedAt: {
      type: Date,
    },
    returnNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    returnRejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    }
  },
  assignmentHistory: [{
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    assignmentType: {
      type: String,
      enum: ['specific', 'free'],
    },
    status: {
      type: String,
      enum: ['assigned', 'accepted', 'rejected', 'cancelled'],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    expiredAt: {
      type: Date,
    }
  }],
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true,
});

// Indexes for better query performance
retailerOrderSchema.index({ retailer: 1, createdAt: -1 });
retailerOrderSchema.index({ wholesaler: 1, status: 1 });
retailerOrderSchema.index({ transporter: 1, status: 1 });
retailerOrderSchema.index({ product: 1 });
retailerOrderSchema.index({ status: 1 });

// Method to check if user can perform action on order
retailerOrderSchema.methods.canUserPerformAction = function(userId, userRole) {
  if (userRole === 'retailer') {
    return this.retailer.toString() === userId;
  } else if (userRole === 'wholesaler') {
    return this.wholesaler.toString() === userId;
  } else if (userRole === 'transporter') {
    // Allow transporters to act on orders assigned to them OR free orders (no transporter assigned)
    return (this.transporter && this.transporter.toString() === userId) || 
           (!this.transporter && this.status === 'assigned_to_transporter');
  }
  return false;
};

// COMPLETELY FIXED VERSION - Method to get allowed status transitions based on user role
retailerOrderSchema.methods.getAllowedTransitions = function(userRole) {
  const transitions = {
    retailer: {
      pending: ['cancelled_by_retailer'],
      accepted: ['cancelled_by_retailer'],
      processing: ['cancelled_by_retailer'],
      delivered: ['certified', 'disputed'],
      certified: [], // No further actions after certification
      disputed: [], // No further actions after dispute (handled by wholesaler)
      cancelled_by_retailer: [], // Final state
      return_accepted: [], // Final state
      return_rejected: [], // Final state
    },
    wholesaler: {
      // FIXED: Complete wholesaler transitions with all possible states
      pending: ['accepted', 'rejected', 'cancelled_by_wholesaler'],
      accepted: ['processing', 'cancelled_by_wholesaler'],
      rejected: [], // Final state
      processing: ['assigned_to_transporter', 'cancelled_by_wholesaler'],
      assigned_to_transporter: ['assigned_to_transporter'], // Allow reassignment
      accepted_by_transporter: [], // Wait for transporter actions
      in_transit: [], // Wait for transporter actions
      delivered: [], // Wait for retailer actions
      certified: [], // Final state
      disputed: ['assigned_to_transporter'], // Allow reassignment after dispute
      return_to_wholesaler: ['return_accepted', 'return_rejected'],
      return_accepted: [], // Final state
      return_rejected: ['assigned_to_transporter'], // Allow reassignment after return rejection
      cancelled_by_wholesaler: [], // Final state
      rejected_by_transporter: ['assigned_to_transporter'], // Allow reassignment after transporter rejection
      cancelled_by_transporter: ['assigned_to_transporter'], // Allow reassignment after transporter cancellation
      cancelled_by_retailer: [], // Final state
    },
    transporter: {
      assigned_to_transporter: ['accepted_by_transporter', 'rejected_by_transporter', 'cancelled_by_transporter'],
      accepted_by_transporter: ['in_transit', 'cancelled_by_transporter'],
      in_transit: ['delivered', 'cancelled_by_transporter', 'return_to_wholesaler'],
      delivered: ['return_to_wholesaler'], // Can return after delivery if issues
      disputed: ['return_to_wholesaler'], // Initiate return for disputed orders
      return_to_wholesaler: [], // Wait for wholesaler response
      rejected_by_transporter: [], // Final state
      cancelled_by_transporter: [], // Final state
      // These statuses don't allow transporter actions
      pending: [],
      accepted: [],
      processing: [],
      certified: [],
      return_accepted: [],
      return_rejected: [],
      cancelled_by_retailer: [],
      cancelled_by_wholesaler: [],
    }
  };

  // Enhanced logging for debugging
  console.log(`🔍 getAllowedTransitions called:`, {
    orderId: this._id,
    currentStatus: this.status,
    userRole: userRole,
    availableTransitions: transitions[userRole]?.[this.status] || []
  });

  // Safe access with optional chaining and nullish coalescing
  return transitions[userRole]?.[this.status] ?? [];
};

// ENHANCED VERSION - Method to check if status transition is valid with comprehensive validation
retailerOrderSchema.methods.isValidTransition = function(newStatus, userRole) {
  try {
    // Special case: Allow admin to perform any transition
    if (userRole === 'admin') {
      console.log(`🔧 Admin override: Allowing transition from ${this.status} to ${newStatus}`);
      return true;
    }

    const allowedTransitions = this.getAllowedTransitions(userRole);
    const isValid = allowedTransitions.includes(newStatus);

    // Comprehensive debug logging
    console.log(`🔄 Status Transition Validation:`, {
      orderId: this._id,
      currentStatus: this.status,
      requestedStatus: newStatus,
      userRole: userRole,
      allowedTransitions: allowedTransitions,
      isValid: isValid,
      timestamp: new Date().toISOString()
    });

    if (!isValid) {
      console.warn(`❌ Invalid transition attempted:`, {
        orderId: this._id,
        from: this.status,
        to: newStatus,
        userRole: userRole,
        allowedOptions: allowedTransitions
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Critical error in isValidTransition:', {
      error: error.message,
      orderId: this._id,
      currentStatus: this.status,
      requestedStatus: newStatus,
      userRole: userRole,
      stack: error.stack
    });
    
    // In case of critical error, be restrictive to prevent invalid state changes
    return false;
  }
};

// Method to get all possible transitions for debugging and UI
retailerOrderSchema.methods.getAllPossibleTransitions = function() {
  return {
    retailer: this.getAllowedTransitions('retailer'),
    wholesaler: this.getAllowedTransitions('wholesaler'),
    transporter: this.getAllowedTransitions('transporter'),
    admin: ['*'] // Admin can do anything
  };
};

// Method to add assignment history
retailerOrderSchema.methods.addAssignmentHistory = function(transporterId, assignmentType, status, reason = null, expiredAt = null) {
  const historyEntry = {
    transporter: transporterId,
    assignmentType,
    status,
    reason,
    expiredAt,
    timestamp: new Date()
  };

  this.assignmentHistory.push(historyEntry);

  // Keep only last 10 assignment history entries to prevent unbounded growth
  if (this.assignmentHistory.length > 10) {
    this.assignmentHistory = this.assignmentHistory.slice(-10);
  }

  console.log(`📝 Added assignment history:`, {
    orderId: this._id,
    transporterId: transporterId,
    assignmentType: assignmentType,
    status: status,
    reason: reason
  });
};

// Method to get the last assignment
retailerOrderSchema.methods.getLastAssignment = function() {
  if (this.assignmentHistory.length === 0) return null;
  return this.assignmentHistory[this.assignmentHistory.length - 1];
};

// Method to check if current assignment is expired
retailerOrderSchema.methods.isAssignmentExpired = function() {
  const lastAssignment = this.getLastAssignment();
  if (!lastAssignment || !lastAssignment.expiredAt) return false;
  
  const isExpired = new Date() > new Date(lastAssignment.expiredAt);
  console.log(`⏰ Assignment expiry check:`, {
    orderId: this._id,
    expiredAt: lastAssignment.expiredAt,
    isExpired: isExpired,
    currentTime: new Date()
  });
  
  return isExpired;
};

// Method to calculate total price
retailerOrderSchema.methods.calculateTotal = function() {
  let total = this.quantity * this.unitPrice;

  if (this.bulkDiscount?.applied) {
    const discountAmount = total * (this.bulkDiscount.discountPercentage / 100);
    total -= discountAmount;
    this.discountApplied = discountAmount;
  }

  this.totalPrice = Math.max(0, total); // Ensure non-negative total
  return this.totalPrice;
};

// Method to get required role for action
retailerOrderSchema.methods.getRequiredRoleForAction = function(action) {
  const roleActions = {
    view: ['retailer', 'wholesaler', 'transporter', 'admin'],
    update: ['retailer', 'wholesaler', 'transporter', 'admin'],
    delete: ['retailer', 'admin'],
    certify: ['retailer'],
    dispute: ['retailer'],
    accept_return: ['wholesaler'],
    reject_return: ['wholesaler'],
    assign_transporter: ['wholesaler']
  };
  
  return roleActions[action] || [];
};

// Enhanced pre-save middleware with comprehensive validation
retailerOrderSchema.pre('save', function(next) {
  console.log(`💾 Pre-save hook for order ${this._id}:`, {
    isNew: this.isNew,
    modifiedPaths: this.modifiedPaths(),
    currentStatus: this.status
  });

  // Calculate total price if relevant fields are modified
  if (this.isModified('quantity') || this.isModified('unitPrice') || this.isModified('bulkDiscount')) {
    console.log(`💰 Recalculating total price for order ${this._id}`);
    this.calculateTotal();
  }
  
  // Initialize metadata if not present
  if (!this.metadata) {
    this.metadata = {};
  }
  
  // Track status changes in metadata
  if (this.isModified('status') && !this.isNew) {
    const previousStatus = this.get('originalStatus') || 'unknown';
    this.metadata.lastStatusUpdate = {
      previousStatus: previousStatus,
      newStatus: this.status,
      changedAt: new Date(),
      changedBy: this._update?.$set?.updatedBy || 'system' // Track who made the change if available
    };

    console.log(`🔄 Status change tracked:`, {
      orderId: this._id,
      from: previousStatus,
      to: this.status,
      metadata: this.metadata.lastStatusUpdate
    });
  }

  // Validate critical business rules
  if (this.status === 'certified' && !this.deliveryCertificationDate) {
    this.deliveryCertificationDate = new Date();
    console.log(`✅ Auto-set delivery certification date for order ${this._id}`);
  }

  if (this.status === 'return_accepted' && !this.returnCompletedAt) {
    this.returnCompletedAt = new Date();
    console.log(`✅ Auto-set return completion date for order ${this._id}`);
  }

  next();
});

// Post-init to store original status for tracking changes
retailerOrderSchema.post('init', function(doc) {
  doc.originalStatus = doc.status;
  console.log(`📖 Order ${doc._id} initialized with status: ${doc.status}`);
});

// Static method to get orders by status and user
retailerOrderSchema.statics.getOrdersByStatus = function(userId, userRole, status, options = {}) {
  let filter = {};
  
  if (userRole === 'retailer') {
    filter.retailer = userId;
  } else if (userRole === 'wholesaler') {
    filter.wholesaler = userId;
  } else if (userRole === 'transporter') {
    filter.transporter = userId;
  }
  
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  const { page = 1, limit = 10, sortBy = '-createdAt' } = options;
  const skip = (page - 1) * limit;
  
  console.log(`📋 Fetching orders for ${userRole} ${userId}:`, {
    status: status,
    page: page,
    limit: limit,
    filter: filter
  });
  
  return this.find(filter)
    .populate('product', 'name images measurementUnit category price')
    .populate('retailer', 'firstName lastName businessName phone email')
    .populate('wholesaler', 'businessName contactPerson phone email')
    .populate('transporter', 'firstName lastName businessName phone vehicleType')
    .sort(sortBy)
    .limit(limit)
    .skip(skip);
};

// Static method to get order statistics
retailerOrderSchema.statics.getOrderStatistics = function(userId, userRole) {
  let matchStage = {};
  
  if (userRole === 'retailer') {
    matchStage.retailer = new mongoose.Types.ObjectId(userId);
  } else if (userRole === 'wholesaler') {
    matchStage.wholesaler = new mongoose.Types.ObjectId(userId);
  } else if (userRole === 'transporter') {
    matchStage.transporter = new mongoose.Types.ObjectId(userId);
  }
  
  console.log(`📊 Generating statistics for ${userRole} ${userId}`);
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to find expired assignments that need reassignment
retailerOrderSchema.statics.findExpiredAssignments = function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'assigned_to_transporter',
    'assignmentHistory.expiredAt': { $lt: new Date() },
    'assignmentHistory.status': 'assigned'
  }).populate('transporter', 'firstName lastName businessName');
};

// Virtual for order age in days
retailerOrderSchema.virtual('orderAgeInDays').get(function() {
  const created = new Date(this.createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for order value classification
retailerOrderSchema.virtual('orderValueClass').get(function() {
  if (this.totalPrice >= 1000000) return 'high';
  if (this.totalPrice >= 500000) return 'medium';
  return 'low';
});

// Instance method to check if order can be cancelled
retailerOrderSchema.methods.canBeCancelled = function(userRole) {
  const cancellableStatuses = {
    retailer: ['pending', 'accepted', 'processing'],
    wholesaler: ['pending', 'accepted', 'processing'],
    transporter: ['assigned_to_transporter', 'accepted_by_transporter']
  };
  
  const canCancel = cancellableStatuses[userRole]?.includes(this.status) || false;
  
  console.log(`❓ Cancellation check for order ${this._id}:`, {
    userRole: userRole,
    currentStatus: this.status,
    canCancel: canCancel
  });
  
  return canCancel;
};

// Instance method to get order summary
retailerOrderSchema.methods.getOrderSummary = function() {
  const summary = {
    orderId: this._id,
    status: this.status,
    product: this.product?.name || 'Unknown Product',
    quantity: this.quantity,
    measurementUnit: this.measurementUnit,
    totalPrice: this.totalPrice,
    retailer: this.retailer?.businessName || `${this.retailer?.firstName} ${this.retailer?.lastName}`,
    wholesaler: this.wholesaler?.businessName,
    createdAt: this.createdAt,
    ageInDays: this.orderAgeInDays,
    valueClass: this.orderValueClass,
    canBeCancelled: {
      retailer: this.canBeCancelled('retailer'),
      wholesaler: this.canBeCancelled('wholesaler'),
      transporter: this.canBeCancelled('transporter')
    },
    allowedActions: this.getAllPossibleTransitions()
  };

  console.log(`📄 Generated order summary for ${this._id}`);
  return summary;
};

// Instance method to validate order data consistency
retailerOrderSchema.methods.validateOrderConsistency = function() {
  const issues = [];

  // Check required fields
  if (!this.retailer) issues.push('Missing retailer');
  if (!this.wholesaler) issues.push('Missing wholesaler');
  if (!this.product) issues.push('Missing product');
  if (!this.quantity || this.quantity < 1) issues.push('Invalid quantity');
  if (!this.unitPrice || this.unitPrice < 0) issues.push('Invalid unit price');
  if (!this.totalPrice || this.totalPrice < 0) issues.push('Invalid total price');

  // Check status-specific consistency
  if (this.status === 'certified' && !this.deliveryCertificationDate) {
    issues.push('Certified order missing delivery certification date');
  }

  if (this.status === 'delivered' && !this.actualDeliveryDate) {
    issues.push('Delivered order missing actual delivery date');
  }

  if (this.status === 'return_accepted' && !this.returnCompletedAt) {
    issues.push('Return accepted order missing return completion date');
  }

  const isValid = issues.length === 0;
  
  if (!isValid) {
    console.warn(`⚠️ Order consistency issues for ${this._id}:`, issues);
  }

  return {
    isValid: isValid,
    issues: issues,
    timestamp: new Date()
  };
};

// Instance method to get order timeline
retailerOrderSchema.methods.getOrderTimeline = function() {
  const timeline = [];

  // Order creation
  timeline.push({
    event: 'order_created',
    timestamp: this.createdAt,
    description: 'Order placed by retailer',
    status: 'pending'
  });

  // Status changes
  if (this.metadata?.lastStatusUpdate) {
    timeline.push({
      event: 'status_changed',
      timestamp: this.metadata.lastStatusUpdate.changedAt,
      description: `Status changed from ${this.metadata.lastStatusUpdate.previousStatus} to ${this.metadata.lastStatusUpdate.newStatus}`,
      status: this.metadata.lastStatusUpdate.newStatus
    });
  }

  // Assignment history
  this.assignmentHistory.forEach((assignment, index) => {
    timeline.push({
      event: 'transporter_assignment',
      timestamp: assignment.assignedAt,
      description: `Assigned to transporter (${assignment.assignmentType}) - ${assignment.status}`,
      status: this.status,
      assignmentType: assignment.assignmentType,
      reason: assignment.reason
    });
  });

  // Delivery events
  if (this.actualDeliveryDate) {
    timeline.push({
      event: 'order_delivered',
      timestamp: this.actualDeliveryDate,
      description: 'Order delivered to retailer',
      status: 'delivered'
    });
  }

  // Certification
  if (this.deliveryCertificationDate) {
    timeline.push({
      event: 'order_certified',
      timestamp: this.deliveryCertificationDate,
      description: 'Order certified by retailer',
      status: 'certified'
    });
  }

  // Sort by timestamp
  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Export the model
module.exports = mongoose.model('RetailerOrder', retailerOrderSchema);