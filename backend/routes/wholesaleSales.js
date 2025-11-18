// routes/wholesaleSales.js
const express = require('express');
const auth = require('../middleware/auth');
const WholesaleSale = require('../models/WholesaleSale');
const Product = require('../models/Product');
const User = require('../models/User'); // For existing customers

const router = express.Router();

// GET /api/wholesale-sales - Get all wholesale sales for wholesaler
router.get('/', auth, async (req, res) => {
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
      .populate('items.productId', 'name price measurementUnit category images')
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
});

// GET /api/wholesale-sales/:id - Get single wholesale sale with full details
router.get('/:id', auth, async (req, res) => {
  try {
    const wholesaleSale = await WholesaleSale.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    })
    .populate('customerId', 'businessName firstName lastName phone email address createdAt')
    .populate('items.productId', 'name price costPrice measurementUnit category images description sku')
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
});

// POST /api/wholesale-sales - Create new wholesale sale
router.post('/', auth, async (req, res) => {
  try {
    // ✅ ADD DEBUG LOGS TO SEE WHAT'S BEING RECEIVED
    console.log('📥 BACKEND - Received sale data:', JSON.stringify(req.body, null, 2));
    console.log('🔍 BACKEND - Reference number received:', req.body.referenceNumber);
    console.log('🔍 BACKEND - Has referenceNumber:', !!req.body.referenceNumber);
    
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
      referenceNumber // ✅ CRITICAL FIX: ADD referenceNumber TO DESTRUCTURING
    } = req.body;

    // ✅ VALIDATE referenceNumber EXISTS
    if (!referenceNumber) {
      console.error('❌ BACKEND - referenceNumber is missing after destructuring!');
      return res.status(400).json({
        success: false,
        message: 'Reference number is required',
        error: 'WholesaleSale validation failed: referenceNumber: Path `referenceNumber` is required.'
      });
    }

    console.log('✅ BACKEND - referenceNumber after destructuring:', referenceNumber);

    // Validate required fields
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and at least one sale item are required'
      });
    }

    let customerDetails = {};
    let finalCustomerId = null;

    // Handle customer based on type
    if (customerType === 'existing') {
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

    // Check product availability and update quantities
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        wholesaler: req.user.id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productName}`
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.productName}. Available: ${product.quantity}`
        });
      }

      // Update product quantity
      product.quantity -= item.quantity;
      await product.save();
    }

    // ✅ CRITICAL FIX: INCLUDE referenceNumber IN saleData
    const saleData = {
      customerType,
      customerId: finalCustomerId,
      customerInfo: customerType === 'new' ? customerInfo : undefined,
      ...customerDetails,
      referenceNumber, // ✅ ADD THIS - WAS MISSING!
      saleDate: saleDate || new Date(),
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
      wholesaler: req.user.id
    };

    console.log('✅ BACKEND - Final saleData with referenceNumber:', saleData.referenceNumber);

    const wholesaleSale = new WholesaleSale(saleData);
    await wholesaleSale.save();

    // Populate the sale with all details
    await wholesaleSale.populate('customerId', 'businessName firstName lastName phone email address');
    await wholesaleSale.populate('items.productId', 'name price measurementUnit category images');
    await wholesaleSale.populate('wholesaler', 'businessName firstName lastName phone email address');

    // Add customer details to response
    const saleWithCustomerDetails = {
      ...wholesaleSale.toObject(),
      customerDetails: wholesaleSale.customerDetails
    };

    res.status(201).json({
      success: true,
      message: 'Wholesale sale created successfully',
      wholesaleSale: saleWithCustomerDetails
    });
  } catch (error) {
    console.error('❌ BACKEND - Error creating wholesale sale:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating wholesale sale',
      error: error.message
    });
  }
});

// GET /api/wholesale-sales/customer/:customerId - Get sales for specific customer
router.get('/customer/:customerId', auth, async (req, res) => {
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
    .populate('items.productId', 'name price measurementUnit category images')
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
});

// PUT /api/wholesale-sales/:id - Update wholesale sale
router.put('/:id', auth, async (req, res) => {
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
    .populate('items.productId', 'name price measurementUnit category images')
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
});

// DELETE /api/wholesale-sales/:id - Delete wholesale sale
router.delete('/:id', auth, async (req, res) => {
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

    // Restore product quantities
    for (const item of wholesaleSale.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: item.quantity } }
      );
    }

    await WholesaleSale.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Wholesale sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting wholesale sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting wholesale sale',
      error: error.message
    });
  }
});

module.exports = router;