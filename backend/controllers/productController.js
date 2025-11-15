const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, userId) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `trade-uganda/products/${userId}`,
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    // Clean up the uploaded file
    fs.unlinkSync(file.path);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    // Clean up file even if upload fails
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};

// Get all products for a wholesaler
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, includeCertified = true } = req.query;
    
    const filter = { 
      wholesaler: req.user.id,
      isActive: true
    };
    
    if (includeCertified === 'false') {
      filter.fromCertifiedOrder = { $ne: true };
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const products = await Product.find(filter)
      .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
      .populate('lastPriceChange.changedBy', 'firstName lastName email')
      .populate('priceHistory.changedBy', 'firstName lastName email')
      .sort({ fromCertifiedOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
};

// Get products for retailers
exports.getProductsForRetailers = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, wholesalerId } = req.query;
    
    const filter = { 
      isActive: true,
      quantity: { $gt: 0 }
    };
    
    if (wholesalerId) {
      filter.wholesaler = wholesalerId;
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const products = await Product.find(filter)
      .populate('wholesaler', 'businessName firstName lastName email phone address rating')
      .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
      .sort({ fromCertifiedOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
};

// Get single product with price history
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    })
    .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
    .populate('lastPriceChange.changedBy', 'firstName lastName email')
    .populate('priceHistory.changedBy', 'firstName lastName email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
};

// Create new product with comprehensive price history
exports.createProduct = async (req, res) => {
  try {
    let imageUrls = [];
    
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = results;
    }

    const productData = {
      ...req.body,
      wholesaler: req.user.id,
      price: parseFloat(req.body.price),
      costPrice: parseFloat(req.body.costPrice),
      quantity: parseInt(req.body.quantity),
      minOrderQuantity: parseInt(req.body.minOrderQuantity) || 1,
      bulkDiscount: req.body.bulkDiscount === 'true',
      discountPercentage: req.body.discountPercentage ? parseFloat(req.body.discountPercentage) : 0,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      images: imageUrls,
      fromCertifiedOrder: false,
      priceManuallyEdited: false,
      originalSellingPrice: parseFloat(req.body.price),
      // Initialize with comprehensive price history
      priceHistory: [{
        sellingPrice: parseFloat(req.body.price),
        costPrice: parseFloat(req.body.costPrice),
        changedBy: req.user.id,
        reason: 'Initial product price',
        changeType: 'initial'
      }],
      priceStatistics: {
        highestPrice: parseFloat(req.body.price),
        lowestPrice: parseFloat(req.body.price),
        averagePrice: parseFloat(req.body.price),
        priceChangeCount: 1
      }
    };

    if (productData.price < productData.costPrice) {
      return res.status(400).json({
        success: false,
        message: 'Selling price cannot be less than cost price'
      });
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        ...product.toObject(),
        profitMargin: product.profitMargin,
        profitPerUnit: product.profitPerUnit,
        totalProfitPotential: product.totalProfitPotential
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Enhanced product price update with comprehensive tracking
exports.updateProductPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      newPrice, 
      reason = 'Manual price adjustment', 
      saleReference = null, 
      changeType = 'manual',
      note = '' 
    } = req.body;

    const product = await Product.findOne({
      _id: id,
      wholesaler: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const newSellingPrice = parseFloat(newPrice);
    const costPrice = parseFloat(product.costPrice);

    if (newSellingPrice < costPrice) {
      return res.status(400).json({
        success: false,
        message: `Selling price (${newSellingPrice}) cannot be less than cost price (${costPrice})`
      });
    }

    // Use enhanced updatePrice method
    product.updatePrice(newSellingPrice, req.user.id, reason, saleReference, changeType, note);
    await product.save();

    const updatedProduct = await Product.findById(id)
      .populate('lastPriceChange.changedBy', 'firstName lastName email')
      .populate('priceHistory.changedBy', 'firstName lastName email');

    const priceChange = newSellingPrice - product.lastPriceChange.previousPrice;
    const changePercentage = ((priceChange / product.lastPriceChange.previousPrice) * 100).toFixed(2);

    res.status(200).json({
      success: true,
      message: 'Product price updated successfully',
      product: updatedProduct,
      priceChange: {
        previousPrice: product.lastPriceChange.previousPrice,
        newPrice: newSellingPrice,
        change: priceChange,
        changePercentage: changePercentage,
        changeType: changeType
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating product price',
      error: error.message
    });
  }
};

// Update product with enhanced price tracking
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let imageUrls = [...product.images];
    
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = [...imageUrls, ...results];
    }

    const updateData = {
      ...req.body,
      price: parseFloat(req.body.price),
      costPrice: parseFloat(req.body.costPrice),
      quantity: parseInt(req.body.quantity),
      minOrderQuantity: parseInt(req.body.minOrderQuantity) || 1,
      bulkDiscount: req.body.bulkDiscount === 'true',
      discountPercentage: req.body.discountPercentage ? parseFloat(req.body.discountPercentage) : 0,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      images: imageUrls
    };

    const newSellingPrice = parseFloat(req.body.price);
    const costPrice = parseFloat(req.body.costPrice);
    
    if (newSellingPrice < costPrice) {
      return res.status(400).json({
        success: false,
        message: 'Selling price cannot be less than cost price'
      });
    }

    // Enhanced price change tracking
    if (newSellingPrice !== product.price) {
      product.updatePrice(
        newSellingPrice, 
        req.user.id, 
        'Product update', 
        null, 
        'manual', 
        'Price changed during product update'
      );
      
      // Update the product with new data including price history changes
      Object.assign(product, updateData);
      await product.save();
    } else {
      // No price change, just update normally
      product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );
    }

    // Populate the updated product
    const updatedProduct = await Product.findById(req.params.id)
      .populate('lastPriceChange.changedBy', 'firstName lastName email')
      .populate('priceHistory.changedBy', 'firstName lastName email');

    if (!product.fromCertifiedOrder) {
      delete updateData.fromCertifiedOrder;
      delete updateData.certifiedOrderSource;
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: {
        ...updatedProduct.toObject(),
        profitMargin: updatedProduct.profitMargin,
        profitPerUnit: updatedProduct.profitPerUnit,
        totalProfitPotential: updatedProduct.totalProfitPotential
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Enhanced price history with pagination and filtering
exports.getPriceHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, changeType, startDate, endDate } = req.query;
    
    const product = await Product.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    })
    .populate('priceHistory.changedBy', 'firstName lastName email avatar')
    .select('priceHistory name sku price costPrice priceStatistics');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let filteredHistory = [...product.priceHistory];

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
      end.setHours(23, 59, 59, 999); // End of day
      filteredHistory = filteredHistory.filter(entry => new Date(entry.changedAt) <= end);
    }

    // Sort by date (newest first)
    const sortedHistory = filteredHistory.sort((a, b) => 
      new Date(b.changedAt) - new Date(a.changedAt)
    );

    // Paginate the history
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedHistory = sortedHistory.slice(startIndex, endIndex);

    // Calculate price change statistics
    const priceChanges = sortedHistory.map((entry, index) => {
      if (index < sortedHistory.length - 1) {
        return {
          change: entry.sellingPrice - sortedHistory[index + 1].sellingPrice,
          percentage: ((entry.sellingPrice - sortedHistory[index + 1].sellingPrice) / sortedHistory[index + 1].sellingPrice * 100).toFixed(2)
        };
      }
      return null;
    }).filter(change => change !== null);

    const totalIncrease = priceChanges.filter(change => change.change > 0).length;
    const totalDecrease = priceChanges.filter(change => change.change < 0).length;

    res.status(200).json({
      success: true,
      product: {
        name: product.name,
        sku: product.sku,
        currentPrice: product.price,
        costPrice: product.costPrice,
        priceStatistics: product.priceStatistics
      },
      priceHistory: paginatedHistory,
      historyStats: {
        totalEntries: sortedHistory.length,
        totalIncreases: totalIncrease,
        totalDecreases: totalDecrease,
        averageChange: priceChanges.length > 0 ? 
          (priceChanges.reduce((sum, change) => sum + parseFloat(change.percentage), 0) / priceChanges.length).toFixed(2) : 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(sortedHistory.length / limit),
        totalItems: sortedHistory.length,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching price history',
      error: error.message
    });
  }
};

// Generate sample price history for existing products
exports.generateSamplePriceHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { daysBack = 90 } = req.body;
    
    const product = await Product.findOne({
      _id: productId,
      wholesaler: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Generate sample history using the model method
    product.generateSamplePriceHistory(req.user.id, parseInt(daysBack));
    await product.save();

    const updatedProduct = await Product.findById(productId)
      .populate('priceHistory.changedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Sample price history generated successfully',
      historyEntries: product.priceHistory.length,
      product: {
        name: updatedProduct.name,
        priceHistory: updatedProduct.priceHistory.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt)).slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating sample price history',
      error: error.message
    });
  }
};

// Track price change during sale
exports.trackSalePriceChange = async (productId, newPrice, userId, saleReference, reason = 'Sale price adjustment') => {
  try {
    const product = await Product.findById(productId);
    
    if (product && product.price !== newPrice) {
      product.updatePrice(
        newPrice, 
        userId, 
        reason, 
        saleReference, 
        'sale', 
        `Price changed during sale: ${saleReference}`
      );
      await product.save();
    }
  } catch (error) {
    console.error('Error tracking sale price change:', error);
  }
};

// Get price analytics for dashboard
exports.getPriceAnalytics = async (req, res) => {
  try {
    const products = await Product.find({
      wholesaler: req.user.id,
      isActive: true
    }).select('name price costPrice priceStatistics priceHistory');

    const analytics = {
      totalProducts: products.length,
      productsWithPriceChanges: 0,
      totalPriceChanges: 0,
      averagePriceChangesPerProduct: 0,
      recentlyUpdatedPrices: [],
      priceChangeTrend: {
        increases: 0,
        decreases: 0,
        stable: 0
      }
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    products.forEach(product => {
      if (product.priceStatistics.priceChangeCount > 0) {
        analytics.productsWithPriceChanges++;
        analytics.totalPriceChanges += product.priceStatistics.priceChangeCount;
      }

      // Check recent price changes
      const recentChanges = product.priceHistory.filter(entry => 
        new Date(entry.changedAt) > thirtyDaysAgo
      );

      if (recentChanges.length > 0) {
        analytics.recentlyUpdatedPrices.push({
          productName: product.name,
          changes: recentChanges.length,
          latestChange: recentChanges[0]
        });
      }

      // Analyze price trend
      if (product.priceHistory.length >= 2) {
        const latestChange = product.priceHistory[0];
        const previousChange = product.priceHistory[1];
        
        if (latestChange.sellingPrice > previousChange.sellingPrice) {
          analytics.priceChangeTrend.increases++;
        } else if (latestChange.sellingPrice < previousChange.sellingPrice) {
          analytics.priceChangeTrend.decreases++;
        } else {
          analytics.priceChangeTrend.stable++;
        }
      }
    });

    analytics.averagePriceChangesPerProduct = analytics.totalProducts > 0 ? 
      (analytics.totalPriceChanges / analytics.totalProducts).toFixed(1) : 0;

    // Sort recently updated by most recent
    analytics.recentlyUpdatedPrices.sort((a, b) => 
      new Date(b.latestChange.changedAt) - new Date(a.latestChange.changedAt)
    ).slice(0, 10); // Top 10 most recent

    res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching price analytics',
      error: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map(image => {
        return cloudinary.uploader.destroy(image.publicId);
      });
      
      await Promise.all(deletePromises);
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Get product categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', {
      wholesaler: req.user.id,
      isActive: true
    });

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Delete specific product image
exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    
    const product = await Product.findOne({
      _id: productId,
      wholesaler: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const imageToDelete = product.images.id(imageId);
    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    await cloudinary.uploader.destroy(imageToDelete.publicId);
    product.images.pull(imageId);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// Get profit analytics
exports.getProfitAnalytics = async (req, res) => {
  try {
    const products = await Product.find({
      wholesaler: req.user.id,
      isActive: true
    });

    const analytics = {
      totalProducts: products.length,
      totalInvestment: 0,
      totalPotentialRevenue: 0,
      totalPotentialProfit: 0,
      averageProfitMargin: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      productsWithEditedPrices: 0,
      productsWithPriceHistory: 0
    };

    products.forEach(product => {
      const investment = product.costPrice * product.quantity;
      const potentialRevenue = product.price * product.quantity;
      const potentialProfit = potentialRevenue - investment;

      analytics.totalInvestment += investment;
      analytics.totalPotentialRevenue += potentialRevenue;
      analytics.totalPotentialProfit += potentialProfit;

      if (product.lowStockAlert) {
        analytics.lowStockProducts++;
      }

      if (product.quantity === 0) {
        analytics.outOfStockProducts++;
      }

      if (product.priceManuallyEdited) {
        analytics.productsWithEditedPrices++;
      }

      if (product.priceHistory.length > 1) {
        analytics.productsWithPriceHistory++;
      }
    });

    if (products.length > 0) {
      analytics.averageProfitMargin = analytics.totalInvestment > 0 ? 
        (analytics.totalPotentialProfit / analytics.totalInvestment) * 100 : 0;
    }

    res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profit analytics',
      error: error.message
    });
  }
};