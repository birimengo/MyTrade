const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierProduct',
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
  productionPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  profit: {
    type: Number,
    required: true
  },
  profitMargin: {
    type: Number,
    default: 0
  }
});

const supplierSaleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 5).toUpperCase();
      return `SALE-${timestamp}-${random}`;
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerDetails: {
    name: {
      type: String,
      default: 'Walk-in Customer'
    },
    email: String,
    phone: String,
    address: String,
    customerType: {
      type: String,
      enum: ['walk-in', 'regular', 'wholesale', 'corporate'],
      default: 'walk-in'
    }
  },
  items: [saleItemSchema],
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalProfit: {
    type: Number,
    required: true
  },
  totalProfitMargin: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded', 'pending', 'partially_refunded'],
    default: 'completed'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'check', 'digital_wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'failed', 'partially_paid'],
    default: 'paid'
  },
  shippingDetails: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    trackingNumber: String,
    shippingCost: {
      type: Number,
      default: 0
    }
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate totals before saving
supplierSaleSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
  this.totalProfit = this.items.reduce((total, item) => total + item.profit, 0);
  
  // Calculate profit margins
  this.items.forEach(item => {
    item.profitMargin = item.unitPrice > 0 ? 
      ((item.unitPrice - item.productionPrice) / item.unitPrice) * 100 : 0;
  });
  
  this.totalProfitMargin = this.totalAmount > 0 ? 
    (this.totalProfit / this.totalAmount) * 100 : 0;
  
  // Apply discount if any
  if (this.discountPercentage > 0) {
    this.discountAmount = (this.totalAmount * this.discountPercentage) / 100;
    this.totalAmount -= this.discountAmount;
  } else if (this.discountAmount > 0) {
    this.totalAmount -= this.discountAmount;
  }
  
  // Add tax and shipping
  this.totalAmount += (this.taxAmount + (this.shippingDetails?.shippingCost || 0));
  
  this.updatedAt = new Date();
  next();
});

// Virtual for net amount (before tax and shipping)
supplierSaleSchema.virtual('netAmount').get(function() {
  const itemsTotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
  const discount = this.discountPercentage > 0 ? 
    (itemsTotal * this.discountPercentage) / 100 : this.discountAmount;
  return itemsTotal - discount;
});

// Virtual for items count
supplierSaleSchema.virtual('itemsCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Static method to get sales summary
supplierSaleSchema.statics.getSalesSummary = async function(supplierId, startDate, endDate) {
  const matchStage = {
    supplier: new mongoose.Types.ObjectId(supplierId),
    status: 'completed'
  };
  
  if (startDate || endDate) {
    matchStage.saleDate = {};
    if (startDate) matchStage.saleDate.$gte = new Date(startDate);
    if (endDate) matchStage.saleDate.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalProfit: { $sum: '$totalProfit' },
        totalItemsSold: { $sum: '$itemsCount' },
        averageOrderValue: { $avg: '$totalAmount' },
        totalOrders: { $sum: 1 },
        totalDiscounts: { $sum: '$discountAmount' },
        totalTax: { $sum: '$taxAmount' }
      }
    }
  ]);
};

// Indexes for better performance
supplierSaleSchema.index({ supplier: 1, saleDate: -1 });
supplierSaleSchema.index({ saleNumber: 1 });
supplierSaleSchema.index({ 'customerDetails.name': 'text', 'customerDetails.email': 'text' });
supplierSaleSchema.index({ saleDate: -1 });
supplierSaleSchema.index({ status: 1 });
supplierSaleSchema.index({ 'items.productId': 1 });
supplierSaleSchema.index({ 'customerDetails.email': 1 });
supplierSaleSchema.index({ createdAt: -1 });

// Ensure virtual fields are serialized
supplierSaleSchema.set('toJSON', { virtuals: true });
supplierSaleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SupplierSale', supplierSaleSchema);