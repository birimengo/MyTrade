const WholesaleSale = require('../models/WholesaleSale');
const Product = require('../models/Product');
const User = require('../models/User');

// Get all wholesale sales for wholesaler
exports.getWholesaleSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, customerId, status } = req.query;
    
    const filter = { wholesaler: req.user.id };
    
    // Date range filter
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }
    
    // Customer filter
    if (customerId) {
      filter.customerId = customerId;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    const wholesaleSales = await WholesaleSale.find(filter)
      .sort({ createdAt: -1 })
      .populate('customerId', 'businessName firstName lastName phone email address')
      .populate('items.productId', 'name price measurementUnit category images fromCertifiedOrder costPrice')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WholesaleSale.countDocuments(filter);

    res.status(200).json({
      success: true,
      wholesaleSales,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching wholesale sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wholesale sales',
      error: error.message
    });
  }
};

// Get single wholesale sale with full details
exports.getWholesaleSale = async (req, res) => {
  try {
    const wholesaleSale = await WholesaleSale.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    })
    .populate('customerId', 'businessName firstName lastName phone email address createdAt')
    .populate('items.productId', 'name price costPrice measurementUnit category images description sku fromCertifiedOrder certifiedOrderSource')
    .populate('wholesaler', 'businessName firstName lastName phone email address');

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // Add customer details to the response
    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    res.status(200).json({
      success: true,
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('Error fetching wholesale sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wholesale sale',
      error: error.message
    });
  }
};

// Create new wholesale sale with ENHANCED CERTIFIED PRODUCT SUPPORT
exports.createWholesaleSale = async (req, res) => {
  try {
    console.log('🎯 BACKEND - CREATE SALE ENDPOINT HIT');
    console.log('👤 User:', req.user.id, req.user.businessName);
    
    // Enhanced debugging
    console.log('📦 Request body summary:', {
      customerName: req.body.customerName,
      referenceNumber: req.body.referenceNumber,
      itemsCount: req.body.items?.length,
      certifiedItems: req.body.items?.filter(item => item.isCertifiedProduct)?.length || 0
    });

    const {
      customerType,
      customerId,
      customerInfo,
      customerName,
      saleDate,
      saleTime,
      paymentMethod,
      paymentStatus,
      saleNotes,
      items,
      subtotal,
      totalDiscount,
      grandTotal,
      amountPaid,
      balanceDue,
      referenceNumber,
      isWalkInCustomer = false
    } = req.body;

    // ✅ VALIDATE referenceNumber EXISTS
    if (!referenceNumber) {
      console.error('❌ BACKEND - referenceNumber is missing!');
      return res.status(400).json({
        success: false,
        message: 'Reference number is required',
        error: 'WholesaleSale validation failed: referenceNumber: Path `referenceNumber` is required.'
      });
    }

    console.log('✅ BACKEND - referenceNumber validated:', referenceNumber);

    // Validate required fields
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and at least one sale item are required'
      });
    }

    // ✅ ENHANCED CERTIFIED PRODUCT VALIDATION
    const certifiedItems = items.filter(item => item.isCertifiedProduct);
    if (certifiedItems.length > 0) {
      console.log(`🔍 Validating ${certifiedItems.length} certified items`);
      
      for (const item of certifiedItems) {
        if (!item.unitPrice || item.unitPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: `Certified product "${item.productName}" requires a selling price to be set`,
            productId: item.productId,
            productName: item.productName
          });
        }

        if (item.costPrice && item.unitPrice < item.costPrice) {
          return res.status(400).json({
            success: false,
            message: `Certified product "${item.productName}" selling price cannot be less than cost price (${item.costPrice})`,
            productId: item.productId,
            productName: item.productName,
            costPrice: item.costPrice,
            sellingPrice: item.unitPrice
          });
        }
      }
    }

    let customerDetails = {};
    let finalCustomerId = null;
    let finalCustomerType = customerType;

    // Handle customer based on type
    if (isWalkInCustomer) {
      finalCustomerType = 'walk-in';
      customerDetails = {
        customerName: 'Walk-in Customer',
        customerPhone: '0000000000',
        customerEmail: '',
        customerAddress: '',
        customerBusinessName: 'Walk-in Customer'
      };
      console.log('👥 Walk-in customer detected');
    } else if (customerType === 'existing') {
      console.log('👥 Existing customer:', customerId);
      // Verify existing customer exists
      const existingCustomer = await User.findOne({
        _id: customerId,
        role: { $in: ['retailer', 'wholesaler'] }
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      finalCustomerId = customerId;
      customerDetails = {
        customerName: existingCustomer.businessName || `${existingCustomer.firstName} ${existingCustomer.lastName}`,
        customerPhone: existingCustomer.phone,
        customerEmail: existingCustomer.email,
        customerAddress: existingCustomer.address,
        customerBusinessName: existingCustomer.businessName
      };
    } else {
      console.log('👥 New customer detected');
      // New customer - validate required fields
      if (!customerInfo?.name || !customerInfo?.phone) {
        return res.status(400).json({
          success: false,
          message: 'New customer requires name and phone number'
        });
      }

      customerDetails = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        customerAddress: customerInfo.address,
        customerBusinessName: customerInfo.businessName,
        customerInfo: customerInfo
      };
    }

    // ✅ ENHANCED PRODUCT AVAILABILITY CHECK WITH CERTIFIED PRODUCT SUPPORT
    console.log(`🔍 Checking product availability for ${items.length} items`);
    const productUpdates = [];
    
    for (const item of items) {
      console.log(`🔍 Processing item: ${item.productName} (ID: ${item.productId}, Certified: ${item.isCertifiedProduct})`);
      
      // Use the new enhanced product lookup method
      const product = await Product.findProductForSale(
        item.productId, 
        req.user.id, 
        item.isCertifiedProduct
      );

      if (!product) {
        console.error(`❌ Product not found: ${item.productName} (ID: ${item.productId}, Certified: ${item.isCertifiedProduct})`);
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productName || item.productId}`,
          productType: item.isCertifiedProduct ? 'certified' : 'regular',
          details: {
            productId: item.productId,
            productName: item.productName,
            isCertifiedProduct: item.isCertifiedProduct,
            user: req.user.id
          }
        });
      }

      console.log(`✅ Found product: ${product.name}, Available: ${product.quantity}, Requested: ${item.quantity}, Certified: ${product.fromCertifiedOrder}`);

      // Stock validation
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        });
      }

      // ✅ ENHANCED CERTIFIED PRODUCT PRICE VALIDATION
      if (product.fromCertifiedOrder) {
        if (!item.unitPrice || item.unitPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: `Certified product "${product.name}" requires a selling price to be set`,
            productId: product._id,
            productName: product.name,
            costPrice: product.costPrice
          });
        }

        if (product.costPrice && item.unitPrice < product.costPrice) {
          return res.status(400).json({
            success: false,
            message: `Certified product "${product.name}" selling price cannot be less than cost price (${product.costPrice})`,
            productId: product._id,
            productName: product.name,
            costPrice: product.costPrice,
            sellingPrice: item.unitPrice
          });
        }

        console.log(`💰 Certified product price validated: ${product.name} - Cost: ${product.costPrice}, Sell: ${item.unitPrice}`);
      }

      // Track product update for batch processing
      productUpdates.push({
        product,
        item,
        oldQuantity: product.quantity
      });
    }

    // ✅ PROCESS ALL PRODUCT UPDATES
    console.log('🔄 Updating product quantities and prices...');
    for (const update of productUpdates) {
      const { product, item, oldQuantity } = update;
      
      console.log(`📦 Updating ${product.name}: ${oldQuantity} -> ${oldQuantity - item.quantity}`);
      
      // Update product quantity
      product.quantity = oldQuantity - item.quantity;
      
      // ✅ ENHANCED PRICE TRACKING FOR CERTIFIED PRODUCTS
      if (item.unitPrice !== product.price) {
        console.log(`💰 Price adjustment: ${product.name} - Old: ${product.price}, New: ${item.unitPrice}`);
        
        // For certified products, this might be the first time setting the selling price
        if (product.fromCertifiedOrder && (!product.price || product.price === 0)) {
          console.log(`🎯 First time setting selling price for certified product: ${product.name}`);
          
          // Update the product's selling price
          product.price = item.unitPrice;
          product.requiresPricing = false;
          
          // Add to price history
          if (product.priceHistory && Array.isArray(product.priceHistory)) {
            product.priceHistory.push({
              sellingPrice: item.unitPrice,
              costPrice: product.costPrice,
              changedAt: new Date(),
              changedBy: req.user.id,
              reason: 'Initial selling price set during first sale',
              changeType: 'manual',
              note: `Price set during sale to ${customerName}`
            });
          }
        } else {
          // Regular price update using existing method
          if (typeof product.updatePrice === 'function') {
            product.updatePrice(
              item.unitPrice,
              req.user.id,
              'Sale price adjustment',
              referenceNumber,
              'sale',
              `Price changed during sale to customer: ${customerName}`
            );
          }
        }
      }
      
      await product.save();
      console.log(`✅ Product updated: ${product.name} - New quantity: ${product.quantity}, New price: ${product.price}`);
    }

    // ✅ CREATE SALE RECORD
    const saleData = {
      customerType: finalCustomerType,
      customerId: finalCustomerId,
      customerInfo: customerType === 'new' && !isWalkInCustomer ? customerInfo : undefined,
      ...customerDetails,
      referenceNumber,
      saleDate: saleDate || new Date(),
      saleTime,
      paymentMethod,
      paymentStatus,
      saleNotes,
      items: items.map(item => ({
        ...item,
        // Ensure all item fields are properly formatted
        productId: item.productId,
        productName: item.productName,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        costPrice: parseFloat(item.costPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        total: parseFloat(item.total) || 0,
        isCertifiedProduct: item.isCertifiedProduct || false
      })),
      subtotal: parseFloat(subtotal) || 0,
      totalDiscount: parseFloat(totalDiscount) || 0,
      grandTotal: parseFloat(grandTotal) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      balanceDue: parseFloat(balanceDue) || 0,
      wholesaler: req.user.id
    };

    console.log('✅ BACKEND - Final saleData with referenceNumber:', saleData.referenceNumber);

    const wholesaleSale = new WholesaleSale(saleData);
    await wholesaleSale.save();

    console.log('💾 Sale saved successfully with ID:', wholesaleSale._id);

    // Populate the sale with all details
    await wholesaleSale.populate('customerId', 'businessName firstName lastName phone email address');
    await wholesaleSale.populate('items.productId', 'name price measurementUnit category images sku fromCertifiedOrder costPrice');
    await wholesaleSale.populate('wholesaler', 'businessName firstName lastName phone email address');

    // Add customer details to response
    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    console.log('🎉 Sale creation completed successfully!');

    res.status(201).json({
      success: true,
      message: 'Wholesale sale created successfully',
      wholesaleSale: saleWithCustomerDetails,
      debug: {
        itemsProcessed: items.length,
        certifiedItems: items.filter(item => item.isCertifiedProduct).length,
        productsUpdated: productUpdates.length,
        referenceNumber: referenceNumber
      }
    });
  } catch (error) {
    console.error('❌ BACKEND - Error creating wholesale sale:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(400).json({
      success: false,
      message: 'Error creating wholesale sale',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get sales for specific customer
exports.getCustomerSales = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const wholesaleSales = await WholesaleSale.find({
      wholesaler: req.user.id,
      $or: [
        { customerId: req.params.customerId },
        { 'customerInfo.phone': req.params.customerId } // Also search by phone for new customers
      ]
    })
    .sort({ createdAt: -1 })
    .populate('items.productId', 'name price measurementUnit category images fromCertifiedOrder')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await WholesaleSale.countDocuments({
      wholesaler: req.user.id,
      $or: [
        { customerId: req.params.customerId },
        { 'customerInfo.phone': req.params.customerId }
      ]
    });

    // Add customer details to each sale
    const salesWithCustomerDetails = wholesaleSales.map(sale => ({
      ...sale.toObject(),
      customerDetails: sale.customerDetails
    }));

    res.status(200).json({
      success: true,
      wholesaleSales: salesWithCustomerDetails,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching customer sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer sales',
      error: error.message
    });
  }
};

// Update wholesale sale
exports.updateWholesaleSale = async (req, res) => {
  try {
    const wholesaleSale = await WholesaleSale.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    });

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // For simplicity, we'll only allow updating certain fields
    const allowedUpdates = ['paymentStatus', 'amountPaid', 'balanceDue', 'saleNotes', 'status'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedSale = await WholesaleSale.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('customerId', 'businessName firstName lastName phone email address')
    .populate('items.productId', 'name price measurementUnit category images fromCertifiedOrder')
    .populate('wholesaler', 'businessName firstName lastName phone email address');

    // Add customer details to response
    const saleWithCustomerDetails = {
      ...updatedSale.toObject(),
      customerDetails: updatedSale.customerDetails
    };

    res.status(200).json({
      success: true,
      message: 'Wholesale sale updated successfully',
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('Error updating wholesale sale:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating wholesale sale',
      error: error.message
    });
  }
};

// Delete wholesale sale with ENHANCED CERTIFIED PRODUCT RESTORATION
exports.deleteWholesaleSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log(`🗑️ Deleting sale: ${saleId}`);

    const wholesaleSale = await WholesaleSale.findOne({
      _id: saleId,
      wholesaler: req.user.id
    });

    if (!wholesaleSale) {
      return res.status(404).json({
        success: false,
        message: 'Wholesale sale not found'
      });
    }

    // Enhanced product quantity restoration for both regular and certified products
    const restorationResults = [];
    console.log(`🔄 Restoring quantities for ${wholesaleSale.items.length} items`);
    
    for (const item of wholesaleSale.items) {
      let product;
      
      // ✅ ENHANCED CERTIFIED PRODUCT RESTORATION
      if (item.isCertifiedProduct) {
        // Special handling for certified products
        product = await Product.findOne({
          $or: [
            { _id: item.productId, fromCertifiedOrder: true },
            { sku: item.productId, fromCertifiedOrder: true },
            { name: item.productName, fromCertifiedOrder: true }
          ],
          $or: [
            { wholesaler: req.user.id },
            { 'certifiedOrderSource.wholesalerId': req.user.id }
          ]
        });
      } else {
        // Regular product restoration
        product = await Product.findOne({
          _id: item.productId,
          wholesaler: req.user.id
        });

        if (!product) {
          // Try finding by SKU for certified products
          product = await Product.findOne({
            sku: item.productId,
            wholesaler: req.user.id
          });
        }
      }

      if (product) {
        const oldQuantity = product.quantity;
        product.quantity += item.quantity;
        await product.save();
        
        restorationResults.push({
          productName: product.name,
          productId: product._id,
          restoredQuantity: item.quantity,
          newQuantity: product.quantity,
          productType: product.fromCertifiedOrder ? 'certified' : 'regular'
        });
        
        console.log(`✅ Restored ${item.quantity} units of ${product.name} (${product.fromCertifiedOrder ? 'certified' : 'regular'})`);
      } else {
        restorationResults.push({
          productName: item.productName,
          productId: item.productId,
          error: 'Product not found for restoration',
          productType: item.isCertifiedProduct ? 'certified' : 'regular'
        });
        
        console.log(`⚠️ Product not found for restoration: ${item.productName} (${item.isCertifiedProduct ? 'certified' : 'regular'})`);
      }
    }

    await WholesaleSale.findByIdAndDelete(saleId);

    console.log(`✅ Sale deleted successfully: ${saleId}`);

    res.status(200).json({
      success: true,
      message: 'Wholesale sale deleted successfully',
      restorationResults,
      deletedSale: {
        referenceNumber: wholesaleSale.referenceNumber,
        customerName: wholesaleSale.customerName,
        grandTotal: wholesaleSale.grandTotal,
        certifiedItems: wholesaleSale.items.filter(item => item.isCertifiedProduct).length
      }
    });
  } catch (error) {
    console.error('Error deleting wholesale sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting wholesale sale',
      error: error.message
    });
  }
};

// Get wholesale sales statistics
exports.getSalesStatistics = async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const wholesalerId = req.user.id;

    // Calculate date range based on timeframe
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
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const matchStage = {
      wholesaler: wholesalerId,
      status: 'completed',
      createdAt: { $gte: startDate }
    };

    const statistics = await WholesaleSale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          totalAmountPaid: { $sum: '$amountPaid' },
          totalBalanceDue: { $sum: '$balanceDue' },
          averageSaleValue: { $avg: '$grandTotal' },
          totalItemsSold: { $sum: { $size: '$items' } }
        }
      }
    ]);

    // Get sales by payment method
    const paymentMethodStats = await WholesaleSale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    // Get top selling products including certified products
    const topProducts = await WholesaleSale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          isCertifiedProduct: { $first: '$items.isCertifiedProduct' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    // Get certified product sales statistics
    const certifiedSalesStats = await WholesaleSale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $match: {
          'items.isCertifiedProduct': true
        }
      },
      {
        $group: {
          _id: null,
          totalCertifiedSales: { $sum: 1 },
          totalCertifiedRevenue: { $sum: '$items.total' },
          totalCertifiedItems: { $sum: '$items.quantity' }
        }
      }
    ]);

    const stats = statistics[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalAmountPaid: 0,
      totalBalanceDue: 0,
      averageSaleValue: 0,
      totalItemsSold: 0
    };

    const certifiedStats = certifiedSalesStats[0] || {
      totalCertifiedSales: 0,
      totalCertifiedRevenue: 0,
      totalCertifiedItems: 0
    };

    res.status(200).json({
      success: true,
      statistics: {
        ...stats,
        ...certifiedStats,
        timeframe: timeframe,
        paymentMethodStats,
        topProducts
      }
    });
  } catch (error) {
    console.error('Error fetching sales statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales statistics',
      error: error.message
    });
  }
};

// Get recent sales activity
exports.getRecentSales = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentSales = await WholesaleSale.find({
      wholesaler: req.user.id,
      status: 'completed'
    })
    .populate('customerId', 'businessName firstName lastName')
    .populate('items.productId', 'name category fromCertifiedOrder')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('referenceNumber customerName grandTotal paymentStatus paymentMethod createdAt items');

    res.status(200).json({
      success: true,
      recentSales
    });
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent sales',
      error: error.message
    });
  }
};