// models/WholesalerOrderToSupplier.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierProduct',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const wholesalerOrderToSupplierSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 5).toUpperCase();
      return `WO-${timestamp}-${random}`;
    }
  },
  wholesaler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderNotes: {
    type: String,
    default: '',
    maxlength: 1000
  },
  status: {
    type: String,
    enum: [
      'pending', 'confirmed', 'in_production', 'ready_for_delivery', 
      'assigned_to_transporter', 'accepted_by_transporter', 'in_transit', 
      'delivered', 'cancelled', 'certified', 'return_requested', 
      'return_accepted', 'return_in_transit', 'returned_to_supplier'
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid', 'refunded'],
    default: 'pending'
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    country: { type: String, required: true },
    postalCode: { type: String, default: '' },
    fullAddress: { type: String }
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  trackingNumber: String,
  carrier: String,
  discounts: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  internalNotes: {
    type: String,
    default: '',
    maxlength: 2000
  },
  // Transporter assignment fields
  assignedTransporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transporterAssignedAt: Date,
  transporterAcceptedAt: Date,
  inTransitAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  transporterNotes: {
    type: String,
    default: '',
    maxlength: 1000
  },
  estimatedDeliveryDate: Date,
  // Return process fields
  certifiedAt: Date,
  returnRequestedAt: Date,
  returnAcceptedAt: Date,
  returnInTransitAt: Date,
  returnedToSupplierAt: Date,
  returnReason: {
    type: String,
    default: '',
    maxlength: 1000
  },
  returnNotes: {
    type: String,
    default: '',
    maxlength: 2000
  },
  // Return transporter fields
  returnTransporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnTransporterAssignedAt: Date,
  returnTransporterAcceptedAt: Date,
  returnInTransitAt: Date,
  returnDeliveredAt: Date
}, {
  timestamps: true
});

// Generate full address before saving
wholesalerOrderToSupplierSchema.pre('save', function(next) {
  if (this.isModified('shippingAddress') && this.shippingAddress) {
    const addressParts = [
      this.shippingAddress.street,
      this.shippingAddress.city,
      this.shippingAddress.state,
      this.shippingAddress.country,
      this.shippingAddress.postalCode
    ].filter(part => part && part.trim() !== '');
    
    this.shippingAddress.fullAddress = addressParts.join(', ');
  }

  // Calculate final amount
  if (this.isModified('totalAmount') || this.isModified('discounts') || this.isModified('taxAmount')) {
    this.finalAmount = (this.totalAmount || 0) - (this.discounts || 0) + (this.taxAmount || 0);
  }

  // Set transporter assigned timestamp when transporter is assigned
  if (this.isModified('assignedTransporter') && this.assignedTransporter) {
    this.transporterAssignedAt = new Date();
  }

  // Set return transporter assigned timestamp
  if (this.isModified('returnTransporter') && this.returnTransporter) {
    this.returnTransporterAssignedAt = new Date();
  }

  // Set timestamps for new statuses
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'certified':
        this.certifiedAt = now;
        break;
      case 'return_requested':
        this.returnRequestedAt = now;
        break;
      case 'return_accepted':
        this.returnAcceptedAt = now;
        this.returnTransporterAcceptedAt = now;
        break;
      case 'return_in_transit':
        this.returnInTransitAt = now;
        break;
      case 'returned_to_supplier':
        this.returnedToSupplierAt = now;
        this.returnDeliveredAt = now;
        break;
    }
  }

  next();
});

// Virtual for order age in days
wholesalerOrderToSupplierSchema.virtual('orderAge').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to check if order can be cancelled
wholesalerOrderToSupplierSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Method to check if transporter can be assigned
wholesalerOrderToSupplierSchema.methods.canAssignTransporter = function() {
  return ['ready_for_delivery'].includes(this.status);
};

// Method to check if order can be certified or returned
wholesalerOrderToSupplierSchema.methods.canBeCertifiedOrReturned = function() {
  return this.status === 'delivered';
};

// Method to check if order can be deleted
wholesalerOrderToSupplierSchema.methods.canBeDeleted = function() {
  return this.status === 'pending';
};

// Method to check if return can be accepted by transporter
wholesalerOrderToSupplierSchema.methods.canAcceptReturn = function() {
  return this.status === 'return_requested';
};

// Method to check if return can be started
wholesalerOrderToSupplierSchema.methods.canStartReturnDelivery = function() {
  return this.status === 'return_accepted';
};

// Method to check if return can be completed
wholesalerOrderToSupplierSchema.methods.canCompleteReturn = function() {
  return this.status === 'return_in_transit';
};

// Indexes for better query performance
wholesalerOrderToSupplierSchema.index({ wholesaler: 1, createdAt: -1 });
wholesalerOrderToSupplierSchema.index({ supplier: 1, status: 1 });
wholesalerOrderToSupplierSchema.index({ orderNumber: 1 });
wholesalerOrderToSupplierSchema.index({ status: 1 });
wholesalerOrderToSupplierSchema.index({ createdAt: -1 });
wholesalerOrderToSupplierSchema.index({ assignedTransporter: 1 });
wholesalerOrderToSupplierSchema.index({ returnTransporter: 1 });

module.exports = mongoose.model('WholesalerOrderToSupplier', wholesalerOrderToSupplierSchema);