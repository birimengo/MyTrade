// controllers/productController.js
const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, userId) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `trade-uganda/products/${userId}`,
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    // Clean up the uploaded file
    fs.unlinkSync(file.path);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    // Clean up file even if upload fails
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};

// Get all products for a wholesaler (INCLUDES CERTIFIED PRODUCTS)
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, includeCertified = true } = req.query;
    
    const filter = { 
      wholesaler: req.user.id,
      isActive: true // Only active products
    };
    
    // Include or exclude certified products based on parameter
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
      .sort({ fromCertifiedOrder: 1, createdAt: -1 }) // Regular products first, then certified
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

// Get products for retailers (ALL ACTIVE PRODUCTS INCLUDING CERTIFIED)
exports.getProductsForRetailers = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, wholesalerId } = req.query;
    
    const filter = { 
      isActive: true, // Only active products
      quantity: { $gt: 0 } // Only products with stock
    };
    
    // Filter by specific wholesaler if provided
    if (wholesalerId) {
      filter.wholesaler = wholesalerId;
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
      .populate('wholesaler', 'businessName firstName lastName email phone address rating')
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

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    })
    .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName');

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

// Create new product
exports.createProduct = async (req, res) => {
  try {
    let imageUrls = [];
    
    // Upload images to Cloudinary if any
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = results;
    }

    const productData = {
      ...req.body,
      wholesaler: req.user.id,
      price: parseFloat(req.body.price),
      quantity: parseInt(req.body.quantity),
      minOrderQuantity: parseInt(req.body.minOrderQuantity) || 1,
      bulkDiscount: req.body.bulkDiscount === 'true',
      discountPercentage: req.body.discountPercentage ? parseFloat(req.body.discountPercentage) : 0,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      images: imageUrls,
      fromCertifiedOrder: false // Ensure manually created products are not marked as certified
    };

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
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
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = [...imageUrls, ...results];
    }

    const updateData = {
      ...req.body,
      price: parseFloat(req.body.price),
      quantity: parseInt(req.body.quantity),
      minOrderQuantity: parseInt(req.body.minOrderQuantity) || 1,
      bulkDiscount: req.body.bulkDiscount === 'true',
      discountPercentage: req.body.discountPercentage ? parseFloat(req.body.discountPercentage) : 0,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      images: imageUrls
    };

    // Prevent updating certified order source for manually created products
    if (!product.fromCertifiedOrder) {
      delete updateData.fromCertifiedOrder;
      delete updateData.certifiedOrderSource;
    }

    product = await Product.findByIdAndUpdate(
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

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      wholesaler: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map(image => {
        return cloudinary.uploader.destroy(image.publicId);
      });
      
      await Promise.all(deletePromises);
    }

    await Product.findByIdAndDelete(req.params.id);

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

// Get product categories for a wholesaler
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', {
      wholesaler: req.user.id,
      isActive: true
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

// Delete specific product image
exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    
    const product = await Product.findOne({
      _id: productId,
      wholesaler: req.user.id
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