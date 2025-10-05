const mongoose = require('mongoose');

const retailerStockSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  originalQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: function() {
      return this.quantity; // Default to initial quantity
    }
  },
  measurementUnit: {
    type: String,
    required: true,
    enum: [
      'kg', 'g', 'liters', 'ml', 'pieces', 'bags', 'crates', 'boxes', 'units'
    ],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalValue: {
    type: Number,
    min: 0,
  },
  minStockLevel: {
    type: Number,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lowStockAlert: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
retailerStockSchema.index({ retailer: 1, createdAt: -1 });
retailerStockSchema.index({ category: 1 });
retailerStockSchema.index({ lowStockAlert: 1 });

// Pre-save middleware to calculate total value and check for low stock
retailerStockSchema.pre('save', function(next) {
  // Calculate total value
  this.totalValue = this.quantity * this.unitPrice;
  
  // Check if stock is below minimum level OR below 50% of original quantity
  const isBelowMinLevel = this.quantity <= this.minStockLevel;
  const isBelowHalfOriginal = this.quantity <= (this.originalQuantity * 0.5);
  
  this.lowStockAlert = isBelowMinLevel || isBelowHalfOriginal;
  
  next();
});

module.exports = mongoose.model('RetailerStock', retailerStockSchema);