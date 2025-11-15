const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User'); // Change this from Customer to User

const router = express.Router();

// GET /api/customers - Get customers for wholesaler (retailers)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // Find retailers who could be customers
    const filter = { 
      role: 'retailer',
      $or: [
        { businessName: { $regex: search || '', $options: 'i' } },
        { firstName: { $regex: search || '', $options: 'i' } },
        { lastName: { $regex: search || '', $options: 'i' } },
        { email: { $regex: search || '', $options: 'i' } },
        { phone: { $regex: search || '', $options: 'i' } }
      ]
    };

    const customers = await User.find(filter)
      .select('businessName firstName lastName email phone address createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    // Format customers for the frontend
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

// GET /api/customers/:id - Get single customer
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await User.findOne({
      _id: req.params.id,
      role: 'retailer'
    }).select('businessName firstName lastName email phone address createdAt');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const formattedCustomer = {
      _id: customer._id,
      id: customer._id,
      name: customer.businessName || `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      businessName: customer.businessName,
      type: 'retailer',
      createdAt: customer.createdAt
    };

    res.status(200).json({
      success: true,
      customer: formattedCustomer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
});

module.exports = router;