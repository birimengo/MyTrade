const mongoose = require('mongoose');

const retailerSalesSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  productName: {
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
  unitCost: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  profit: {
    type: Number,
    required: true,
  },
  customerName: {
    type: String,
    trim: true,
  },
  customerPhone: {
    type: String,
    trim: true,
  },
  stockType: {
    type: String,
    required: true,
    enum: ['retailer', 'system'],
  },
  saleDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
retailerSalesSchema.index({ retailer: 1, saleDate: -1 });
retailerSalesSchema.index({ productId: 1 });

module.exports = mongoose.model('RetailerSales', retailerSalesSchema);