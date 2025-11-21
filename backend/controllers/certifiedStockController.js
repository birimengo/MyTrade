const Product = require('../models/Product');
const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');

// Add certified order products to wholesaler's stock WITH SELLING PRICES
exports.addCertifiedOrderToStock = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellingPrices } = req.body; // New: selling prices object { productId: sellingPrice }
    const wholesalerId = req.user.id;

    console.log(`🔄 Adding certified order ${orderId} to stock for wholesaler ${wholesalerId}`);
    console.log('Received selling prices:', sellingPrices);

    // Validate order ID format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    // Get the certified order
    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      wholesaler: wholesalerId,
      status: 'certified'
    })
    .populate('items.product')
    .populate('supplier', 'businessName firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Certified order not found or you do not have permission'
      });
    }

    // Check if products from this order are already in stock
    const existingProducts = await Product.find({
      wholesaler: wholesalerId,
      'certifiedOrderSource.orderId': orderId
    });

    if (existingProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Products from this order are already in your stock',
        existingProducts: existingProducts.map(p => ({
          name: p.name,
          sku: p.sku,
          quantity: p.quantity
        }))
      });
    }

    // Validate selling prices structure if provided
    if (sellingPrices && typeof sellingPrices !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid selling prices format. Expected object with productId keys.'
      });
    }

    // Validate individual selling prices
    if (sellingPrices) {
      for (const [productId, price] of Object.entries(sellingPrices)) {
        if (typeof price !== 'number' || price < 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid selling price for product ${productId}. Must be a non-negative number.`
          });
        }
        
        // Find the corresponding item to get cost price
        const item = order.items.find(item => 
          item.product && (item.product._id.toString() === productId || item.product.toString() === productId)
        );
        
        if (item && price < item.unitPrice) {
          console.warn(`⚠️ Selling price (${price}) is less than cost price (${item.unitPrice}) for product ${productId}`);
          // We allow this but just warn, as sometimes businesses might sell at loss
        }
      }
    }

    // Use the static method from Product model to create products from certified order WITH SELLING PRICES
    const products = await Product.createFromCertifiedOrder(order, wholesalerId, sellingPrices);

    // Calculate pricing summary
    const pricingSummary = {
      totalCost: products.reduce((sum, product) => sum + (product.costPrice * product.quantity), 0),
      totalPotentialRevenue: products.reduce((sum, product) => sum + (product.price * product.quantity), 0),
      totalPotentialProfit: products.reduce((sum, product) => sum + ((product.price - product.costPrice) * product.quantity), 0),
      averageProfitMargin: products.length > 0 ? 
        (products.reduce((sum, product) => sum + ((product.price - product.costPrice) / product.costPrice * 100), 0) / products.length).toFixed(1) : 0
    };

    res.status(200).json({
      success: true,
      message: `Successfully added ${products.length} products to your stock`,
      products: products.map(product => ({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        price: product.price, // Selling price
        costPrice: product.costPrice, // Cost price
        sellingPrice: product.price, // Selling price (alias for consistency)
        category: product.category,
        profit: (product.price - product.costPrice).toFixed(2),
        profitMargin: ((product.price - product.costPrice) / product.costPrice * 100).toFixed(1)
      })),
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        supplier: order.supplier
      },
      pricingSummary
    });

  } catch (error) {
    console.error('❌ Error adding certified order to stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add products to stock',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Check if certified order products are already in stock
exports.checkCertifiedOrderInStock = async (req, res) => {
  try {
    const { orderId } = req.params;
    const wholesalerId = req.user.id;

    // Validate order ID format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      wholesaler: wholesalerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if any products from this order are already in stock
    const existingProducts = await Product.find({
      wholesaler: wholesalerId,
      'certifiedOrderSource.orderId': orderId
    });

    res.status(200).json({
      success: true,
      alreadyInStock: existingProducts.length > 0,
      existingProductsCount: existingProducts.length,
      existingProducts: existingProducts.map(p => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        price: p.price,
        costPrice: p.costPrice,
        sellingPrice: p.price,
        profit: (p.price - p.costPrice).toFixed(2),
        profitMargin: p.costPrice > 0 ? (((p.price - p.costPrice) / p.costPrice) * 100).toFixed(1) : 0
      }))
    });

  } catch (error) {
    console.error('Error checking certified order in stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check stock status',
      error: error.message
    });
  }
};

// Get all certified orders ready for stock addition WITH PRICING INFORMATION
exports.getCertifiedOrdersForStock = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { page = 1, limit = 10, search = '' } = req.query;

    const filter = {
      wholesaler: wholesalerId,
      status: 'certified'
    };

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'supplier.businessName': { $regex: search, $options: 'i' } },
        { 'items.product.name': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await WholesalerOrderToSupplier.find(filter)
      .populate('items.product', 'name description images measurementUnit category tags minOrderQuantity')
      .populate('supplier', 'businessName firstName lastName email phone')
      .sort({ certifiedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments(filter);

    // Check stock status for each order and calculate pricing information
    const ordersWithStockStatus = await Promise.all(
      orders.map(async (order) => {
        const existingProducts = await Product.find({
          wholesaler: wholesalerId,
          'certifiedOrderSource.orderId': order._id
        });

        // Calculate default selling prices (30% markup) and pricing information
        const itemsWithPricing = order.items.map(item => {
          const costPrice = item.unitPrice;
          const defaultSellingPrice = Math.round(costPrice * 1.3); // 30% markup
          const profit = defaultSellingPrice - costPrice;
          const profitMargin = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : 0;
          
          return {
            ...item.toObject(),
            defaultSellingPrice,
            defaultProfit: profit,
            defaultProfitMargin: profitMargin
          };
        });

        // Calculate order-level pricing summary
        const pricingSummary = {
          totalCost: order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
          totalDefaultRevenue: itemsWithPricing.reduce((sum, item) => sum + (item.defaultSellingPrice * item.quantity), 0),
          totalDefaultProfit: itemsWithPricing.reduce((sum, item) => sum + (item.defaultProfit * item.quantity), 0),
          averageProfitMargin: itemsWithPricing.length > 0 ? 
            (itemsWithPricing.reduce((sum, item) => sum + parseFloat(item.defaultProfitMargin), 0) / itemsWithPricing.length).toFixed(1) : 0
        };

        return {
          ...order.toObject(),
          items: itemsWithPricing,
          alreadyInStock: existingProducts.length > 0,
          productsInStockCount: existingProducts.length,
          pricingSummary
        };
      })
    );

    res.status(200).json({
      success: true,
      orders: ordersWithStockStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching certified orders for stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certified orders',
      error: error.message
    });
  }
};

// Bulk add multiple certified orders to stock WITH SELLING PRICES
exports.bulkAddToStock = async (req, res) => {
  try {
    const { orderIds, sellingPrices } = req.body; // sellingPrices: { orderId: { productId: sellingPrice } }
    const wholesalerId = req.user.id;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    // Validate selling prices structure if provided
    if (sellingPrices && typeof sellingPrices !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid selling prices format. Expected object with orderId keys.'
      });
    }

    const results = {
      successful: [],
      failed: [],
      totalAdded: 0,
      totalProducts: 0
    };

    for (const orderId of orderIds) {
      try {
        // Validate order ID format
        if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
          results.failed.push({
            orderId,
            error: 'Invalid order ID format'
          });
          continue;
        }

        const order = await WholesalerOrderToSupplier.findOne({
          _id: orderId,
          wholesaler: wholesalerId,
          status: 'certified'
        }).populate('items.product');

        if (!order) {
          results.failed.push({
            orderId,
            error: 'Order not found or not certified'
          });
          continue;
        }

        // Check if products already exist
        const existingProducts = await Product.find({
          wholesaler: wholesalerId,
          'certifiedOrderSource.orderId': orderId
        });

        if (existingProducts.length > 0) {
          results.failed.push({
            orderId,
            orderNumber: order.orderNumber,
            error: 'Products already in stock',
            existingProducts: existingProducts.length
          });
          continue;
        }

        // Get selling prices for this specific order
        const orderSellingPrices = sellingPrices && sellingPrices[orderId] ? sellingPrices[orderId] : {};

        // Validate selling prices for this order
        if (orderSellingPrices && typeof orderSellingPrices === 'object') {
          for (const [productId, price] of Object.entries(orderSellingPrices)) {
            if (typeof price !== 'number' || price < 0) {
              results.failed.push({
                orderId,
                orderNumber: order.orderNumber,
                error: `Invalid selling price for product ${productId}. Must be a non-negative number.`
              });
              continue;
            }
          }
        }

        // Add products to stock with selling prices
        const products = await Product.createFromCertifiedOrder(order, wholesalerId, orderSellingPrices);
        
        results.successful.push({
          orderId,
          orderNumber: order.orderNumber,
          productsAdded: products.length,
          products: products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            costPrice: p.costPrice,
            sellingPrice: p.price,
            profit: (p.price - p.costPrice).toFixed(2)
          }))
        });
        
        results.totalAdded += 1;
        results.totalProducts += products.length;

      } catch (error) {
        console.error(`Error processing order ${orderId}:`, error);
        results.failed.push({
          orderId,
          error: error.message
        });
      }
    }

    // Calculate summary statistics
    const summary = {
      totalOrdersProcessed: orderIds.length,
      successfulOrders: results.successful.length,
      failedOrders: results.failed.length,
      totalProductsAdded: results.totalProducts,
      successRate: ((results.successful.length / orderIds.length) * 100).toFixed(1)
    };

    res.status(200).json({
      success: true,
      message: `Bulk add completed. Successful: ${results.successful.length}, Failed: ${results.failed.length}`,
      summary,
      results
    });

  } catch (error) {
    console.error('Error in bulk add to stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk add to stock',
      error: error.message
    });
  }
};

// Get product pricing suggestions based on cost price
exports.getPricingSuggestions = async (req, res) => {
  try {
    const { costPrice } = req.query;
    
    if (!costPrice || isNaN(costPrice) || costPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid cost price is required'
      });
    }

    const cost = parseFloat(costPrice);
    
    const suggestions = {
      costPrice: cost,
      conservative: {
        markup: 20,
        sellingPrice: Math.round(cost * 1.2),
        profit: Math.round(cost * 1.2) - cost,
        profitMargin: 20.0
      },
      standard: {
        markup: 30,
        sellingPrice: Math.round(cost * 1.3),
        profit: Math.round(cost * 1.3) - cost,
        profitMargin: 30.0
      },
      aggressive: {
        markup: 50,
        sellingPrice: Math.round(cost * 1.5),
        profit: Math.round(cost * 1.5) - cost,
        profitMargin: 50.0
      },
      premium: {
        markup: 100,
        sellingPrice: Math.round(cost * 2.0),
        profit: Math.round(cost * 2.0) - cost,
        profitMargin: 100.0
      }
    };

    res.status(200).json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Error generating pricing suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate pricing suggestions',
      error: error.message
    });
  }
};

// Update existing product selling price
exports.updateProductSellingPrice = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sellingPrice } = req.body;
    const wholesalerId = req.user.id;

    if (!sellingPrice || isNaN(sellingPrice) || sellingPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid selling price is required'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      wholesaler: wholesalerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission'
      });
    }

    // Update selling price using the product method
    await product.updatePrice(parseFloat(sellingPrice), wholesalerId, 'Manual price update', null, 'manual', 'Price updated via API');

    res.status(200).json({
      success: true,
      message: 'Selling price updated successfully',
      product: {
        _id: product._id,
        name: product.name,
        costPrice: product.costPrice,
        sellingPrice: product.price,
        profit: (product.price - product.costPrice).toFixed(2),
        profitMargin: ((product.price - product.costPrice) / product.costPrice * 100).toFixed(1)
      }
    });

  } catch (error) {
    console.error('Error updating product selling price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update selling price',
      error: error.message
    });
  }
};

// Get certified product analytics
exports.getCertifiedProductAnalytics = async (req, res) => {
  try {
    const wholesalerId = req.user.id;

    const analytics = await Product.getCertifiedProductAnalytics(wholesalerId);

    res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching certified product analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certified product analytics',
      error: error.message
    });
  }
};