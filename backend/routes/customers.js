const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Customer = require('../models/Customer'); // Optional: if you want separate customer model

const router = express.Router();

// GET /api/customers - Get all customers for wholesaler
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // For now, we'll use retailers as customers
    const filter = { 
      role: 'retailer',
      // If you have a relationship field, add it here
      // wholesaler: req.user.id 
    };
    
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await User.find(filter)
      .select('businessName firstName lastName phone email address role createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    // Format response to match expected structure
    const formattedCustomers = customers.map(customer => ({
      _id: customer._id,
      id: customer._id,
      name: customer.businessName || `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      businessName: customer.businessName,
      type: 'retailer',
      createdAt: customer.createdAt
    }));

    res.status(200).json({
      success: true,
      customers: formattedCustomers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
});

// POST /api/customers - Create new customer
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, address, businessName } = req.body;

    // Create a new retailer user for the customer
    const customer = new User({
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || name,
      businessName: businessName || name,
      phone,
      email: email || `${phone}@customer.com`,
      address,
      role: 'retailer',
      password: 'temp123', // Set a temporary password
      isVerified: true
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        _id: customer._id,
        id: customer._id,
        name: customer.businessName || `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        businessName: customer.businessName,
        type: 'retailer',
        createdAt: customer.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
});

module.exports = router;