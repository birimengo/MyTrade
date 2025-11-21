const Product = require('../models/Product');
const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');

// Add certified order products to wholesaler's stock
exports.addCertifiedOrderToStock = async (req, res) => {
  try {
    const { orderId } = req.params;
    const wholesalerId = req.user.id;

    console.log(`🔄 Adding certified order ${orderId} to stock for wholesaler ${wholesalerId}`);

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

    // Use the static method from Product model to create products from certified order
    const products = await Product.createFromCertifiedOrder(order, wholesalerId);

    res.status(200).json({
      success: true,
      message: `Successfully added ${products.length} products to your stock`,
      products: products.map(product => ({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        price: product.price,
        category: product.category
      })),
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        supplier: order.supplier
      }
    });

  } catch (error) {
    console.error('Error adding certified order to stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add products to stock',
      error: error.message
    });
  }
};

// Check if certified order products are already in stock
exports.checkCertifiedOrderInStock = async (req, res) => {
  try {
    const { orderId } = req.params;
    const wholesalerId = req.user.id;

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
        quantity: p.quantity
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

// Get all certified orders ready for stock addition
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
        { 'supplier.businessName': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await WholesalerOrderToSupplier.find(filter)
      .populate('items.product', 'name description images measurementUnit category')
      .populate('supplier', 'businessName firstName lastName email phone')
      .sort({ certifiedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments(filter);

    // Check stock status for each order
    const ordersWithStockStatus = await Promise.all(
      orders.map(async (order) => {
        const existingProducts = await Product.find({
          wholesaler: wholesalerId,
          'certifiedOrderSource.orderId': order._id
        });
        
        return {
          ...order.toObject(),
          alreadyInStock: existingProducts.length > 0,
          productsInStockCount: existingProducts.length
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

// Bulk add multiple certified orders to stock
exports.bulkAddToStock = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const wholesalerId = req.user.id;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    const results = {
      successful: [],
      failed: [],
      totalAdded: 0
    };

    for (const orderId of orderIds) {
      try {
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
            error: 'Products already in stock'
          });
          continue;
        }

        // Add products to stock
        const products = await Product.createFromCertifiedOrder(order, wholesalerId);
        
        results.successful.push({
          orderId,
          orderNumber: order.orderNumber,
          productsAdded: products.length
        });
        
        results.totalAdded += products.length;

      } catch (error) {
        results.failed.push({
          orderId,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk add completed. Successful: ${results.successful.length}, Failed: ${results.failed.length}`,
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