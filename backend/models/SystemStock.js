const mongoose = require('mongoose');

const systemStockSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

   totalValue: {
    type: Number,
    min: 0,
  },
  
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RetailerOrder',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
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
    required: true,
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
  addedFromOrder: {
    type: Boolean,
    default: true,
  },
  orderDate: {
    type: Date,
    required: true,
  },
  certificationDate: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
systemStockSchema.index({ retailer: 1, createdAt: -1 });
systemStockSchema.index({ product: 1 });
systemStockSchema.index({ category: 1 });

module.exports = mongoose.model('SystemStock', systemStockSchema);