// controllers/certifiedOrdersController.js
const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');
const Product = require('../models/Product');

// Process certified order and create/update products
exports.processCertifiedOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const wholesalerId = req.user.id;

    console.log(`Processing certified order: ${orderId} for wholesaler: ${wholesalerId}`);

    // First check if order can be certified
    const certificationCheck = await Product.canCertifyOrder(orderId, wholesalerId);
    
    if (!certificationCheck.canCertify) {
      return res.status(400).json({
        success: false,
        message: 'Cannot certify order',
        issues: certificationCheck.issues
      });
    }

    const order = certificationCheck.order;

    // Create products from certified order
    const createdProducts = await Product.createFromCertifiedOrder(order, wholesalerId);
    
    // Update order status to certified
    order.status = 'certified';
    order.certifiedAt = new Date();
    await order.save();

    console.log(`Successfully certified order ${order.orderNumber}, created ${createdProducts.length} products`);

    res.status(200).json({
      success: true,
      message: `Order certified successfully. Processed ${createdProducts.length} products.`,
      products: createdProducts,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        certifiedAt: order.certifiedAt
      }
    });

  } catch (error) {
    console.error('Error processing certified order:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing certified order',
      error: error.message
    });
  }
};

// Get certified products for wholesaler
exports.getCertifiedProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const wholesalerId = req.user.id;

    console.log(`Fetching certified products for wholesaler: ${wholesalerId}`);

    const result = await Product.getCertifiedProducts(wholesalerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search
    });

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error fetching certified products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching certified products',
      error: error.message
    });
  }
};

// Get orders ready for certification
exports.getOrdersReadyForCertification = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    console.log(`Fetching orders ready for certification for wholesaler: ${wholesalerId}`);

    const orders = await WholesalerOrderToSupplier.find({
      wholesaler: wholesalerId,
      status: 'delivered',
      certifiedAt: { $exists: false } // Not yet certified
    })
    .populate('items.product', 'name description images measurementUnit category sku quantity')
    .populate('supplier', 'businessName firstName lastName email phone')
    .populate('assignedTransporter', 'firstName lastName businessName')
    .sort({ deliveredAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments({
      wholesaler: wholesalerId,
      status: 'delivered',
      certifiedAt: { $exists: false }
    });

    // Check certification status for each order
    const ordersWithCertificationStatus = await Promise.all(
      orders.map(async (order) => {
        const certificationCheck = await Product.canCertifyOrder(order._id, wholesalerId);
        return {
          ...order.toObject(),
          canCertify: certificationCheck.canCertify,
          certificationIssues: certificationCheck.issues
        };
      })
    );

    res.status(200).json({
      success: true,
      orders: ordersWithCertificationStatus,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Error fetching orders ready for certification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders ready for certification',
      error: error.message
    });
  }
};

// Get certified product details
exports.getCertifiedProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    const wholesalerId = req.user.id;

    const product = await Product.findOne({
      _id: productId,
      wholesaler: wholesalerId,
      fromCertifiedOrder: true
    })
    .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName email phone address')
    .populate('certifiedOrderSource.orderId', 'orderNumber createdAt deliveredAt totalAmount')
    .populate('priceHistory.changedBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Certified product not found'
      });
    }

    res.status(200).json({
      success: true,
      product: {
        ...product.toObject(),
        profitMargin: product.profitMargin,
        profitPerUnit: product.profitPerUnit,
        totalProfitPotential: product.totalProfitPotential
      }
    });

  } catch (error) {
    console.error('Error fetching certified product details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching certified product details',
      error: error.message
    });
  }
};

// Update certified product stock
exports.updateCertifiedProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, reason } = req.body;
    const wholesalerId = req.user.id;

    const product = await Product.findOne({
      _id: productId,
      wholesaler: wholesalerId,
      fromCertifiedOrder: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Certified product not found'
      });
    }

    const oldQuantity = product.quantity;
    product.quantity = parseInt(quantity);
    
    // Add stock adjustment to notes
    if (reason) {
      const stockNote = `Stock adjusted: ${oldQuantity} -> ${quantity}. Reason: ${reason}`;
      if (product.internalNotes) {
        product.internalNotes += `\n${stockNote}`;
      } else {
        product.internalNotes = stockNote;
      }
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Certified product stock updated successfully',
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        oldQuantity: oldQuantity,
        newQuantity: product.quantity,
        difference: product.quantity - oldQuantity
      }
    });

  } catch (error) {
    console.error('Error updating certified product stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating certified product stock',
      error: error.message
    });
  }
};