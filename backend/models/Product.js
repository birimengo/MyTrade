// models/Product.js
const mongoose = require('mongoose');

// Add this image schema definition
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
  price: {
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
    //enum: ['units', 'kg', 'g', 'l', 'ml', 'pack', 'box', 'carton', 'dozen'],
    default: 'units'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  // Update images field to use the imageSchema
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
  // NEW FIELDS FOR STOCK MANAGEMENT
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
    default: 0.5, // 50% threshold by default
    min: 0.1,
    max: 0.9
  },
  // NEW FIELDS FOR CERTIFIED PRODUCTS
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
  }
}, {
  timestamps: true
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
    
    // Set alert timestamp only when it becomes low stock
    if (this.lowStockAlert && !wasLowStock) {
      this.lowStockAlertAt = new Date();
    }
  }
  return this.lowStockAlert;
};

// Pre-save middleware to check low stock and set original stock quantity
productSchema.pre('save', function(next) {
  // Set original stock quantity when product is first created
  if (this.isNew && !this.originalStockQuantity) {
    this.originalStockQuantity = this.quantity;
  }
  
  // Check low stock whenever quantity changes
  if (this.isModified('quantity')) {
    this.checkLowStock();
    this.lastStockUpdate = new Date();
  }
  
  next();
});

// Indexes for better query performance
productSchema.index({ wholesaler: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ lowStockAlert: 1 });
productSchema.index({ wholesaler: 1, lowStockAlert: 1 });
productSchema.index({ wholesaler: 1, fromCertifiedOrder: 1 }); // New index for certified products
productSchema.index({ isActive: 1 }); // New index for active products

module.exports = mongoose.model('Product', productSchema);