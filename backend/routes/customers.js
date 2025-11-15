const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// GET /api/customers - Get customers for wholesaler (retailers)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    console.log('🔍 Fetching customers for wholesaler:', req.user.id);
    
    // Find retailers who could be customers
    const filter = { 
      role: 'retailer',
      isActive: true
    };

    // Add search filter if provided
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await User.find(filter)
      .select('businessName firstName lastName email phone address city country createdAt isActive')
      .sort({ businessName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    // Format customers for the frontend
    const formattedCustomers = customers.map(customer => ({
      _id: customer._id,
      id: customer._id,
      name: customer.businessName || `${customer.firstName} ${customer.lastName}`.trim(),
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      businessName: customer.businessName,
      type: 'retailer',
      isActive: customer.isActive,
      createdAt: customer.createdAt
    }));

    console.log(`✅ Found ${formattedCustomers.length} customers for wholesaler`);

    res.status(200).json({
      success: true,
      customers: formattedCustomers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      count: formattedCustomers.length
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🔍 Fetching customer details:', req.params.id);
    
    const customer = await User.findOne({
      _id: req.params.id,
      role: 'retailer'
    }).select('businessName firstName lastName email phone address city country createdAt isActive');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const formattedCustomer = {
      _id: customer._id,
      id: customer._id,
      name: customer.businessName || `${customer.firstName} ${customer.lastName}`.trim(),
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      businessName: customer.businessName,
      type: 'retailer',
      isActive: customer.isActive,
      createdAt: customer.createdAt
    };

    console.log('✅ Customer details fetched successfully');

    res.status(200).json({
      success: true,
      customer: formattedCustomer
    });
  } catch (error) {
    console.error('❌ Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
});

module.exports = router;