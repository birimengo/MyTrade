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
  // Enhanced metadata field for additional data
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

// ==================== CRITICAL MISSING METHODS - ADDED BACK ====================

// Method to check if user can perform action on order
retailerOrderSchema.methods.canUserPerformAction = function(userId, userRole) {
  if (userRole === 'admin') {
    return true;
  }
  
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

// Method to get allowed status transitions based on user role
retailerOrderSchema.methods.getAllowedTransitions = function(userRole) {
  const transitions = {
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

  return transitions[userRole]?.[this.status] || [];
};

// Method to check if status transition is valid
retailerOrderSchema.methods.isValidTransition = function(newStatus, userRole) {
  const allowedTransitions = this.getAllowedTransitions(userRole);
  return allowedTransitions.includes(newStatus);
};

// Method to add assignment history
retailerOrderSchema.methods.addAssignmentHistory = function(transporterId, assignmentType, status, reason = null, expiredAt = null) {
  this.assignmentHistory.push({
    transporter: transporterId,
    assignmentType,
    status,
    reason,
    expiredAt: expiredAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours expiry
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

// Enhanced method to get order timeline
retailerOrderSchema.methods.generateTimeline = function() {
  const timeline = [];
  
  // Order creation
  timeline.push({
    event: 'order_created',
    timestamp: this.createdAt,
    description: 'Order placed by retailer',
    user: this.retailer,
    status: 'pending'
  });

  // Status changes
  if (this.updatedAt && this.updatedAt !== this.createdAt) {
    timeline.push({
      event: 'status_updated',
      timestamp: this.updatedAt,
      description: `Status changed to ${this.status}`,
      status: this.status
    });
  }

  // Assignment history
  if (this.assignmentHistory && this.assignmentHistory.length > 0) {
    this.assignmentHistory.forEach(assignment => {
      timeline.push({
        event: `transporter_${assignment.status}`,
        timestamp: assignment.assignedAt,
        description: `Order ${assignment.status} by transporter`,
        assignmentType: assignment.assignmentType,
        reason: assignment.reason
      });
    });
  }

  // Cancellation events
  if (this.cancellationDetails) {
    timeline.push({
      event: 'order_cancelled',
      timestamp: this.cancellationDetails.cancelledAt,
      description: `Order cancelled: ${this.cancellationDetails.reason}`,
      user: this.cancellationDetails.cancelledBy,
      previousStatus: this.cancellationDetails.previousStatus
    });
  }

  // Delivery events
  if (this.actualDeliveryDate) {
    timeline.push({
      event: 'order_delivered',
      timestamp: this.actualDeliveryDate,
      description: 'Order delivered to retailer',
      user: this.transporter
    });
  }

  // Certification events
  if (this.deliveryCertificationDate) {
    timeline.push({
      event: 'order_certified',
      timestamp: this.deliveryCertificationDate,
      description: 'Order certified by retailer'
    });
  }

  // Dispute events
  if (this.deliveryDispute) {
    timeline.push({
      event: 'order_disputed',
      timestamp: this.deliveryDispute.disputedAt,
      description: `Order disputed: ${this.deliveryDispute.reason}`,
      user: this.deliveryDispute.disputedBy
    });

    if (this.deliveryDispute.resolvedAt) {
      timeline.push({
        event: 'dispute_resolved',
        timestamp: this.deliveryDispute.resolvedAt,
        description: `Dispute resolved: ${this.deliveryDispute.resolutionNotes}`,
        user: this.deliveryDispute.resolvedBy
      });
    }
  }

  // Return events
  if (this.returnDetails) {
    if (this.returnDetails.returnRequestedAt) {
      timeline.push({
        event: 'return_requested',
        timestamp: this.returnDetails.returnRequestedAt,
        description: `Return requested: ${this.returnDetails.returnReason}`,
        user: this.returnDetails.returnedBy
      });
    }

    if (this.returnDetails.returnAcceptedAt) {
      timeline.push({
        event: 'return_accepted',
        timestamp: this.returnDetails.returnAcceptedAt,
        description: 'Return accepted by wholesaler',
        user: this.returnDetails.handledBy
      });
    }

    if (this.returnDetails.returnRejectedAt) {
      timeline.push({
        event: 'return_rejected',
        timestamp: this.returnDetails.returnRejectedAt,
        description: `Return rejected: ${this.returnDetails.returnRejectionReason}`,
        user: this.returnDetails.handledBy
      });
    }
  }

  // Sort timeline by timestamp
  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Enhanced method to check if assignment is expired
retailerOrderSchema.methods.isAssignmentExpired = function() {
  const lastAssignment = this.getLastAssignment();
  if (!lastAssignment || !lastAssignment.expiredAt) return false;
  
  return new Date() > new Date(lastAssignment.expiredAt);
};

// Enhanced method to get current assignment status
retailerOrderSchema.methods.getAssignmentStatus = function() {
  if (this.status !== 'assigned_to_transporter') return null;
  
  const lastAssignment = this.getLastAssignment();
  if (!lastAssignment) return 'Not assigned';
  
  if (this.isAssignmentExpired()) {
    return 'Assignment expired - needs re-assignment';
  }
  
  if (lastAssignment.assignmentType === 'free') {
    return 'Waiting for any transporter to accept';
  }
  
  return `Assigned to specific transporter - ${lastAssignment.status}`;
};

// Pre-save middleware to calculate total price
retailerOrderSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice') || this.isModified('bulkDiscount')) {
    this.calculateTotal();
  }
  
  // Enhanced: Update metadata on status changes
  if (this.isModified('status')) {
    this.metadata = this.metadata || {};
    this.metadata.lastStatusUpdate = {
      previousStatus: this._previousStatus,
      newStatus: this.status,
      changedAt: new Date()
    };
    this._previousStatus = this.status;
  }
  
  next();
});

// Enhanced static methods for analytics
retailerOrderSchema.statics.getOrderStatistics = async function(userId, userRole, timeRange = 'month') {
  let filter = {};
  if (userRole === 'retailer') {
    filter.retailer = userId;
  } else if (userRole === 'wholesaler') {
    filter.wholesaler = userId;
  } else if (userRole === 'transporter') {
    filter.transporter = userId;
  }

  // Time range filtering
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

  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' },
        totalQuantity: { $sum: '$quantity' }
      }
    }
  ]);
};

module.exports = mongoose.model('RetailerOrder', retailerOrderSchema);