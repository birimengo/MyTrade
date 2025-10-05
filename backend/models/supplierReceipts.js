const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sales: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierSale',
    required: true
  }],
  receiptDate: {
    type: Date,
    default: Date.now
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  totalProfit: {
    type: Number,
    required: true,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'refunded', 'void'],
    default: 'active'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'multiple'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'failed', 'partially_paid'],
    default: 'paid'
  },
  customerDetails: {
    name: String,
    email: String,
    phone: String,
    address: String
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
receiptSchema.index({ supplier: 1, receiptDate: -1 });
receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ 'customerDetails.email': 1 });
receiptSchema.index({ createdAt: -1 });

// Static method to create receipt with auto-generated number
receiptSchema.statics.createReceipt = async function(receiptData) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const receiptNumber = `RCP-${timestamp}-${random}`;
  
  return this.create({
    receiptNumber,
    ...receiptData
  });
};

// Instance method to calculate totals
receiptSchema.methods.calculateTotals = async function() {
  try {
    const SupplierSale = mongoose.model('SupplierSale');
    const sales = await SupplierSale.find({ _id: { $in: this.sales } });
    
    this.totalAmount = sales.reduce((total, sale) => total + sale.totalAmount, 0);
    this.totalProfit = sales.reduce((total, sale) => total + sale.totalProfit, 0);
    this.totalTax = sales.reduce((total, sale) => total + (sale.taxAmount || 0), 0);
    this.totalDiscount = sales.reduce((total, sale) => total + (sale.discountAmount || 0), 0);
    
    // Determine payment method based on sales
    const paymentMethods = [...new Set(sales.map(sale => sale.paymentMethod))];
    this.paymentMethod = paymentMethods.length > 1 ? 'multiple' : paymentMethods[0] || 'cash';

    // Extract customer details from first sale
    if (sales.length > 0 && sales[0].customerDetails) {
      this.customerDetails = sales[0].customerDetails;
    }
    
    return { 
      totalAmount: this.totalAmount, 
      totalProfit: this.totalProfit,
      totalTax: this.totalTax,
      totalDiscount: this.totalDiscount
    };
  } catch (error) {
    console.error('Error calculating receipt totals:', error);
    throw error;
  }
};

// Virtual for formatted receipt date
receiptSchema.virtual('formattedDate').get(function() {
  return this.receiptDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for sales count
receiptSchema.virtual('salesCount').get(function() {
  return this.sales.length;
});

// Virtual for items count
receiptSchema.virtual('itemsCount').get(async function() {
  try {
    const SupplierSale = mongoose.model('SupplierSale');
    const sales = await SupplierSale.find({ _id: { $in: this.sales } });
    return sales.reduce((total, sale) => total + sale.items.length, 0);
  } catch (error) {
    return 0;
  }
});

// Virtual for total items quantity
receiptSchema.virtual('totalItemsQuantity').get(async function() {
  try {
    const SupplierSale = mongoose.model('SupplierSale');
    const sales = await SupplierSale.find({ _id: { $in: this.sales } });
    return sales.reduce((total, sale) => 
      total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  } catch (error) {
    return 0;
  }
});

// Pre-save middleware to calculate totals
receiptSchema.pre('save', async function(next) {
  if (this.isModified('sales') && this.sales.length > 0) {
    await this.calculateTotals();
  }
  this.updatedAt = new Date();
  next();
});

// Ensure virtual fields are serialized
receiptSchema.set('toJSON', { virtuals: true });
receiptSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Receipt', receiptSchema);