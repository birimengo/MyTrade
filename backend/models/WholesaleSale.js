// models/WholesaleSale.js
const mongoose = require('mongoose');

const wholesaleSaleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
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
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const customerInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  address: {
    type: String
  },
  businessName: {
    type: String
  },
  taxId: {
    type: String
  }
});

const wholesaleSaleSchema = new mongoose.Schema({
  // Customer Information
  customerType: {
    type: String,
    enum: ['existing', 'new'],
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference to User model for existing customers
  },
  customerInfo: {
    type: customerInfoSchema,
    required: function() {
      return this.customerType === 'new';
    }
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String
  },
  customerAddress: {
    type: String
  },
  customerBusinessName: {
    type: String
  },

  // Sale Details
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  saleTime: String,
  paymentMethod: {
    type: String,
    enum: ['cash', 'mobile_money', 'bank_transfer', 'credit', 'card'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    required: true
  },
  saleNotes: String,

  // Sale Items
  items: [wholesaleSaleItemSchema],

  // Financial Summary
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  balanceDue: {
    type: Number,
    default: 0,
    min: 0
  },

  // Metadata
  wholesaler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Generate reference number before saving
wholesaleSaleSchema.pre('save', async function(next) {
  if (this.isNew && !this.referenceNumber) {
    const count = await mongoose.model('WholesaleSale').countDocuments();
    this.referenceNumber = `WSALE-${Date.now()}-${count + 1}`;
  }
  next();
});

// Virtual for customer details
wholesaleSaleSchema.virtual('customerDetails').get(function() {
  if (this.customerType === 'existing' && this.customerId) {
    return {
      name: this.customerName,
      phone: this.customerPhone,
      email: this.customerEmail,
      address: this.customerAddress,
      businessName: this.customerBusinessName,
      isExisting: true,
      customerId: this.customerId
    };
  } else {
    return {
      name: this.customerInfo?.name || this.customerName,
      phone: this.customerInfo?.phone || this.customerPhone,
      email: this.customerInfo?.email || this.customerEmail,
      address: this.customerInfo?.address || this.customerAddress,
      businessName: this.customerInfo?.businessName || this.customerBusinessName,
      taxId: this.customerInfo?.taxId,
      isExisting: false
    };
  }
});

// Ensure virtual fields are serialized
wholesaleSaleSchema.set('toJSON', { virtuals: true });

// Indexes for better query performance
wholesaleSaleSchema.index({ wholesaler: 1, createdAt: -1 });
wholesaleSaleSchema.index({ referenceNumber: 1 }, { unique: true });
wholesaleSaleSchema.index({ customerName: 'text', saleNotes: 'text' });
wholesaleSaleSchema.index({ customerPhone: 1 });
wholesaleSaleSchema.index({ saleDate: -1 });

module.exports = mongoose.model('WholesaleSale', wholesaleSaleSchema);