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
  costPrice: {
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
  },
  profit: {
    type: Number,
    required: true,
    default: 0
  },
  isCertifiedProduct: {
    type: Boolean,
    default: false
  },
  profitMargin: {
    type: Number,
    default: 0
  },
  profitPercentage: {
    type: Number,
    default: 0
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
    enum: ['existing', 'new', 'walk-in'],
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  
  // Profit Tracking
  totalCost: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalProfit: {
    type: Number,
    required: true,
    default: 0
  },
  totalProfitMargin: {
    type: Number,
    default: 0
  },
  totalProfitPercentage: {
    type: Number,
    default: 0
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
  },

  // Offline/Sync Support
  operationMode: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'synced'
  },
  localId: String,
  syncAttempts: {
    type: Number,
    default: 0
  },
  lastSyncAttempt: Date
}, {
  timestamps: true
});

// Generate reference number before saving
wholesaleSaleSchema.pre('save', async function(next) {
  if (this.isNew && !this.referenceNumber) {
    const count = await mongoose.model('WholesaleSale').countDocuments();
    this.referenceNumber = `WSALE-${Date.now()}-${count + 1}`;
  }
  
  // Calculate profit metrics before saving
  if (this.isModified('items') || this.isNew) {
    this.calculateProfitMetrics();
  }
  
  next();
});

// Calculate profit metrics
wholesaleSaleSchema.methods.calculateProfitMetrics = function() {
  let totalCost = 0;
  let subtotal = 0;
  let totalProfit = 0;
  
  this.items.forEach(item => {
    const itemCost = item.costPrice * item.quantity;
    const itemRevenue = item.unitPrice * item.quantity;
    const itemProfit = itemRevenue - itemCost;
    const itemProfitMargin = item.unitPrice - item.costPrice;
    const itemProfitPercentage = item.costPrice > 0 ? ((itemProfitMargin / item.costPrice) * 100) : 0;
    
    item.profit = itemProfit;
    item.profitMargin = itemProfitMargin;
    item.profitPercentage = itemProfitPercentage;
    
    totalCost += itemCost;
    subtotal += itemRevenue;
    totalProfit += itemProfit;
  });
  
  this.totalCost = totalCost;
  this.subtotal = subtotal;
  this.totalProfit = totalProfit;
  this.totalProfitMargin = this.grandTotal - totalCost;
  this.totalProfitPercentage = totalCost > 0 ? ((this.totalProfit / totalCost) * 100) : 0;
  
  // Recalculate grand total if needed
  if (this.grandTotal !== (subtotal - this.totalDiscount)) {
    this.grandTotal = subtotal - this.totalDiscount;
  }
  
  // Recalculate balance due
  this.balanceDue = this.grandTotal - this.amountPaid;
};

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

// Static method to get sales statistics with profit analysis
wholesaleSaleSchema.statics.getProfitStatistics = async function(wholesalerId, timeframe = 'month') {
  const now = new Date();
  let startDate = new Date();

  switch (timeframe) {
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

  return this.aggregate([
    {
      $match: {
        wholesaler: wholesalerId,
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$grandTotal' },
        totalCost: { $sum: '$totalCost' },
        totalProfit: { $sum: '$totalProfit' },
        averageProfitMargin: { $avg: '$totalProfitMargin' },
        averageProfitPercentage: { $avg: '$totalProfitPercentage' },
        mostProfitableSale: { $max: '$totalProfit' },
        leastProfitableSale: { $min: '$totalProfit' }
      }
    }
  ]);
};

// Static method to get product-wise profit analysis
wholesaleSaleSchema.statics.getProductProfitAnalysis = async function(wholesalerId, timeframe = 'month') {
  const now = new Date();
  let startDate = new Date();

  switch (timeframe) {
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

  return this.aggregate([
    {
      $match: {
        wholesaler: wholesalerId,
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        totalQuantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.total' },
        totalCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
        totalProfit: { $sum: '$items.profit' },
        averageSellingPrice: { $avg: '$items.unitPrice' },
        averageCostPrice: { $avg: '$items.costPrice' },
        averageProfitPerUnit: { $avg: { $subtract: ['$items.unitPrice', '$items.costPrice'] } },
        isCertifiedProduct: { $first: '$items.isCertifiedProduct' }
      }
    },
    {
      $addFields: {
        profitMargin: { $subtract: ['$totalRevenue', '$totalCost'] },
        profitPercentage: {
          $cond: {
            if: { $gt: ['$totalCost', 0] },
            then: { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalCost'] }, 100] },
            else: 0
          }
        }
      }
    },
    { $sort: { totalProfit: -1 } },
    { $limit: 20 }
  ]);
};

// Method to update sale with recalculated profits
wholesaleSaleSchema.methods.recalculateProfits = function() {
  this.calculateProfitMetrics();
  return this.save();
};

// Indexes for better query performance
wholesaleSaleSchema.index({ wholesaler: 1, createdAt: -1 });
wholesaleSaleSchema.index({ referenceNumber: 1 }, { unique: true });
wholesaleSaleSchema.index({ customerName: 'text', saleNotes: 'text' });
wholesaleSaleSchema.index({ customerPhone: 1 });
wholesaleSaleSchema.index({ saleDate: -1 });
wholesaleSaleSchema.index({ 'items.productId': 1 });
wholesaleSaleSchema.index({ totalProfit: -1 });
wholesaleSaleSchema.index({ syncStatus: 1 });
wholesaleSaleSchema.index({ operationMode: 1 });

// Ensure virtual fields are serialized
wholesaleSaleSchema.set('toJSON', { virtuals: true });
wholesaleSaleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WholesaleSale', wholesaleSaleSchema);