const mongoose = require('mongoose');

const supplierProductSchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: true,
    trim: true
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  productionPrice: {
    type: Number,
    required: true,
    min: 0
  },
  profitMargin: {
    type: Number,
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
    enum: ['pieces', 'boxes', 'cartons', 'crates', 'kg', 'g', 'l', 'ml', 'packs', 'units', 'dozens'],
    default: 'pieces'
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    width: Number,
    height: Number,
    format: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  materials: [{
    material: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  productionTime: {
    type: Number, // in days
    required: true,
    min: 0
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  bulkDiscount: {
    minQuantity: Number,
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  supplier: {
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
  productionStatus: {
    type: String,
    enum: ['in_production', 'ready', 'discontinued'],
    default: 'ready'
  },
  lowStockAlert: {
    type: Boolean,
    default: false
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastStockUpdate: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate profit margin before saving
supplierProductSchema.pre('save', function(next) {
  if (this.isModified('sellingPrice') || this.isModified('productionPrice')) {
    if (this.productionPrice > 0) {
      this.profitMargin = ((this.sellingPrice - this.productionPrice) / this.productionPrice) * 100;
    }
  }
  
  // Generate SKU if new product
  if (this.isNew && !this.sku) {
    this.sku = `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Check low stock
  if (this.isModified('quantity')) {
    this.lowStockAlert = this.quantity <= this.lowStockThreshold;
    this.lastStockUpdate = new Date();
  }
  
  // Update updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

// NEW: Method to update stock with different operations
supplierProductSchema.methods.updateStock = async function(quantityChange, operation = 'decrease') {
  try {
    if (operation === 'decrease') {
      this.quantity = Math.max(0, this.quantity - quantityChange);
    } else if (operation === 'increase') {
      this.quantity += quantityChange;
    } else if (operation === 'set') {
      this.quantity = quantityChange;
    }
    
    // Update low stock alert
    this.lowStockAlert = this.quantity <= this.lowStockThreshold;
    this.lastStockUpdate = new Date();
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to update stock: ${error.message}`);
  }
};

// NEW: Static method to update stock for multiple products
supplierProductSchema.statics.bulkUpdateStock = async function(productUpdates) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const results = [];
    
    for (const update of productUpdates) {
      const product = await this.findById(update.productId).session(session);
      if (!product) {
        throw new Error(`Product not found: ${update.productId}`);
      }
      
      if (update.operation === 'decrease' && product.quantity < update.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${update.quantity}`);
      }
      
      await product.updateStock(update.quantity, update.operation);
      results.push(product);
    }
    
    await session.commitTransaction();
    return results;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// NEW: Method to check if product has sufficient stock
supplierProductSchema.methods.hasSufficientStock = function(requiredQuantity) {
  return this.quantity >= requiredQuantity;
};

// NEW: Virtual for stock value
supplierProductSchema.virtual('stockValue').get(function() {
  return this.quantity * this.productionPrice;
});

// NEW: Virtual for potential revenue
supplierProductSchema.virtual('potentialRevenue').get(function() {
  return this.quantity * this.sellingPrice;
});

// Indexes for better query performance
supplierProductSchema.index({ supplier: 1, category: 1 });
supplierProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
supplierProductSchema.index({ sku: 1 }, { unique: true, sparse: true });
supplierProductSchema.index({ productionStatus: 1 });
supplierProductSchema.index({ lowStockAlert: 1 });
supplierProductSchema.index({ createdAt: -1 });
supplierProductSchema.index({ updatedAt: -1 });
supplierProductSchema.index({ quantity: 1 }); // NEW: Index for stock queries

module.exports = mongoose.model('SupplierProduct', supplierProductSchema);