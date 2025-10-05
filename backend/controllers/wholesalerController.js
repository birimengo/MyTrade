// backend/controllers/wholesalerController.js
const User = require('../models/User');
const Product = require('../models/Product'); // Add this import

// Get wholesalers by product category
exports.getWholesalersByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    
    console.log('Fetching wholesalers for category:', category);
    
    let filter = { 
      role: 'wholesaler',
      isActive: true 
    };
    
    // Add category filter if provided
    if (category && category !== 'undefined') {
      filter.productCategory = category;
    }
    
    const wholesalers = await User.find(filter).select(
      'businessName contactPerson email phone productCategory isOnline lastSeen address city'
    );
    
    console.log('Found wholesalers:', wholesalers.length);
    
    res.status(200).json({
      success: true,
      count: wholesalers.length,
      wholesalers
    });
  } catch (error) {
    console.error('Error fetching wholesalers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching wholesalers',
      error: error.message
    });
  }
};

// Get all wholesalers (for admin purposes)
exports.getAllWholesalers = async (req, res) => {
  try {
    const wholesalers = await User.find({ 
      role: 'wholesaler',
      isActive: true 
    }).select(
      'businessName contactPerson email phone productCategory isOnline lastSeen address city isVerified'
    );
    
    res.status(200).json({
      success: true,
      count: wholesalers.length,
      wholesalers
    });
  } catch (error) {
    console.error('Error fetching all wholesalers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching all wholesalers',
      error: error.message
    });
  }
};

// Get wholesaler by ID
exports.getWholesalerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const wholesaler = await User.findOne({ 
      _id: id,
      role: 'wholesaler',
      isActive: true 
    }).select('-password');
    
    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: 'Wholesaler not found'
      });
    }
    
    res.status(200).json({
      success: true,
      wholesaler
    });
  } catch (error) {
    console.error('Error fetching wholesaler:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching wholesaler',
      error: error.message
    });
  }
};

// Get products for a specific wholesaler
exports.getWholesalerProducts = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching products for wholesaler ID:', id);
    
    // Verify the wholesaler exists
    const wholesaler = await User.findOne({
      _id: id,
      role: 'wholesaler',
      isActive: true
    });
    
    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: 'Wholesaler not found'
      });
    }
    
    // Get active products for this wholesaler
    const products = await Product.find({ 
      wholesaler: id,
      isActive: true 
    })
    .sort({ createdAt: -1 })
    .populate('wholesaler', 'businessName contactPerson email phone');
    
    console.log(`Found ${products.length} products for wholesaler: ${wholesaler.businessName}`);
    
    res.status(200).json({
      success: true,
      products,
      wholesalerInfo: {
        _id: wholesaler._id,
        businessName: wholesaler.businessName,
        contactPerson: wholesaler.contactPerson,
        email: wholesaler.email,
        phone: wholesaler.phone,
        productCategory: wholesaler.productCategory,
        address: wholesaler.address,
        city: wholesaler.city,
        isOnline: wholesaler.isOnline,
        lastSeen: wholesaler.lastSeen
      }
    });
  } catch (error) {
    console.error('Error fetching wholesaler products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching wholesaler products',
      error: error.message
    });
  }
};