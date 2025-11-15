// backend/routes/users.js
const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ==============================================
// NEW ENDPOINT: Get retailers for BMS compatibility
// ==============================================

// GET /api/users/retailers - Get all retailers (for BMS compatibility)
router.get('/retailers', protect, async (req, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    
    // Find retailers
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

    const retailers = await User.find(filter)
      .select('businessName firstName lastName email phone address createdAt isActive')
      .sort({ businessName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      users: retailers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      count: retailers.length
    });
  } catch (error) {
    console.error('Error fetching retailers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching retailers',
      error: error.message
    });
  }
});

// ==============================================
// EXISTING ENDPOINTS (UNCHANGED)
// ==============================================

// Get suppliers by product category
router.get('/suppliers', protect, async (req, res) => {
  try {
    const { category } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Product category is required'
      });
    }

    // Find suppliers with the same product category
    const suppliers = await User.find({
      role: 'supplier',
      productCategory: category,
      isActive: true,
      _id: { $ne: req.user.id } // Exclude current user
    }).select('firstName lastName email phone businessName productCategory city country isOnline lastSeen');

    res.json({
      success: true,
      suppliers,
      count: suppliers.length
    });

  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching suppliers',
      error: error.message
    });
  }
});

// Get users that current user can communicate with based on role permissions
router.get('/communicable', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Get current user to determine their role
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        let allowedRoles = [];
        
        // Define communication permissions based on user role
        switch (currentUser.role) {
            case 'retailer':
                allowedRoles = ['wholesaler', 'transporter'];
                break;
            case 'wholesaler':
                allowedRoles = ['retailer', 'supplier', 'transporter'];
                break;
            case 'supplier':
                allowedRoles = ['wholesaler', 'transporter'];
                break;
            case 'transporter':
                allowedRoles = ['retailer', 'wholesaler', 'supplier'];
                break;
            default:
                allowedRoles = [];
        }
        
        const users = await User.find({
            _id: { $ne: userId },
            role: { $in: allowedRoles },
            isActive: true
        }).select('firstName lastName businessName role isOnline lastSeen');
        
        res.json({
            success: true,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get current user profile (protected route) - ENHANCED
router.get('/profile', protect, async (req, res) => {
    try {
        // Get complete user details excluding password
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Return user data based on role
        let userData = {
            id: user._id,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            address: user.address,
            city: user.city,
            country: user.country,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            businessRegistration: user.businessRegistration || ''
        };

        // Add role-specific fields
        if (user.role !== 'transporter') {
            userData.businessName = user.businessName;
            userData.taxId = user.taxId;
            userData.productCategory = user.productCategory;
        }

        if (user.role === 'transporter') {
            userData.plateNumber = user.plateNumber;
            userData.companyType = user.companyType;
            userData.companyName = user.companyName;
            userData.vehicleType = user.vehicleType;
        }

        res.json({
            success: true,
            user: userData
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile',
            error: error.message
        });
    }
});

// Update user profile (protected route) - ENHANCED
router.put('/profile', protect, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phone,
            address,
            city,
            country,
            businessName,
            taxId,
            productCategory,
            plateNumber,
            companyType,
            companyName,
            vehicleType,
            businessRegistration
        } = req.body;

        // Find the user
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update basic fields (common to all roles)
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;
        if (city !== undefined) user.city = city;
        if (country !== undefined) user.country = country;
        if (businessRegistration !== undefined) user.businessRegistration = businessRegistration;

        // Update role-specific fields - FIXED: Only update transporter fields for transporters
        if (user.role !== 'transporter') {
            if (businessName !== undefined) user.businessName = businessName;
            if (taxId !== undefined) user.taxId = taxId;
            if (productCategory !== undefined) user.productCategory = productCategory;
        }

        if (user.role === 'transporter') {
            if (plateNumber !== undefined) user.plateNumber = plateNumber;
            if (companyType !== undefined) user.companyType = companyType;
            if (companyName !== undefined) user.companyName = companyName;
            if (vehicleType !== undefined) user.vehicleType = vehicleType;
        }

        // Save the updated user
        await user.save();

        // Return updated user data (excluding password)
        const updatedUser = await User.findById(req.user.id).select('-password');
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while updating profile',
            error: error.message
        });
    }
});

// Change password (protected route)
router.post('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // User is already available from auth middleware
        const user = await User.findById(req.user.id).select('+password'); // Select password for comparison
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get user by ID (optional, for admin purposes)
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get user public profile by ID (for viewing other users' public profiles) - NEW
router.get('/:id/public', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('firstName lastName businessName role productCategory city isOnline lastSeen');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Return public profile data only
        const publicProfile = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            businessName: user.businessName,
            productCategory: user.productCategory,
            city: user.city,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
        };
        
        res.json({
            success: true,
            user: publicProfile
        });
    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching public profile',
            error: error.message
        });
    }
});

// Update user by ID (optional, for admin purposes)
router.put('/:id', async (req, res) => {
    try {
        const updates = req.body;
        
        // Find the user document
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Apply updates - FIXED: Only update transporter fields for transporters
        for (const key in updates) {
            if (updates.hasOwnProperty(key)) {
                // Only allow transporter fields to be updated if user is a transporter
                if (['plateNumber', 'companyType', 'companyName', 'vehicleType'].includes(key)) {
                    if (user.role === 'transporter') {
                        user[key] = updates[key];
                    }
                } else {
                    user[key] = updates[key];
                }
            }
        }

        // Save the document
        await user.save();
        
        // Exclude the password from the response
        user.password = undefined;
        
        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;