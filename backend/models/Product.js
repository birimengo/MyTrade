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
    },
    originalUnitPrice: {
      type: Number
    },
    isTemporary: {
      type: Boolean,
      default: false
    },
    originalProductId: {
      type: String
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
  },
  // Certified product specific fields
  requiresPricing: {
    type: Boolean,
    default: false
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
    
    // For certified products, mark as no longer requiring pricing
    if (this.fromCertifiedOrder && this.requiresPricing && newSellingPrice > 0) {
      this.requiresPricing = false;
    }
    
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

// ==================== ENHANCED CERTIFIED PRODUCT METHODS ====================

// Enhanced method to find products for sales (both regular and certified)
productSchema.statics.findProductForSale = async function(productId, wholesalerId, isCertified = false) {
  try {
    let product;
    
    if (isCertified) {
      console.log(`🔍 Searching for certified product: ${productId} for wholesaler: ${wholesalerId}`);
      
      // ✅ CRITICAL FIX: Extract original ID from prefixed frontend ID
      let originalProductId = productId;
      if (typeof productId === 'string' && productId.startsWith('certified_')) {
        originalProductId = productId.replace('certified_', '');
        console.log(`🔄 Extracted original ID from prefixed ID: ${productId} -> ${originalProductId}`);
      }
      
      // ✅ ENHANCED SEARCH: Try multiple ID formats for certified products
      product = await this.findOne({
        $or: [
          // Try the original extracted ID first
          { _id: originalProductId, fromCertifiedOrder: true },
          // Try the prefixed ID as fallback
          { _id: productId, fromCertifiedOrder: true },
          // Try SKU matching
          { sku: originalProductId, fromCertifiedOrder: true },
          { sku: productId, fromCertifiedOrder: true },
          // Try name matching
          { name: productId, fromCertifiedOrder: true },
          // Try certified order source mapping
          { 'certifiedOrderSource.originalProductId': originalProductId },
          { 'certifiedOrderSource.originalProductId': productId }
        ],
        wholesaler: wholesalerId
      });

      // ✅ BROADER SEARCH: If still not found, try broader search
      if (!product) {
        console.log('🔄 Trying broader certified product search...');
        product = await this.findOne({
          fromCertifiedOrder: true,
          $or: [
            { name: { $regex: productId, $options: 'i' } },
            { sku: { $regex: productId, $options: 'i' } },
            { name: { $regex: originalProductId, $options: 'i' } }
          ],
          wholesaler: wholesalerId
        });
      }

      // ✅ LAST RESORT: Create temporary product if still not found
      if (!product) {
        console.log('⚠️ Certified product not found, creating temporary record...');
        const tempSku = `TEMP-CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        product = new this({
          name: `Certified Product - ${productId}`,
          sku: tempSku,
          price: 0, // Will be set during sale
          costPrice: 0, // Unknown cost
          quantity: 999, // Large quantity to avoid stock issues
          measurementUnit: 'units',
          category: 'Certified Products',
          fromCertifiedOrder: true,
          requiresPricing: true,
          wholesaler: wholesalerId,
          isActive: true,
          certifiedOrderSource: {
            isTemporary: true,
            originalProductId: productId,
            certifiedAt: new Date()
          }
        });
        await product.save();
        console.log(`✅ Created temporary certified product: ${product.name} (SKU: ${product.sku})`);
      }
    } else {
      // Regular product search
      product = await this.findOne({
        _id: productId,
        wholesaler: wholesalerId
      });

      // Fallback search for regular products
      if (!product) {
        product = await this.findOne({
          $or: [
            { sku: productId },
            { name: productId }
          ],
          wholesaler: wholesalerId
        });
      }
    }

    if (product) {
      console.log(`✅ Found product: ${product.name} (ID: ${product._id}, Certified: ${product.fromCertifiedOrder})`);
    } else {
      console.log(`❌ Product not found: ${productId} (Certified: ${isCertified})`);
    }

    return product;
  } catch (error) {
    console.error('Error in findProductForSale:', error);
    throw error;
  }
};

// Enhanced method to create certified products from orders
productSchema.statics.createFromCertifiedOrder = async function(order, wholesalerId) {
  try {
    const products = [];
    const SupplierProduct = mongoose.model('SupplierProduct');
    
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
        console.log(`🔄 Certified product already exists, updating quantity: ${certifiedSku}`);
        existingProduct.quantity += orderItem.quantity;
        await existingProduct.save();
        products.push(existingProduct);
        continue;
      }

      // Create new certified product with proper pricing structure
      const productData = {
        name: supplierProduct.name,
        description: supplierProduct.description || `Certified product from ${supplierProduct.supplier?.businessName || 'supplier'}`,
        price: 0, // Start with 0 - wholesaler will set selling price manually
        costPrice: orderItem.unitPrice, // Cost is what wholesaler paid to supplier
        quantity: orderItem.quantity,
        measurementUnit: supplierProduct.measurementUnit || 'units',
        category: supplierProduct.category || 'Certified Products',
        images: supplierProduct.images || [],
        tags: ['certified', 'supplier-order', ...(supplierProduct.tags || [])],
        wholesaler: wholesalerId,
        sku: certifiedSku,
        fromCertifiedOrder: true,
        requiresPricing: true, // Flag to indicate selling price needs to be set
        certifiedOrderSource: {
          orderId: order._id,
          supplierId: supplierProduct.supplier?._id,
          certifiedAt: new Date(),
          originalUnitPrice: orderItem.unitPrice
        },
        priceHistory: [{
          sellingPrice: 0, // Initial selling price (to be set by wholesaler)
          costPrice: orderItem.unitPrice,
          changedAt: new Date(),
          changedBy: wholesalerId,
          reason: 'Initial certification from supplier order',
          changeType: 'initial',
          note: 'Selling price to be set manually by wholesaler'
        }],
        priceStatistics: {
          highestPrice: 0,
          lowestPrice: 0,
          averagePrice: 0,
          priceChangeCount: 1
        }
      };

      const product = new this(productData);
      await product.save();
      
      console.log(`✅ Created certified product: ${product.name} (SKU: ${product.sku})`);
      products.push(product);
    }

    return products;
  } catch (error) {
    console.error('Error creating products from certified order:', error);
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
    productsRequiringPricing: 0
  };

  certifiedProducts.forEach(product => {
    const investment = product.costPrice * product.quantity;
    const potentialRevenue = product.price * product.quantity;
    const potentialProfit = potentialRevenue - investment;

    analytics.totalInvestment += investment;
    analytics.totalPotentialRevenue += potentialRevenue;
    analytics.totalPotentialProfit += potentialProfit;

    if (product.lowStockAlert) {
      analytics.lowStockCertifiedProducts++;
    }

    if (product.quantity === 0) {
      analytics.outOfStockCertifiedProducts++;
    }

    if (product.requiresPricing) {
      analytics.productsRequiringPricing++;
    }

    // Group by supplier
    const supplierId = product.certifiedOrderSource?.supplierId?.toString() || 'unknown';
    if (!analytics.certifiedProductsBySupplier[supplierId]) {
      analytics.certifiedProductsBySupplier[supplierId] = {
        count: 0,
        supplierName: product.certifiedOrderSource?.supplierId?.businessName || 'Unknown Supplier'
      };
    }
    analytics.certifiedProductsBySupplier[supplierId].count++;
  });

  if (certifiedProducts.length > 0) {
    analytics.averageProfitMargin = analytics.totalInvestment > 0 ? 
      (analytics.totalPotentialProfit / analytics.totalInvestment) * 100 : 0;
  }

  return analytics;
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
productSchema.index({ 'certifiedOrderSource.orderId': 1 });
productSchema.index({ 'certifiedOrderSource.supplierId': 1 });
productSchema.index({ requiresPricing: 1 });

module.exports = mongoose.model('Product', productSchema);