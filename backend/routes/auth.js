// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Enhanced validation rules
const registerValidationRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('phone').notEmpty().trim().withMessage('Phone number is required'),
  body('address').notEmpty().trim().withMessage('Address is required'),
  body('city').notEmpty().trim().withMessage('City is required'),
  body('role').isIn(['retailer', 'wholesaler', 'supplier', 'transporter']).withMessage('Valid role is required')
];

// Helper function to validate role-specific fields
const validateRoleSpecificFields = (req) => {
  const { role, businessName, productCategory, plateNumber, vehicleType } = req.body;
  const errors = [];

  if (role !== 'transporter') {
    if (!businessName || businessName.trim() === '') {
      errors.push({ path: 'businessName', msg: 'Business name is required for this role' });
    }
    if (!productCategory || productCategory.trim() === '') {
      errors.push({ path: 'productCategory', msg: 'Product category is required for this role' });
    }
  } else {
    if (!plateNumber || plateNumber.trim() === '') {
      errors.push({ path: 'plateNumber', msg: 'Plate number is required for transporters' });
    }
    if (!vehicleType || vehicleType.trim() === '') {
      errors.push({ path: 'vehicleType', msg: 'Vehicle type is required for transporters' });
    } else if (!['truck', 'motorcycle', 'van'].includes(vehicleType)) {
      errors.push({ path: 'vehicleType', msg: 'Vehicle type must be one of: truck, motorcycle, van' });
    }
  }

  return errors;
};

// Register User - Enhanced version with FIXED validation
router.post('/register', registerValidationRules, async (req, res) => {
  try {
    console.log('📨 Received registration request body:', req.body);

    // Check for express-validator errors
    const expressErrors = validationResult(req);
    if (!expressErrors.isEmpty()) {
      console.log('❌ Express validation errors:', expressErrors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: expressErrors.array()
      });
    }

    // Check for role-specific validation errors
    const roleErrors = validateRoleSpecificFields(req);
    if (roleErrors.length > 0) {
      console.log('❌ Role validation errors:', roleErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: roleErrors
      });
    }

    // Extract and sanitize all fields
    const {
      role,
      firstName,
      lastName,
      email,
      phone,
      password,
      businessName,
      address,
      city,
      country = 'Uganda',
      taxId = '',
      productCategory,
      plateNumber,
      companyType = 'individual',
      companyName = '',
      vehicleType,
      emergencyContact = '',
      website = '',
      businessDescription = '',
      yearsInBusiness = '',
      deliveryRadius = '',
      termsAccepted = false,
      marketingEmails = false,
      businessRegistration = ''
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Build user data object with proper defaults - FIXED: Only include transporter fields for transporters
    const userData = {
      role: role.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: password,
      address: address.trim(),
      city: city.trim(),
      country: country.trim(),
      taxId: taxId.trim(),
      termsAccepted: Boolean(termsAccepted),
      marketingEmails: Boolean(marketingEmails),
      emergencyContact: emergencyContact.trim(),
      website: website.trim(),
      businessDescription: businessDescription.trim(),
      yearsInBusiness: yearsInBusiness,
      deliveryRadius: deliveryRadius,
      businessRegistration: businessRegistration.trim()
    };

    // Add role-specific fields with proper validation
    if (role !== 'transporter') {
      userData.businessName = businessName ? businessName.trim() : '';
      userData.productCategory = productCategory ? productCategory.trim() : '';
      // Don't include transporter fields for non-transporters
    } else {
      // Only add transporter-specific fields for transporters
      userData.plateNumber = plateNumber ? plateNumber.trim() : '';
      userData.companyType = companyType;
      userData.vehicleType = vehicleType ? vehicleType.trim() : '';
      if (companyName && companyName.trim() !== '') {
        userData.companyName = companyName.trim();
      }
    }

    console.log('✅ Processed user data for creation:', userData);

    // Create new user
    const newUser = await User.create(userData);

    // Generate token
    const token = signToken(newUser._id);

    // Remove password from output
    const userResponse = newUser.toObject();
    delete userResponse.password;

    console.log('✅ User registered successfully:', userResponse.email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        path: err.path,
        message: err.message
      }));
      console.log('❌ Mongoose validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login User - Enhanced version
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email and include password
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordCorrect = await user.correctPassword(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last seen timestamp
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = signToken(user._id);

    // Remove password from output
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get current user - Enhanced version
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id).select('-password');
    
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    // Update last seen if it's been a while
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (currentUser.lastSeen < fiveMinutesAgo) {
      currentUser.lastSeen = new Date();
      await currentUser.save();
    }

    res.json({
      success: true,
      user: currentUser
    });

  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update user profile - Enhanced version
router.put('/profile', async (req, res) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    // Extract and validate update fields
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'address', 'city', 'country', 
      'taxId', 'businessName', 'productCategory', 'plateNumber', 
      'companyName', 'vehicleType', 'emergencyContact', 'website', 
      'businessDescription', 'yearsInBusiness', 'deliveryRadius',
      'facebook', 'twitter', 'linkedin', 'instagram',
      'openingTime', 'closingTime', 'workingDays', 'serviceAreas', 'paymentMethods',
      'businessRegistration'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        if (typeof req.body[key] === 'string') {
          updates[key] = req.body[key].trim();
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    // Apply updates - FIXED: Only update transporter fields for transporters
    Object.keys(updates).forEach(key => {
      // Only allow transporter fields to be updated if user is a transporter
      if (['plateNumber', 'companyType', 'companyName', 'vehicleType'].includes(key)) {
        if (user.role === 'transporter') {
          user[key] = updates[key];
        }
      } else {
        user[key] = updates[key];
      }
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        path: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update online status - Enhanced version
router.put('/online-status', async (req, res) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    const { isOnline } = req.body;
    
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isOnline must be a boolean value'
      });
    }

    user.isOnline = isOnline;
    user.lastSeen = new Date();
    
    await user.save();

    res.json({
      success: true,
      message: `User is now ${isOnline ? 'online' : 'offline'}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });

  } catch (error) {
    console.error('Online status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during online status update',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;