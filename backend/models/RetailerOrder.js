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

// Method to get allowed status transitions based on user role - FIXED VERSION
retailerOrderSchema.methods.getAllowedTransitions = function(userRole) {
  const transitions = {
    retailer: {
      pending: ['cancelled_by_retailer'],
      accepted: ['cancelled_by_retailer'],
      processing: ['cancelled_by_retailer'],
      delivered: ['certified', 'disputed'],
    },
    wholesaler: {
      pending: ['accepted', 'rejected'], // FIXED: Added pending to accepted transition
      accepted: ['processing', 'cancelled_by_wholesaler'],
      processing: ['assigned_to_transporter', 'cancelled_by_wholesaler'],
      assigned_to_transporter: ['assigned_to_transporter'], // Allow reassignment
      rejected_by_transporter: ['assigned_to_transporter'], // Allow reassignment after rejection
      cancelled_by_transporter: ['assigned_to_transporter'], // Allow reassignment after cancellation
      disputed: ['assigned_to_transporter'], // Allow reassignment after dispute
      return_to_wholesaler: ['return_accepted', 'return_rejected'], // Handle return requests
    },
    transporter: {
      assigned_to_transporter: ['accepted_by_transporter', 'rejected_by_transporter', 'cancelled_by_transporter'],
      accepted_by_transporter: ['in_transit', 'cancelled_by_transporter'],
      in_transit: ['delivered', 'cancelled_by_transporter'],
      disputed: ['return_to_wholesaler'], // Initiate return for disputed orders
    }
  };

  // Safe access with optional chaining and nullish coalescing
  return transitions[userRole]?.[this.status] ?? [];
};

// Method to check if status transition is valid - ENHANCED VERSION
retailerOrderSchema.methods.isValidTransition = function(newStatus, userRole) {
  try {
    const allowedTransitions = this.getAllowedTransitions(userRole);
    
    // Debug logging for troubleshooting
    console.log(`🔄 Status Transition Check:`, {
      orderId: this._id,
      currentStatus: this.status,
      requestedStatus: newStatus,
      userRole: userRole,
      allowedTransitions: allowedTransitions,
      isValid: allowedTransitions.includes(newStatus)
    });
    
    return allowedTransitions.includes(newStatus);
  } catch (error) {
    console.error('❌ Error checking status transition:', error);
    return false;
  }
};

// Method to add assignment history
retailerOrderSchema.methods.addAssignmentHistory = function(transporterId, assignmentType, status, reason = null, expiredAt = null) {
  this.assignmentHistory.push({
    transporter: transporterId,
    assignmentType,
    status,
    reason,
    expiredAt
  });
};

// Method to get the last assignment
retailerOrderSchema.methods.getLastAssignment = function() {
  if (this.assignmentHistory.length === 0) return null;
  return this.assignmentHistory[this.assignmentHistory.length - 1];
};

// Method to calculate total price
retailerOrderSchema.methods.calculateTotal = function() {
  let total = this.quantity * this.unitPrice;

  if (this.bulkDiscount?.applied) {
    const discountAmount = total * (this.bulkDiscount.discountPercentage / 100);
    total -= discountAmount;
    this.discountApplied = discountAmount;
  }

  this.totalPrice = total;
  return total;
};

// Method to get required role for action
retailerOrderSchema.methods.getRequiredRoleForAction = function(action) {
  const roleActions = {
    view: ['retailer', 'wholesaler', 'transporter', 'admin'],
    update: ['retailer', 'wholesaler', 'transporter', 'admin'],
    delete: ['retailer', 'admin']
  };
  
  return roleActions[action] || [];
};

// Enhanced pre-save middleware with better validation
retailerOrderSchema.pre('save', function(next) {
  // Calculate total price if relevant fields are modified
  if (this.isModified('quantity') || this.isModified('unitPrice') || this.isModified('bulkDiscount')) {
    this.calculateTotal();
  }
  
  // Add metadata if not present
  if (!this.metadata) {
    this.metadata = {};
  }
  
  // Track status changes in metadata
  if (this.isModified('status') && !this.isNew) {
    this.metadata.lastStatusUpdate = {
      previousStatus: this.get('originalStatus') || 'unknown',
      newStatus: this.status,
      changedAt: new Date()
    };
  }
  
  next();
});

// Post-init to store original status for tracking changes
retailerOrderSchema.post('init', function(doc) {
  doc.originalStatus = doc.status;
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
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' }
      }
    }
  ]);
};

// Virtual for order age in days
retailerOrderSchema.virtual('orderAgeInDays').get(function() {
  const created = new Date(this.createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to check if order can be cancelled
retailerOrderSchema.methods.canBeCancelled = function(userRole) {
  const cancellableStatuses = {
    retailer: ['pending', 'accepted', 'processing'],
    wholesaler: ['pending', 'accepted', 'processing'],
    transporter: ['assigned_to_transporter', 'accepted_by_transporter']
  };
  
  return cancellableStatuses[userRole]?.includes(this.status) || false;
};

// Instance method to get order summary
retailerOrderSchema.methods.getOrderSummary = function() {
  return {
    orderId: this._id,
    status: this.status,
    product: this.product?.name || 'Unknown Product',
    quantity: this.quantity,
    measurementUnit: this.measurementUnit,
    totalPrice: this.totalPrice,
    retailer: this.retailer?.businessName || `${this.retailer?.firstName} ${this.retailer?.lastName}`,
    wholesaler: this.wholesaler?.businessName,
    createdAt: this.createdAt,
    ageInDays: this.orderAgeInDays
  };
};

// Export the model
module.exports = mongoose.model('RetailerOrder', retailerOrderSchema);