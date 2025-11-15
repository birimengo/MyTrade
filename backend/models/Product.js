const mongoose = require('mongoose');

// Image schema definition
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  format: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enhanced price history schema with change types
const priceHistorySchema = new mongoose.Schema({
  sellingPrice: {
    type: Number,
    required: true
  },
  costPrice: {
    type: Number,
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: {
    type: String,
    default: 'Price adjustment'
  },
  saleReference: {
    type: String
  },
  changeType: {
    type: String,
    enum: ['manual', 'sale', 'market_adjustment', 'cost_change', 'promotional', 'bulk_update', 'initial', 'auto_adjustment'],
    default: 'manual'
  },
  note: {
    type: String
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // SELLING PRICE (to customers)
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // COST PRICE (stocked price - what you paid)
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  measurementUnit: {
    type: String,
    required: true,
    default: 'units'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  // Images field using the imageSchema
  images: [imageSchema],
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  bulkDiscount: {
    type: Boolean,
    default: false
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  wholesaler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  // Stock Management
  lowStockAlert: {
    type: Boolean,
    default: false
  },
  lowStockAlertAt: {
    type: Date
  },
  originalStockQuantity: {
    type: Number,
    min: 0
  },
  lastStockUpdate: {
    type: Date
  },
  lowStockThreshold: {
    type: Number,
    default: 0.5,
    min: 0.1,
    max: 0.9
  },
  // Certified Products
  fromCertifiedOrder: {
    type: Boolean,
    default: false
  },
  certifiedOrderSource: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WholesalerOrderToSupplier'
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    certifiedAt: {
      type: Date
    }
  },
  // Price Editing Tracking
  priceManuallyEdited: {
    type: Boolean,
    default: false
  },
  originalSellingPrice: {
    type: Number,
    min: 0
  },
  // Enhanced price history
  priceHistory: [priceHistorySchema],
  // Last price change information
  lastPriceChange: {
    previousPrice: Number,
    newPrice: Number,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    changeType: String
  },
  // Price statistics
  priceStatistics: {
    highestPrice: Number,
    lowestPrice: Number,
    averagePrice: Number,
    priceChangeCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Virtual for profit margin calculation
productSchema.virtual('profitMargin').get(function() {
  if (this.costPrice && this.price && this.costPrice > 0) {
    return ((this.price - this.costPrice) / this.costPrice * 100).toFixed(2);
  }
  return 0;
});

// Virtual for profit per unit
productSchema.virtual('profitPerUnit').get(function() {
  if (this.costPrice && this.price) {
    return (this.price - this.costPrice).toFixed(2);
  }
  return 0;
});

// Virtual for total profit potential
productSchema.virtual('totalProfitPotential').get(function() {
  if (this.costPrice && this.price && this.quantity) {
    return ((this.price - this.costPrice) * this.quantity).toFixed(2);
  }
  return 0;
});

// Generate SKU before saving
productSchema.pre('save', async function(next) {
  if (this.isNew && !this.sku) {
    const count = await mongoose.model('Product').countDocuments();
    this.sku = `SKU-${Date.now()}-${count + 1}`;
  }
  next();
});

// Method to check low stock
productSchema.methods.checkLowStock = function() {
  if (this.originalStockQuantity && this.originalStockQuantity > 0) {
    const threshold = this.originalStockQuantity * this.lowStockThreshold;
    const wasLowStock = this.lowStockAlert;
    this.lowStockAlert = this.quantity <= threshold;
    
    if (this.lowStockAlert && !wasLowStock) {
      this.lowStockAlertAt = new Date();
    }
  }
  return this.lowStockAlert;
};

// Enhanced method to update price with comprehensive history tracking
productSchema.methods.updatePrice = function(newPrice, userId, reason = 'Price adjustment', saleReference = null, changeType = 'manual', note = '') {
  const oldPrice = this.price;
  const newSellingPrice = parseFloat(newPrice);
  
  // Only track if price actually changed
  if (newSellingPrice !== oldPrice) {
    // Add current price to history before updating
    this.priceHistory.push({
      sellingPrice: oldPrice,
      costPrice: this.costPrice,
      changedAt: new Date(),
      changedBy: userId,
      reason: reason,
      saleReference: saleReference,
      changeType: changeType,
      note: note
    });

    // Update last price change info
    this.lastPriceChange = {
      previousPrice: oldPrice,
      newPrice: newSellingPrice,
      changedAt: new Date(),
      changedBy: userId,
      reason: reason,
      changeType: changeType
    };

    // Update current price
    this.price = newSellingPrice;
    this.priceManuallyEdited = changeType === 'manual';
    
    // Update price statistics
    this.updatePriceStatistics();

    // Set original selling price if not set
    if (!this.originalSellingPrice) {
      this.originalSellingPrice = oldPrice;
    }
    
    // Increment price change counter
    this.priceStatistics.priceChangeCount += 1;
  }
};

// Method to update price statistics
productSchema.methods.updatePriceStatistics = function() {
  if (this.priceHistory.length > 0) {
    const prices = this.priceHistory.map(entry => entry.sellingPrice);
    prices.push(this.price); // Include current price
    
    this.priceStatistics.highestPrice = Math.max(...prices);
    this.priceStatistics.lowestPrice = Math.min(...prices);
    this.priceStatistics.averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }
};

// Method to generate sample price history for existing products
productSchema.methods.generateSamplePriceHistory = function(userId, daysBack = 90) {
  if (this.priceHistory.length <= 1) { // Only generate if minimal history exists
    const sampleHistory = [];
    const currentDate = new Date();
    const costPrice = this.costPrice;
    const currentPrice = this.price;

    // Generate realistic price points over the specified days
    const numberOfEntries = Math.floor(Math.random() * 8) + 5; // 5-12 entries
    
    const reasons = [
      'Market price adjustment',
      'Supplier cost change',
      'Seasonal pricing adjustment',
      'Competitor price matching',
      'Bulk discount implementation',
      'Promotional pricing',
      'Cost optimization',
      'Demand-based pricing',
      'Inventory clearance',
      'New supplier pricing'
    ];
    
    const changeTypes = ['market_adjustment', 'cost_change', 'promotional', 'auto_adjustment'];
    
    for (let i = 0; i < numberOfEntries; i++) {
      const daysAgo = Math.floor(Math.random() * daysBack);
      const historyDate = new Date(currentDate);
      historyDate.setDate(historyDate.getDate() - daysAgo);
      
      // Generate realistic price fluctuation (within 15-30% of current price)
      const priceVariation = (Math.random() * 0.3) - 0.15;
      const historicalPrice = currentPrice * (1 + priceVariation);
      
      // Ensure price is realistic (at least 5% above cost)
      const finalPrice = Math.max(costPrice * 1.05, parseFloat(historicalPrice.toFixed(2)));
      
      const reasonIndex = Math.floor(Math.random() * reasons.length);
      const changeTypeIndex = Math.floor(Math.random() * changeTypes.length);
      
      sampleHistory.push({
        sellingPrice: finalPrice,
        costPrice: costPrice,
        changedAt: historyDate,
        changedBy: userId,
        reason: reasons[reasonIndex],
        changeType: changeTypes[changeTypeIndex],
        note: `Auto-generated sample data`
      });
    }

    // Sort by date (oldest first) and add to history
    sampleHistory.sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
    this.priceHistory = [...sampleHistory, ...this.priceHistory];
    
    // Update statistics
    this.updatePriceStatistics();
    this.priceStatistics.priceChangeCount += sampleHistory.length;
  }
};

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Set original stock quantity when product is first created
  if (this.isNew && !this.originalStockQuantity) {
    this.originalStockQuantity = this.quantity;
  }
  
  // Initialize price statistics if not set
  if (!this.priceStatistics) {
    this.priceStatistics = {
      priceChangeCount: 0
    };
  }
  
  // Check low stock whenever quantity changes
  if (this.isModified('quantity')) {
    this.checkLowStock();
    this.lastStockUpdate = new Date();
  }
  
  // Update price statistics when price changes
  if (this.isModified('price') && this.priceHistory.length > 0) {
    this.updatePriceStatistics();
  }
  
  next();
});

// Pre-save middleware to validate selling price is not below cost price
productSchema.pre('save', function(next) {
  if (this.price < this.costPrice) {
    const error = new Error(`Selling price (${this.price}) cannot be less than cost price (${this.costPrice})`);
    return next(error);
  }
  next();
});

// Ensure virtual fields are included when converting to JSON
productSchema.set('toJSON', { virtuals: true });

// Indexes for better query performance
productSchema.index({ wholesaler: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ lowStockAlert: 1 });
productSchema.index({ wholesaler: 1, lowStockAlert: 1 });
productSchema.index({ wholesaler: 1, fromCertifiedOrder: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ 'priceHistory.changedAt': -1 });
productSchema.index({ 'priceStatistics.priceChangeCount': -1 });

module.exports = mongoose.model('Product', productSchema);