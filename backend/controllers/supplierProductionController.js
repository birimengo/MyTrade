const SupplierProduct = require('../models/SupplierProduct');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'do2bbokxv',
  api_key: process.env.CLOUDINARY_API_KEY || '885838516326599',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'PpaVX7vV4TSjyO39AOBzeRLDaxE'
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, supplierId) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `trade-uganda/supplier-products/${supplierId}`,
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'auto' }
      ],
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Clean up the uploaded file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      uploadedAt: new Date()
    };
  } catch (error) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};

// Calculate profit margin helper function
const calculateProfitMargin = (sellingPrice, productionPrice) => {
  if (!productionPrice || productionPrice <= 0) return 0;
  return ((sellingPrice - productionPrice) / productionPrice) * 100;
};

// Get all products for a supplier
exports.getSupplierProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, productionStatus } = req.query;
    
    const filter = { supplier: req.user.id };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (productionStatus && productionStatus !== 'all') {
      filter.productionStatus = productionStatus;
    }
    
    if (search) {
      filter.$text = { $search: search };
    }

    const products = await SupplierProduct.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SupplierProduct.countDocuments(filter);

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

// Get single product
exports.getSupplierProduct = async (req, res) => {
  try {
    const product = await SupplierProduct.findOne({
      _id: req.params.id,
      supplier: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
};

// Create new product with multiple images
exports.createSupplierProduct = async (req, res) => {
  let imageUrls = [];
  
  try {
    // Upload images to Cloudinary
    if (req.files && req.files.length > 0) {
      const maxImages = Math.min(req.files.length, 5);
      const uploadPromises = req.files.slice(0, maxImages).map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = results;
    }

    // Parse materials array if provided
    let materials = [];
    if (req.body.materials) {
      try {
        materials = typeof req.body.materials === 'string' 
          ? JSON.parse(req.body.materials) 
          : req.body.materials;
          
        materials = materials.map(material => ({
          ...material,
          addedAt: new Date()
        }));
      } catch (error) {
        console.error('Error parsing materials:', error);
      }
    }

    // Calculate profit margin
    const sellingPrice = parseFloat(req.body.sellingPrice) || 0;
    const productionPrice = parseFloat(req.body.productionPrice) || 0;
    const profitMargin = calculateProfitMargin(sellingPrice, productionPrice);

    const productData = {
      ...req.body,
      supplier: req.user.id,
      sellingPrice: sellingPrice,
      productionPrice: productionPrice,
      profitMargin: profitMargin,
      quantity: parseInt(req.body.quantity) || 0,
      productionTime: parseInt(req.body.productionTime) || 0,
      minOrderQuantity: parseInt(req.body.minOrderQuantity) || 1,
      lowStockThreshold: parseInt(req.body.lowStockThreshold) || 10,
      materials: materials,
      images: imageUrls,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Handle bulk discount
    if (req.body.bulkDiscount === 'true' && req.body.bulkDiscountMinQuantity && req.body.bulkDiscountPercentage) {
      productData.bulkDiscount = {
        minQuantity: parseInt(req.body.bulkDiscountMinQuantity),
        discountPercentage: parseFloat(req.body.bulkDiscountPercentage),
        createdAt: new Date()
      };
    }

    const product = new SupplierProduct(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    // Clean up uploaded images if product creation fails
    if (imageUrls && imageUrls.length > 0) {
      const deletePromises = imageUrls.map(image => {
        return cloudinary.uploader.destroy(image.publicId);
      });
      await Promise.all(deletePromises);
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update product
exports.updateSupplierProduct = async (req, res) => {
  try {
    let product = await SupplierProduct.findOne({
      _id: req.params.id,
      supplier: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let imageUrls = [...product.images];
    
    // Upload new images if any
    if (req.files && req.files.length > 0) {
      const availableSlots = Math.max(0, 5 - imageUrls.length);
      const maxImages = Math.min(req.files.length, availableSlots);
      
      const uploadPromises = req.files.slice(0, maxImages).map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = [...imageUrls, ...results];
    }

    // Parse materials array if provided
    let materials = product.materials;
    if (req.body.materials) {
      try {
        materials = typeof req.body.materials === 'string' 
          ? JSON.parse(req.body.materials) 
          : req.body.materials;
      } catch (error) {
        console.error('Error parsing materials:', error);
      }
    }

    // Calculate profit margin
    const sellingPrice = parseFloat(req.body.sellingPrice) || product.sellingPrice;
    const productionPrice = parseFloat(req.body.productionPrice) || product.productionPrice;
    const profitMargin = calculateProfitMargin(sellingPrice, productionPrice);

    const updateData = {
      ...req.body,
      sellingPrice: sellingPrice,
      productionPrice: productionPrice,
      profitMargin: profitMargin,
      quantity: parseInt(req.body.quantity) || product.quantity,
      productionTime: parseInt(req.body.productionTime) || product.productionTime,
      minOrderQuantity: parseInt(req.body.minOrderQuantity) || product.minOrderQuantity,
      lowStockThreshold: parseInt(req.body.lowStockThreshold) || product.lowStockThreshold,
      materials: materials,
      images: imageUrls,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : product.tags,
      updatedAt: new Date()
    };

    // Handle bulk discount update
    if (req.body.bulkDiscount === 'true' && req.body.bulkDiscountMinQuantity && req.body.bulkDiscountPercentage) {
      updateData.bulkDiscount = {
        minQuantity: parseInt(req.body.bulkDiscountMinQuantity),
        discountPercentage: parseFloat(req.body.bulkDiscountPercentage),
        createdAt: product.bulkDiscount?.createdAt || new Date()
      };
    } else {
      updateData.bulkDiscount = undefined;
    }

    product = await SupplierProduct.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product and its images
exports.deleteSupplierProduct = async (req, res) => {
  try {
    const product = await SupplierProduct.findOne({
      _id: req.params.id,
      supplier: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map(image => {
        return cloudinary.uploader.destroy(image.publicId);
      });
      
      await Promise.all(deletePromises);
    }

    await SupplierProduct.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Delete specific product image
exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    
    const product = await SupplierProduct.findOne({
      _id: productId,
      supplier: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const imageToDelete = product.images.id(imageId);
    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(imageToDelete.publicId);

    // Remove from product
    product.images.pull(imageId);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// Get product categories for a supplier
exports.getSupplierCategories = async (req, res) => {
  try {
    const categories = await SupplierProduct.distinct('category', {
      supplier: req.user.id
    });

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Update production status
exports.updateProductionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const product = await SupplierProduct.findOne({
      _id: req.params.id,
      supplier: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.productionStatus = status;
    product.updatedAt = new Date();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Production status updated successfully',
      product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating production status',
      error: error.message
    });
  }
};

// Get production statistics
exports.getProductionStatistics = async (req, res) => {
  try {
    const supplierId = req.user.id;

    const products = await SupplierProduct.find({ supplier: supplierId });

    const statistics = {
      totalProducts: products.length,
      totalStockValue: products.reduce((sum, product) => 
        sum + (product.sellingPrice * product.quantity), 0
      ),
      inProductionCount: products.filter(product => 
        product.productionStatus === 'in_production'
      ).length,
      readyCount: products.filter(product => 
        product.productionStatus === 'ready'
      ).length,
      lowStockCount: products.filter(product => 
        product.lowStockAlert === true
      ).length,
      averageProfitMargin: products.length > 0 ? 
        products.reduce((sum, product) => sum + (product.profitMargin || 0), 0) / products.length : 0,
      totalImages: products.reduce((sum, product) => 
        sum + (product.images ? product.images.length : 0), 0
      )
    };

    res.status(200).json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error in getProductionStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching production statistics',
      error: error.message
    });
  }
};

// ========== NEW FUNCTIONS ADDED FOR WHOLESALERS ==========

// Get all products for a specific supplier (for wholesalers to view)
exports.getSupplierProductsForWholesaler = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { page = 1, limit = 12, category, search } = req.query;
    
    // Validate supplierId
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID'
      });
    }

    const filter = { 
      supplier: supplierId,
      isActive: true 
    };
    
    // Add category filter if provided
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    // Add search filter if provided
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const products = await SupplierProduct.find(filter)
      .populate('supplier', 'firstName lastName businessName email phone productCategory city country')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SupplierProduct.countDocuments(filter);

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching supplier products',
      error: error.message
    });
  }
};

// Get supplier details
exports.getSupplierDetails = async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID'
      });
    }

    // Import User model
    const User = require('../models/User');
    const supplier = await User.findById(supplierId)
      .select('firstName lastName businessName email phone productCategory city country isOnline lastSeen');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.status(200).json({
      success: true,
      supplier
    });
  } catch (error) {
    console.error('Error fetching supplier details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching supplier details',
      error: error.message
    });
  }
};