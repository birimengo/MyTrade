// backend/controllers/retailerController.js
const User = require('../models/User');

// Get retailers by product category
exports.getRetailersByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    
    console.log('Fetching retailers for category:', category);
    
    let filter = { 
      role: 'retailer',
      isActive: true 
    };
    
    // Add category filter if provided
    if (category && category !== 'undefined') {
      filter.productCategory = category;
    }
    
    const retailers = await User.find(filter).select(
      'firstName lastName businessName contactPerson email phone productCategory isOnline lastSeen address city'
    );
    
    console.log('Found retailers:', retailers.length);
    
    res.status(200).json({
      success: true,
      count: retailers.length,
      retailers
    });
  } catch (error) {
    console.error('Error fetching retailers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching retailers',
      error: error.message
    });
  }
};

// Get all retailers (for admin purposes)
exports.getAllRetailers = async (req, res) => {
  try {
    const retailers = await User.find({ 
      role: 'retailer',
      isActive: true 
    }).select(
      'firstName lastName businessName contactPerson email phone productCategory isOnline lastSeen address city'
    );
    
    res.status(200).json({
      success: true,
      count: retailers.length,
      retailers
    });
  } catch (error) {
    console.error('Error fetching all retailers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching all retailers',
      error: error.message
    });
  }
};

// Get retailer by ID
exports.getRetailerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const retailer = await User.findOne({ 
      _id: id,
      role: 'retailer',
      isActive: true 
    }).select('-password');
    
    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: 'Retailer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      retailer
    });
  } catch (error) {
    console.error('Error fetching retailer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching retailer',
      error: error.message
    });
  }
};