// controllers/certifiedProductsController.js
const Product = require('../models/Product');
const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');
const User = require('../models/User');

// Sync certified supplier orders to wholesaler products
exports.syncCertifiedProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    
    // Find all certified orders for this wholesaler
    const certifiedOrders = await WholesalerOrderToSupplier.find({
      wholesaler: wholesalerId,
      status: 'certified'
    })
    .populate('items.product', 'name description images category measurementUnit tags bulkDiscount discountPercentage')
    .populate('supplier', 'businessName');

    let createdCount = 0;
    let updatedCount = 0;
    let errors = [];

    for (const order of certifiedOrders) {
      for (const orderItem of order.items) {
        try {
          const productData = orderItem.product;
          
          if (!productData) {
            console.log(`Product data not found for order item in order ${order.orderNumber}`);
            continue;
          }

          // Check if product already exists from this certified order
          const existingProduct = await Product.findOne({
            wholesaler: wholesalerId,
            'certifiedOrderSource.orderId': order._id,
            'certifiedOrderSource.supplierId': order.supplier._id,
            name: productData.name
          });

          if (existingProduct) {
            // Update existing product quantity and price
            existingProduct.quantity += orderItem.quantity;
            existingProduct.price = orderItem.unitPrice;
            existingProduct.lastStockUpdate = new Date();
            existingProduct.isActive = true; // Ensure it's active
            await existingProduct.save();
            updatedCount++;
          } else {
            // Create new product from certified order
            const newProduct = new Product({
              name: productData.name,
              description: productData.description || `Product from certified supplier order ${order.orderNumber}`,
              price: orderItem.unitPrice,
              quantity: orderItem.quantity,
              measurementUnit: productData.measurementUnit || 'units',
              category: productData.category || 'General',
              images: productData.images || [],
              minOrderQuantity: 1,
              wholesaler: wholesalerId,
              isActive: true, // Ensure certified products are active
              fromCertifiedOrder: true,
              certifiedOrderSource: {
                orderId: order._id,
                supplierId: order.supplier._id,
                certifiedAt: order.certifiedAt || new Date()
              },
              tags: productData.tags || [],
              bulkDiscount: productData.bulkDiscount || false,
              discountPercentage: productData.discountPercentage || 0
            });

            await newProduct.save();
            createdCount++;
          }
        } catch (error) {
          errors.push(`Order ${order.orderNumber}, Product ${orderItem.product?.name}: ${error.message}`);
          console.error(`Error syncing product from order ${order.order.orderNumber}:`, error);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Certified products synced successfully. Created: ${createdCount}, Updated: ${updatedCount}`,
      created: createdCount,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error syncing certified products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while syncing certified products',
      error: error.message
    });
  }
};

// Get certified products for wholesaler
exports.getCertifiedProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    
    const filter = { 
      wholesaler: req.user.id,
      fromCertifiedOrder: true,
      isActive: true
    };
    
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
      .sort({ createdAt: -1 })
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
      message: 'Server error while fetching certified products',
      error: error.message
    });
  }
};

// Get all products including certified ones (modified existing getProducts)
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, includeCertified = true } = req.query;
    
    const filter = { 
      wholesaler: req.user.id,
      isActive: true
    };
    
    // Option to filter out certified products
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

// Update product stock when retailer orders certified product
exports.updateCertifiedProductStock = async (productId, quantity) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if there's sufficient stock
    if (product.quantity < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.quantity}, Ordered: ${quantity}`);
    }

    // Update product quantity
    const previousQuantity = product.quantity;
    product.quantity -= quantity;
    
    // Set low stock alert if needed
    if (product.originalStockQuantity) {
      const lowStockThreshold = product.originalStockQuantity * 0.5;
      product.lowStockAlert = product.quantity <= lowStockThreshold;
    }
    
    product.lastStockUpdate = new Date();

    await product.save();
    
    console.log(`Certified product stock updated: ${product.name} - Previous: ${previousQuantity}, New: ${product.quantity}`);
    
    return product;
  } catch (error) {
    console.error('Error updating certified product stock:', error);
    throw error;
  }
};

// Get low stock certified products
exports.getLowStockCertifiedProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const lowStockProducts = await Product.find({
      wholesaler: wholesalerId,
      fromCertifiedOrder: true,
      lowStockAlert: true,
      isActive: true
    })
    .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
    .sort({ quantity: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Product.countDocuments({
      wholesaler: wholesalerId,
      fromCertifiedOrder: true,
      lowStockAlert: true,
      isActive: true
    });

    res.status(200).json({
      success: true,
      lowStockProducts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock certified products',
      error: error.message
    });
  }
};