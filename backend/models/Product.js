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
    enum: ['manual', 'sale', 'market_adjustment', 'cost_change', 'promotional', 'bulk_update', 'initial', 'auto_adjustment', 'restock'],
    default: 'manual'
  },
  note: {
    type: String
  }
});

// Stock history schema for tracking stock changes
const stockHistorySchema = new mongoose.Schema({
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  changeAmount: {
    type: Number,
    required: true
  },
  changeType: {
    type: String,
    enum: ['stock_in', 'stock_out', 'manual_adjustment', 'order_certified', 'return_processed', 'initial_stock', 'restock'],
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
    default: 'Stock adjustment'
  },
  orderReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RetailerOrder'
  },
  note: {
    type: String
  }
});

// Restock history schema for tracking restock operations
const restockHistorySchema = new mongoose.Schema({
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  quantityAdded: {
    type: Number,
    required: true
  },
  previousPrice: {
    type: Number
  },
  newPrice: {
    type: Number
  },
  previousMinOrderQuantity: {
    type: Number
  },
  newMinOrderQuantity: {
    type: Number
  },
  previousCostPrice: {
    type: Number
  },
  newCostPrice: {
    type: Number
  },
  restockedAt: {
    type: Date,
    default: Date.now
  },
  restockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    default: 'Restock'
  },
  note: {
    type: String
  },
  investment: {
    type: Number,
    required: true
  },
  totalStockValue: {
    type: Number,
    required: true
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
  // Enhanced Stock Management
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
  // Stock History Tracking
  stockHistory: [stockHistorySchema],
  // Stock Statistics
  stockStatistics: {
    totalStockIn: {
      type: Number,
      default: 0
    },
    totalStockOut: {
      type: Number,
      default: 0
    },
    stockChangeCount: {
      type: Number,
      default: 0
    },
    lastStockInDate: {
      type: Date
    },
    lastStockOutDate: {
      type: Date
    }
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
  // Last stock change information
  lastStockChange: {
    previousQuantity: Number,
    newQuantity: Number,
    changeAmount: Number,
    changeType: String,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    orderReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RetailerOrder'
    }
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
  },
  // Restock History
  restockHistory: [restockHistorySchema],
  // Restock Statistics
  restockStatistics: {
    totalRestocks: {
      type: Number,
      default: 0
    },
    totalQuantityAdded: {
      type: Number,
      default: 0
    },
    totalInvestment: {
      type: Number,
      default: 0
    },
    lastRestockDate: {
      type: Date
    },
    averageRestockQuantity: {
      type: Number,
      default: 0
    }
  },
  // Last restock information
  lastRestock: {
    quantityAdded: Number,
    previousQuantity: Number,
    newQuantity: Number,
    previousPrice: Number,
    newPrice: Number,
    previousMinOrderQuantity: Number,
    newMinOrderQuantity: Number,
    investment: Number,
    restockedAt: Date,
    restockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
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

// Virtual for current stock value
productSchema.virtual('stockValue').get(function() {
  if (this.costPrice && this.quantity) {
    return (this.costPrice * this.quantity).toFixed(2);
  }
  return 0;
});

// Virtual for potential revenue
productSchema.virtual('potentialRevenue').get(function() {
  if (this.price && this.quantity) {
    return (this.price * this.quantity).toFixed(2);
  }
  return 0;
});

// Virtual for restock analytics
productSchema.virtual('restockAnalytics').get(function() {
  return this.getRestockAnalytics(30); // Last 30 days
});

// Generate SKU before saving
productSchema.pre('save', async function(next) {
  if (this.isNew && !this.sku) {
    const count = await mongoose.model('Product').countDocuments();
    this.sku = `SKU-${Date.now()}-${count + 1}`;
  }
  next();
});

// ==================== STOCK MANAGEMENT METHODS ====================

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

// Method to reduce stock with comprehensive tracking
productSchema.methods.reduceStock = function(quantity, userId, reason = 'Stock reduction', orderReference = null, note = '') {
  if (this.quantity < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.quantity}, Requested: ${quantity}`);
  }
  
  const previousQuantity = this.quantity;
  const newQuantity = previousQuantity - quantity;
  
  // Add to stock history
  this.stockHistory.push({
    previousQuantity: previousQuantity,
    newQuantity: newQuantity,
    changeAmount: -quantity,
    changeType: 'stock_out',
    changedAt: new Date(),
    changedBy: userId,
    reason: reason,
    orderReference: orderReference,
    note: note
  });
  
  // Update last stock change
  this.lastStockChange = {
    previousQuantity: previousQuantity,
    newQuantity: newQuantity,
    changeAmount: -quantity,
    changeType: 'stock_out',
    changedAt: new Date(),
    changedBy: userId,
    reason: reason,
    orderReference: orderReference
  };
  
  // Update current quantity
  this.quantity = newQuantity;
  
  // Update stock statistics
  this.stockStatistics.totalStockOut += quantity;
  this.stockStatistics.stockChangeCount += 1;
  this.stockStatistics.lastStockOutDate = new Date();
  
  // Check low stock
  this.checkLowStock();
  this.lastStockUpdate = new Date();
  
  console.log(`📦 Stock reduced for ${this.name}: ${previousQuantity} -> ${newQuantity} (reduced by ${quantity})`);
  
  return {
    previousQuantity,
    newQuantity,
    changeAmount: -quantity,
    stockHistoryId: this.stockHistory[this.stockHistory.length - 1]._id
  };
};

// Method to restore stock with comprehensive tracking
productSchema.methods.restoreStock = function(quantity, userId, reason = 'Stock restoration', orderReference = null, note = '') {
  const previousQuantity = this.quantity;
  const newQuantity = previousQuantity + quantity;
  
  // Add to stock history
  this.stockHistory.push({
    previousQuantity: previousQuantity,
    newQuantity: newQuantity,
    changeAmount: quantity,
    changeType: 'stock_in',
    changedAt: new Date(),
    changedBy: userId,
    reason: reason,
    orderReference: orderReference,
    note: note
  });
  
  // Update last stock change
  this.lastStockChange = {
    previousQuantity: previousQuantity,
    newQuantity: newQuantity,
    changeAmount: quantity,
    changeType: 'stock_in',
    changedAt: new Date(),
    changedBy: userId,
    reason: reason,
    orderReference: orderReference
  };
  
  // Update current quantity
  this.quantity = newQuantity;
  
  // Update stock statistics
  this.stockStatistics.totalStockIn += quantity;
  this.stockStatistics.stockChangeCount += 1;
  this.stockStatistics.lastStockInDate = new Date();
  
  // Check low stock
  this.checkLowStock();
  this.lastStockUpdate = new Date();
  
  console.log(`📦 Stock restored for ${this.name}: ${previousQuantity} -> ${newQuantity} (restored by ${quantity})`);
  
  return {
    previousQuantity,
    newQuantity,
    changeAmount: quantity,
    stockHistoryId: this.stockHistory[this.stockHistory.length - 1]._id
  };
};

// Method to manually adjust stock
productSchema.methods.adjustStock = function(newQuantity, userId, reason = 'Manual adjustment', note = '') {
  const previousQuantity = this.quantity;
  const changeAmount = newQuantity - previousQuantity;
  const changeType = changeAmount > 0 ? 'stock_in' : 'stock_out';
  
  // Add to stock history
  this.stockHistory.push({
    previousQuantity: previousQuantity,
    newQuantity: newQuantity,
    changeAmount: changeAmount,
    changeType: 'manual_adjustment',
    changedAt: new Date(),
    changedBy: userId,
    reason: reason,
    note: note
  });
  
  // Update last stock change
  this.lastStockChange = {
    previousQuantity: previousQuantity,
    newQuantity: newQuantity,
    changeAmount: changeAmount,
    changeType: 'manual_adjustment',
    changedAt: new Date(),
    changedBy: userId,
    reason: reason
  };
  
  // Update current quantity
  this.quantity = newQuantity;
  
  // Update stock statistics
  if (changeAmount > 0) {
    this.stockStatistics.totalStockIn += changeAmount;
    this.stockStatistics.lastStockInDate = new Date();
  } else {
    this.stockStatistics.totalStockOut += Math.abs(changeAmount);
    this.stockStatistics.lastStockOutDate = new Date();
  }
  this.stockStatistics.stockChangeCount += 1;
  
  // Check low stock
  this.checkLowStock();
  this.lastStockUpdate = new Date();
  
  console.log(`📦 Stock adjusted for ${this.name}: ${previousQuantity} -> ${newQuantity} (${changeAmount > 0 ? 'increased' : 'decreased'} by ${Math.abs(changeAmount)})`);
  
  return {
    previousQuantity,
    newQuantity,
    changeAmount,
    stockHistoryId: this.stockHistory[this.stockHistory.length - 1]._id
  };
};

// Method to get stock analytics
productSchema.methods.getStockAnalytics = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentHistory = this.stockHistory.filter(entry => 
    new Date(entry.changedAt) >= cutoffDate
  );
  
  const stockOut = recentHistory.filter(entry => entry.changeType === 'stock_out');
  const stockIn = recentHistory.filter(entry => entry.changeType === 'stock_in');
  
  const totalStockOut = stockOut.reduce((sum, entry) => sum + Math.abs(entry.changeAmount), 0);
  const totalStockIn = stockIn.reduce((sum, entry) => sum + entry.changeAmount, 0);
  
  return {
    period: `${days} days`,
    totalStockChanges: recentHistory.length,
    totalStockOut: totalStockOut,
    totalStockIn: totalStockIn,
    netStockChange: totalStockIn - totalStockOut,
    averageDailyChange: recentHistory.length > 0 ? 
      (totalStockIn - totalStockOut) / days : 0,
    stockOutCount: stockOut.length,
    stockInCount: stockIn.length,
    lowStockAlert: this.lowStockAlert,
    currentStock: this.quantity
  };
};

// ==================== RESTOCK MANAGEMENT METHODS ====================

// Method to restock product with comprehensive tracking
productSchema.methods.restock = function(restockData, userId, reason = 'Restock', note = '') {
  const {
    quantityToAdd,
    newPrice,
    newMinOrderQuantity,
    costPrice
  } = restockData;

  const previousQuantity = this.quantity;
  const previousPrice = this.price;
  const previousMinOrderQuantity = this.minOrderQuantity;
  const previousCostPrice = this.costPrice;
  
  const newQuantity = previousQuantity + (quantityToAdd || 0);
  const finalPrice = newPrice !== undefined ? parseFloat(newPrice) : previousPrice;
  const finalMinOrderQuantity = newMinOrderQuantity !== undefined ? parseInt(newMinOrderQuantity) : previousMinOrderQuantity;
  const finalCostPrice = costPrice !== undefined ? parseFloat(costPrice) : previousCostPrice;
  
  // Validate selling price is not less than cost price
  if (finalPrice < finalCostPrice) {
    throw new Error(`Selling price (${finalPrice}) cannot be less than cost price (${finalCostPrice})`);
  }

  // Calculate investment for this restock
  const investment = (quantityToAdd || 0) * finalCostPrice;
  const totalStockValue = newQuantity * finalCostPrice;

  // Add to restock history
  const restockRecord = {
    previousQuantity,
    newQuantity,
    quantityAdded: quantityToAdd || 0,
    previousPrice,
    newPrice: finalPrice,
    previousMinOrderQuantity,
    newMinOrderQuantity: finalMinOrderQuantity,
    previousCostPrice,
    newCostPrice: finalCostPrice,
    restockedBy: userId,
    reason,
    note,
    investment,
    totalStockValue
  };

  this.restockHistory.push(restockRecord);

  // Update last restock information
  this.lastRestock = {
    ...restockRecord,
    restockedAt: new Date()
  };

  // Update product fields
  this.quantity = newQuantity;
  if (newPrice !== undefined) {
    this.price = finalPrice;
    
    // Add to price history if price changed
    if (finalPrice !== previousPrice) {
      this.priceHistory.push({
        sellingPrice: finalPrice,
        costPrice: finalCostPrice,
        changedAt: new Date(),
        changedBy: userId,
        reason: `Price update during restock: ${reason}`,
        changeType: 'restock',
        note: note
      });

      // Update last price change
      this.lastPriceChange = {
        previousPrice: previousPrice,
        newPrice: finalPrice,
        changedAt: new Date(),
        changedBy: userId,
        reason: `Price update during restock: ${reason}`,
        changeType: 'restock'
      };

      // Update price statistics
      this.updatePriceStatistics();
      this.priceStatistics.priceChangeCount += 1;
    }
  }

  if (newMinOrderQuantity !== undefined) {
    this.minOrderQuantity = finalMinOrderQuantity;
  }

  if (costPrice !== undefined) {
    this.costPrice = finalCostPrice;
  }

  // Update restock statistics
  this.restockStatistics.totalRestocks += 1;
  this.restockStatistics.totalQuantityAdded += (quantityToAdd || 0);
  this.restockStatistics.totalInvestment += investment;
  this.restockStatistics.lastRestockDate = new Date();
  this.restockStatistics.averageRestockQuantity = 
    this.restockStatistics.totalQuantityAdded / this.restockStatistics.totalRestocks;

  // Add to stock history for consistency
  this.stockHistory.push({
    previousQuantity,
    newQuantity,
    changeAmount: quantityToAdd || 0,
    changeType: 'restock',
    changedAt: new Date(),
    changedBy: userId,
    reason: `Restock: ${reason}`,
    note: note
  });

  // Update last stock change
  this.lastStockChange = {
    previousQuantity,
    newQuantity,
    changeAmount: quantityToAdd || 0,
    changeType: 'restock',
    changedAt: new Date(),
    changedBy: userId,
    reason: `Restock: ${reason}`
  };

  // Update stock statistics
  this.stockStatistics.totalStockIn += (quantityToAdd || 0);
  this.stockStatistics.stockChangeCount += 1;
  this.stockStatistics.lastStockInDate = new Date();

  // Check low stock
  this.checkLowStock();
  this.lastStockUpdate = new Date();

  console.log(`📦 Restocked ${this.name}: ${previousQuantity} -> ${newQuantity} (added ${quantityToAdd}), Investment: UGX ${investment}`);

  return {
    previousQuantity,
    newQuantity,
    quantityAdded: quantityToAdd || 0,
    previousPrice,
    newPrice: finalPrice,
    previousMinOrderQuantity,
    newMinOrderQuantity: finalMinOrderQuantity,
    previousCostPrice,
    newCostPrice: finalCostPrice,
    investment,
    totalStockValue,
    restockHistoryId: this.restockHistory[this.restockHistory.length - 1]._id
  };
};

// Method to get restock analytics
productSchema.methods.getRestockAnalytics = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentRestocks = this.restockHistory.filter(entry => 
    new Date(entry.restockedAt) >= cutoffDate
  );
  
  const totalQuantityAdded = recentRestocks.reduce((sum, entry) => 
    sum + entry.quantityAdded, 0
  );
  
  const totalInvestment = recentRestocks.reduce((sum, entry) => 
    sum + entry.investment, 0
  );

  const priceChanges = recentRestocks.filter(entry => 
    entry.newPrice !== entry.previousPrice
  ).length;

  const costPriceChanges = recentRestocks.filter(entry => 
    entry.newCostPrice !== entry.previousCostPrice
  ).length;

  return {
    period: `${days} days`,
    totalRestocks: recentRestocks.length,
    totalQuantityAdded,
    totalInvestment,
    averageRestockQuantity: recentRestocks.length > 0 ? 
      totalQuantityAdded / recentRestocks.length : 0,
    priceChanges,
    costPriceChanges,
    lastRestock: recentRestocks.length > 0 ? recentRestocks[0].restockedAt : null,
    averageInvestment: recentRestocks.length > 0 ? 
      totalInvestment / recentRestocks.length : 0
  };
};

// Method to get restock history with pagination and filtering
productSchema.methods.getRestockHistory = function(options = {}) {
  const { page = 1, limit = 20, startDate, endDate } = options;
  
  let filteredHistory = [...this.restockHistory];

  // Apply date filters
  if (startDate) {
    const start = new Date(startDate);
    filteredHistory = filteredHistory.filter(entry => new Date(entry.restockedAt) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filteredHistory = filteredHistory.filter(entry => new Date(entry.restockedAt) <= end);
  }

  // Sort by date (newest first)
  const sortedHistory = filteredHistory.sort((a, b) => 
    new Date(b.restockedAt) - new Date(a.restockedAt)
  );

  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedHistory = sortedHistory.slice(startIndex, endIndex);

  return {
    restockHistory: paginatedHistory,
    totalEntries: sortedHistory.length,
    totalPages: Math.ceil(sortedHistory.length / limit),
    currentPage: parseInt(page)
  };
};

// ==================== PRICE MANAGEMENT METHODS ====================

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

// ==================== CERTIFIED ORDER METHODS ====================

// Method to create products from certified orders WITH SELLING PRICES
productSchema.statics.createFromCertifiedOrder = async function(order, wholesalerId, sellingPrices = {}) {
  try {
    const products = [];
    const SupplierProduct = mongoose.model('SupplierProduct');
    
    console.log(`🔄 Creating products from certified order ${order.orderNumber} for wholesaler ${wholesalerId}`);
    console.log('Received selling prices:', sellingPrices);

    for (const orderItem of order.items) {
      const supplierProduct = await SupplierProduct
        .findById(orderItem.product)
        .populate('supplier', 'businessName firstName lastName');

      if (!supplierProduct) {
        console.log(`Supplier product not found: ${orderItem.product}`);
        continue;
      }

      // Generate unique SKU for the certified product
      const certifiedSku = `CERT-${order.orderNumber}-${supplierProduct.sku || supplierProduct._id.toString().slice(-6)}`;
      
      // Check if product already exists from this certified order
      const existingProduct = await this.findOne({
        sku: certifiedSku,
        wholesaler: wholesalerId
      });

      if (existingProduct) {
        console.log(`Certified product already exists: ${certifiedSku}`);
        // Update quantity if product already exists
        const stockUpdate = existingProduct.restoreStock(
          orderItem.quantity,
          wholesalerId,
          'Stock addition from certified order',
          order._id,
          `Additional stock from certified order ${order.orderNumber}`
        );
        await existingProduct.save();
        products.push(existingProduct);
        continue;
      }

      // Calculate selling price - use provided price or default to cost price + 30%
      const costPrice = orderItem.unitPrice;
      let sellingPrice = sellingPrices[orderItem.product._id.toString()];
      
      if (sellingPrice === undefined || sellingPrice === null) {
        sellingPrice = Math.round(costPrice * 1.3); // Default 30% markup
        console.log(`📊 Using default selling price for product ${orderItem.product._id}: ${sellingPrice} (30% markup)`);
      } else {
        console.log(`📊 Using provided selling price for product ${orderItem.product._id}: ${sellingPrice}`);
      }

      // Validate selling price is not less than cost price
      if (sellingPrice < costPrice) {
        console.warn(`⚠️ Selling price (${sellingPrice}) is less than cost price (${costPrice}) for product ${orderItem.product._id}`);
      }

      // Create new certified product
      const productData = {
        name: supplierProduct.name,
        description: supplierProduct.description || `Certified product from ${supplierProduct.supplier?.businessName || 'supplier'}`,
        price: sellingPrice, // Use calculated selling price
        costPrice: costPrice, // Cost is what wholesaler paid (unitPrice from order)
        quantity: orderItem.quantity,
        measurementUnit: supplierProduct.measurementUnit || 'units',
        category: supplierProduct.category || 'Certified Products',
        images: supplierProduct.images || [],
        tags: ['certified', 'supplier-order', ...(supplierProduct.tags || [])],
        wholesaler: wholesalerId,
        sku: certifiedSku,
        fromCertifiedOrder: true,
        certifiedOrderSource: {
          orderId: order._id,
          supplierId: supplierProduct.supplier?._id,
          certifiedAt: new Date()
        },
        // Initialize stock history
        stockHistory: [{
          previousQuantity: 0,
          newQuantity: orderItem.quantity,
          changeAmount: orderItem.quantity,
          changeType: 'initial_stock',
          changedAt: new Date(),
          changedBy: wholesalerId,
          reason: 'Initial stock from certified order',
          orderReference: order._id,
          note: `Initial stock from certified order ${order.orderNumber}`
        }],
        stockStatistics: {
          totalStockIn: orderItem.quantity,
          totalStockOut: 0,
          stockChangeCount: 1,
          lastStockInDate: new Date()
        },
        priceHistory: [{
          sellingPrice: sellingPrice,
          costPrice: costPrice,
          changedAt: new Date(),
          changedBy: wholesalerId,
          reason: 'Initial price from certified order',
          changeType: 'initial'
        }],
        priceStatistics: {
          highestPrice: sellingPrice,
          lowestPrice: sellingPrice,
          averagePrice: sellingPrice,
          priceChangeCount: 1
        },
        // Initialize restock statistics
        restockStatistics: {
          totalRestocks: 0,
          totalQuantityAdded: 0,
          totalInvestment: 0,
          lastRestockDate: null,
          averageRestockQuantity: 0
        }
      };

      const product = new this(productData);
      await product.save();
      products.push(product);
      console.log(`✅ Created certified product: ${product.name} (SKU: ${product.sku})`, {
        costPrice: product.costPrice,
        sellingPrice: product.price,
        quantity: product.quantity
      });
    }

    return products;
  } catch (error) {
    console.error('❌ Error creating products from certified order:', error);
    throw error;
  }
};

// Method to update stock from certified orders
productSchema.statics.updateStockFromCertifiedOrder = async function(orderId, wholesalerId) {
  try {
    const WholesalerOrderToSupplier = mongoose.model('WholesalerOrderToSupplier');
    const order = await WholesalerOrderToSupplier
      .findById(orderId)
      .populate('items.product');

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'certified') {
      throw new Error('Order is not certified');
    }

    const updatedProducts = [];

    for (const orderItem of order.items) {
      if (!orderItem.product) {
        console.log(`Order item product not populated: ${orderItem._id}`);
        continue;
      }

      const certifiedSku = `CERT-${order.orderNumber}-${orderItem.product.sku || orderItem.product._id.toString().slice(-6)}`;
      
      // Find the certified product
      const product = await this.findOne({
        sku: certifiedSku,
        wholesaler: wholesalerId
      });

      if (product) {
        // Update quantity using restoreStock method for proper tracking
        const stockUpdate = product.restoreStock(
          orderItem.quantity,
          wholesalerId,
          'Stock addition from certified order update',
          order._id,
          `Additional stock from certified order update ${order.orderNumber}`
        );
        await product.save();
        updatedProducts.push({
          product: product,
          stockUpdate: stockUpdate
        });
        console.log(`Updated stock for ${product.name}: ${stockUpdate.previousQuantity} -> ${stockUpdate.newQuantity}`);
      } else {
        console.log(`Certified product not found: ${certifiedSku}`);
      }
    }

    return updatedProducts;
  } catch (error) {
    console.error('Error updating stock from certified order:', error);
    throw error;
  }
};

// Method to get certified products for a wholesaler
productSchema.statics.getCertifiedProducts = async function(wholesalerId, options = {}) {
  const { page = 1, limit = 10, search = '' } = options;
  
  const filter = {
    wholesaler: wholesalerId,
    fromCertifiedOrder: true,
    isActive: true
  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }

  const products = await this.find(filter)
    .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName email phone')
    .populate('certifiedOrderSource.orderId', 'orderNumber createdAt deliveredAt totalAmount')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(filter);

  return {
    products,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  };
};

// Method to check if order can be certified (all items available)
productSchema.statics.canCertifyOrder = async function(orderId, wholesalerId) {
  try {
    const WholesalerOrderToSupplier = mongoose.model('WholesalerOrderToSupplier');
    const order = await WholesalerOrderToSupplier
      .findOne({
        _id: orderId,
        wholesaler: wholesalerId,
        status: 'delivered'
      })
      .populate('items.product');

    if (!order) {
      return { canCertify: false, reason: 'Order not found or not delivered' };
    }

    const issues = [];

    for (const orderItem of order.items) {
      if (!orderItem.product) {
        issues.push(`Product not found for item: ${orderItem._id}`);
        continue;
      }

      if (!orderItem.product.isActive) {
        issues.push(`Product ${orderItem.product.name} is not active`);
      }

      // Check if product quantity is sufficient (for stock validation)
      if (orderItem.product.quantity < orderItem.quantity) {
        issues.push(`Insufficient stock for ${orderItem.product.name}. Available: ${orderItem.product.quantity}, Ordered: ${orderItem.quantity}`);
      }
    }

    return {
      canCertify: issues.length === 0,
      issues: issues,
      order: order
    };
  } catch (error) {
    console.error('Error checking order certification:', error);
    return { canCertify: false, reason: error.message };
  }
};

// Method to get products by certified order
productSchema.statics.getProductsByCertifiedOrder = async function(orderId, wholesalerId) {
  return await this.find({
    wholesaler: wholesalerId,
    'certifiedOrderSource.orderId': orderId,
    fromCertifiedOrder: true
  })
  .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
  .sort({ createdAt: -1 });
};

// Method to update certified product price with tracking
productSchema.methods.updateCertifiedProductPrice = function(newPrice, userId, reason = 'Price adjustment', note = '') {
  const oldPrice = this.price;
  
  // Only update if price changed
  if (parseFloat(newPrice) !== oldPrice) {
    this.updatePrice(newPrice, userId, reason, null, 'manual', note);
    
    // Additional certified product specific tracking
    if (this.certifiedOrderSource) {
      console.log(`Certified product price updated: ${this.name} from ${oldPrice} to ${newPrice}`);
    }
  }
};

// Method to get certified product analytics
productSchema.statics.getCertifiedProductAnalytics = async function(wholesalerId) {
  const certifiedProducts = await this.find({
    wholesaler: wholesalerId,
    fromCertifiedOrder: true,
    isActive: true
  });

  const analytics = {
    totalCertifiedProducts: certifiedProducts.length,
    totalInvestment: 0,
    totalPotentialRevenue: 0,
    totalPotentialProfit: 0,
    lowStockCertifiedProducts: 0,
    outOfStockCertifiedProducts: 0,
    certifiedProductsBySupplier: {},
    averageProfitMargin: 0,
    totalStockValue: 0,
    totalPotentialRevenue: 0,
    restockStats: {
      totalRestocks: 0,
      totalQuantityAdded: 0,
      totalInvestment: 0
    }
  };

  certifiedProducts.forEach(product => {
    const investment = product.costPrice * product.quantity;
    const potentialRevenue = product.price * product.quantity;
    const potentialProfit = potentialRevenue - investment;
    const stockValue = product.costPrice * product.quantity;

    analytics.totalInvestment += investment;
    analytics.totalPotentialRevenue += potentialRevenue;
    analytics.totalPotentialProfit += potentialProfit;
    analytics.totalStockValue += stockValue;

    // Add restock statistics
    analytics.restockStats.totalRestocks += product.restockStatistics.totalRestocks;
    analytics.restockStats.totalQuantityAdded += product.restockStatistics.totalQuantityAdded;
    analytics.restockStats.totalInvestment += product.restockStatistics.totalInvestment;

    if (product.lowStockAlert) {
      analytics.lowStockCertifiedProducts++;
    }

    if (product.quantity === 0) {
      analytics.outOfStockCertifiedProducts++;
    }

    // Group by supplier
    const supplierId = product.certifiedOrderSource?.supplierId?.toString() || 'unknown';
    if (!analytics.certifiedProductsBySupplier[supplierId]) {
      analytics.certifiedProductsBySupplier[supplierId] = {
        count: 0,
        supplierName: product.certifiedOrderSource?.supplierId?.businessName || 'Unknown Supplier',
        totalInvestment: 0,
        totalStockValue: 0
      };
    }
    analytics.certifiedProductsBySupplier[supplierId].count++;
    analytics.certifiedProductsBySupplier[supplierId].totalInvestment += investment;
    analytics.certifiedProductsBySupplier[supplierId].totalStockValue += stockValue;
  });

  if (certifiedProducts.length > 0) {
    analytics.averageProfitMargin = analytics.totalInvestment > 0 ? 
      (analytics.totalPotentialProfit / analytics.totalInvestment) * 100 : 0;
  }

  return analytics;
};

// ==================== STOCK HISTORY METHODS ====================

// Method to get stock history with pagination and filtering
productSchema.methods.getStockHistory = function(options = {}) {
  const { page = 1, limit = 20, changeType, startDate, endDate } = options;
  
  let filteredHistory = [...this.stockHistory];

  // Apply filters
  if (changeType) {
    filteredHistory = filteredHistory.filter(entry => entry.changeType === changeType);
  }

  if (startDate) {
    const start = new Date(startDate);
    filteredHistory = filteredHistory.filter(entry => new Date(entry.changedAt) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filteredHistory = filteredHistory.filter(entry => new Date(entry.changedAt) <= end);
  }

  // Sort by date (newest first)
  const sortedHistory = filteredHistory.sort((a, b) => 
    new Date(b.changedAt) - new Date(a.changedAt)
  );

  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedHistory = sortedHistory.slice(startIndex, endIndex);

  return {
    stockHistory: paginatedHistory,
    totalEntries: sortedHistory.length,
    totalPages: Math.ceil(sortedHistory.length / limit),
    currentPage: parseInt(page)
  };
};

// Static method to get low stock products for a wholesaler
productSchema.statics.getLowStockProducts = async function(wholesalerId, options = {}) {
  const { page = 1, limit = 10 } = options;
  
  const lowStockProducts = await this.find({
    wholesaler: wholesalerId,
    lowStockAlert: true,
    isActive: true
  })
  .populate('certifiedOrderSource.supplierId', 'businessName')
  .sort({ lowStockAlertAt: -1 })
  .limit(limit * 1)
  .skip((page - 1) * limit);

  const total = await this.countDocuments({
    wholesaler: wholesalerId,
    lowStockAlert: true,
    isActive: true
  });

  return {
    lowStockProducts,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  };
};

// Static method to get products that need restocking (low stock)
productSchema.statics.getProductsNeedingRestock = async function(wholesalerId, options = {}) {
  const { page = 1, limit = 10 } = options;
  
  const products = await this.find({
    wholesaler: wholesalerId,
    isActive: true
  });

  // Filter products that are below their low stock threshold
  const productsNeedingRestock = products.filter(product => {
    if (!product.originalStockQuantity || product.originalStockQuantity === 0) return false;
    
    const threshold = product.originalStockQuantity * product.lowStockThreshold;
    return product.quantity <= threshold;
  });

  // Sort by most critical (lowest stock percentage)
  const sortedProducts = productsNeedingRestock.sort((a, b) => {
    const aPercentage = a.quantity / a.originalStockQuantity;
    const bPercentage = b.quantity / b.originalStockQuantity;
    return aPercentage - bPercentage;
  });

  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  return {
    productsNeedingRestock: paginatedProducts,
    totalPages: Math.ceil(sortedProducts.length / limit),
    currentPage: parseInt(page),
    total: sortedProducts.length
  };
};

// ==================== PRE-SAVE MIDDLEWARE ====================

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
  
  // Initialize stock statistics if not set
  if (!this.stockStatistics) {
    this.stockStatistics = {
      totalStockIn: 0,
      totalStockOut: 0,
      stockChangeCount: 0
    };
  }

  // Initialize restock statistics if not set
  if (!this.restockStatistics) {
    this.restockStatistics = {
      totalRestocks: 0,
      totalQuantityAdded: 0,
      totalInvestment: 0,
      lastRestockDate: null,
      averageRestockQuantity: 0
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

  // Set certified order source timestamp if not set
  if (this.fromCertifiedOrder && this.certifiedOrderSource && !this.certifiedOrderSource.certifiedAt) {
    this.certifiedOrderSource.certifiedAt = new Date();
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

// ==================== INDEXES ====================

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
productSchema.index({ 'stockHistory.changedAt': -1 });
productSchema.index({ 'stockStatistics.lastStockOutDate': -1 });
productSchema.index({ 'stockStatistics.lastStockInDate': -1 });
productSchema.index({ 'certifiedOrderSource.orderId': 1 });
productSchema.index({ 'certifiedOrderSource.supplierId': 1 });
productSchema.index({ quantity: 1 }); // For low stock queries
productSchema.index({ lastStockUpdate: -1 }); // For recent stock updates
productSchema.index({ 'restockHistory.restockedAt': -1 }); // For restock history queries
productSchema.index({ 'restockStatistics.lastRestockDate': -1 }); // For recent restocks
productSchema.index({ 'restockStatistics.totalRestocks': -1 }); // For restock frequency

module.exports = mongoose.model('Product', productSchema);