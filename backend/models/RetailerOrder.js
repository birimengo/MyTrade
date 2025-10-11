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

  return transitions[userRole][this.status] || [];
};

// Method to check if status transition is valid
retailerOrderSchema.methods.isValidTransition = function(newStatus, userRole) {
  return this.getAllowedTransitions(userRole).includes(newStatus);
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

// Pre-save middleware to calculate total price
retailerOrderSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice') || this.isModified('bulkDiscount')) {
    this.calculateTotal();
  }
  next();
});

module.exports = mongoose.model('RetailerOrder', retailerOrderSchema);