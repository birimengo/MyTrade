const mongoose = require('mongoose');

const retailerReceiptSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customerName: {
    type: String,
    trim: true,
    default: ''
  },
  customerPhone: {
    type: String,
    trim: true,
    default: ''
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  items: [{
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    measurementUnit: {
      type: String,
      required: true,
      default: 'units'
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
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  saleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RetailerSales',
    required: true,
  }],
  receiptDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'digital_wallet', 'bank_transfer', 'other'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'partially_paid'],
    default: 'paid'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'refunded'],
    default: 'active'
  }
}, {
  timestamps: true,
});

// Virtual for formatted receipt date
retailerReceiptSchema.virtual('formattedDate').get(function() {
  return this.receiptDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted receipt time
retailerReceiptSchema.virtual('formattedTime').get(function() {
  return this.receiptDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Indexes for better query performance
retailerReceiptSchema.index({ retailer: 1, receiptDate: -1 });
retailerReceiptSchema.index({ receiptNumber: 1 });
retailerReceiptSchema.index({ retailer: 1, status: 1 });
retailerReceiptSchema.index({ 
  retailer: 1, 
  customerName: 'text', 
  'items.productName': 'text' 
});

// Middleware to calculate grand total before save
retailerReceiptSchema.pre('save', function(next) {
  const subtotal = Number(this.subtotal) || 0;
  const discountAmount = Number(this.discountAmount) || 0;
  const taxAmount = Number(this.taxAmount) || 0;
  this.grandTotal = subtotal - discountAmount + taxAmount;
  next();
});

// Static method to get receipt by retailer and receipt number
retailerReceiptSchema.statics.findByRetailerAndNumber = function(retailerId, receiptNumber) {
  return this.findOne({ retailer: retailerId, receiptNumber });
};

// Safe number utility function
const safeNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return typeof num === 'number' ? num : parseFloat(num) || 0;
};

// Instance method to get formatted receipt data with error handling
retailerReceiptSchema.methods.getFormattedReceipt = function() {
  try {
    const subtotal = safeNumber(this.subtotal);
    const discountAmount = safeNumber(this.discountAmount);
    const taxAmount = safeNumber(this.taxAmount);
    const grandTotal = safeNumber(this.grandTotal);
    const totalQuantity = safeNumber(this.totalQuantity);

    const items = (this.items || []).map(item => ({
      productName: item.productName || 'Unknown Product',
      quantity: safeNumber(item.quantity),
      measurementUnit: item.measurementUnit || 'units',
      unitPrice: safeNumber(item.unitPrice),
      totalPrice: safeNumber(item.totalPrice),
      formattedUnitPrice: `$${safeNumber(item.unitPrice).toFixed(2)}`,
      formattedTotalPrice: `$${safeNumber(item.totalPrice).toFixed(2)}`
    }));

    return {
      id: this._id,
      receiptNumber: this.receiptNumber || 'Unknown',
      receiptDate: this.formattedDate || this.formatDate(this.receiptDate),
      receiptTime: this.formattedTime,
      customer: {
        name: this.customerName || '',
        phone: this.customerPhone || '',
        email: this.customerEmail || ''
      },
      items: items,
      summary: {
        subtotal: subtotal,
        discountAmount: discountAmount,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        totalQuantity: totalQuantity,
        formattedSubtotal: `$${subtotal.toFixed(2)}`,
        formattedDiscount: `$${discountAmount.toFixed(2)}`,
        formattedTax: `$${taxAmount.toFixed(2)}`,
        formattedGrandTotal: `$${grandTotal.toFixed(2)}`
      },
      payment: {
        method: this.paymentMethod || 'cash',
        status: this.paymentStatus || 'paid'
      },
      status: this.status || 'active',
      notes: this.notes || ''
    };
  } catch (error) {
    console.error('Error formatting receipt:', error);
    // Fallback to basic receipt data
    return {
      id: this._id,
      receiptNumber: this.receiptNumber || 'Unknown',
      receiptDate: this.receiptDate,
      customerName: this.customerName || '',
      customerPhone: this.customerPhone || '',
      subtotal: safeNumber(this.subtotal),
      grandTotal: safeNumber(this.grandTotal),
      totalQuantity: safeNumber(this.totalQuantity),
      status: this.status || 'active',
      paymentMethod: this.paymentMethod || 'cash'
    };
  }
};

// Helper method to format date
retailerReceiptSchema.methods.formatDate = function(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

module.exports = mongoose.model('RetailerReceipt', retailerReceiptSchema);