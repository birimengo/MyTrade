// controllers/productController.js
const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); // Added missing import

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

// Helper function to validate pricing
const validatePricing = (purchasingPrice, sellingPrice) => {
  if (purchasingPrice === undefined || purchasingPrice === null || purchasingPrice <= 0) {
    throw new Error('Purchasing price must be greater than 0');
  }
  if (sellingPrice === undefined || sellingPrice === null || sellingPrice <= 0) {
    throw new Error('Selling price must be greater than 0');
  }
  if (sellingPrice < purchasingPrice) {
    throw new Error('Selling price cannot be less than purchasing price');
  }
};

// Helper function to parse form data safely
const parseFormData = (body) => {
  return {
    name: body.name?.trim(),
    description: body.description?.trim(),
    purchasingPrice: body.purchasingPrice ? parseFloat(body.purchasingPrice) : undefined,
    sellingPrice: body.sellingPrice ? parseFloat(body.sellingPrice) : undefined,
    quantity: body.quantity ? parseInt(body.quantity) : undefined,
    measurementUnit: body.measurementUnit || 'units',
    category: body.category?.trim(),
    minOrderQuantity: body.minOrderQuantity ? parseInt(body.minOrderQuantity) : 1,
    bulkDiscount: body.bulkDiscount === 'true' || body.bulkDiscount === true,
    discountPercentage: body.discountPercentage ? parseFloat(body.discountPercentage) : 0,
    tags: body.tags ? body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
  };
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
    console.error('Error fetching products:', error);
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
    console.error('Error fetching products for retailers:', error);
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
    console.error('Error fetching product:', error);
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
    console.log('Creating product with data:', req.body);
    
    let imageUrls = [];
    
    // Upload images to Cloudinary if any
    if (req.files && req.files.length > 0) {
      console.log(`Uploading ${req.files.length} images to Cloudinary`);
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = results;
      console.log('Images uploaded successfully:', imageUrls.length);
    }

    // Parse and validate form data
    const parsedData = parseFormData(req.body);
    
    // Validate required fields
    if (!parsedData.name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (!parsedData.category) {
      return res.status(400).json({
        success: false,
        message: 'Product category is required'
      });
    }

    if (parsedData.quantity === undefined || parsedData.quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    // Validate pricing
    try {
      validatePricing(parsedData.purchasingPrice, parsedData.sellingPrice);
    } catch (pricingError) {
      return res.status(400).json({
        success: false,
        message: pricingError.message
      });
    }

    const productData = {
      ...parsedData,
      wholesaler: req.user.id,
      images: imageUrls,
      fromCertifiedOrder: false // Ensure manually created products are not marked as certified
    };

    console.log('Creating product with data:', productData);

    const product = new Product(productData);
    await product.save();

    console.log('Product created successfully:', product._id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

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
    console.log('Updating product:', req.params.id);
    console.log('Update data:', req.body);

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
      console.log(`Uploading ${req.files.length} new images`);
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file, req.user.id)
      );
      
      const results = await Promise.all(uploadPromises);
      imageUrls = [...imageUrls, ...results];
    }

    // Parse form data
    const parsedData = parseFormData(req.body);

    // Validate pricing if provided
    let purchasingPrice = product.purchasingPrice;
    let sellingPrice = product.sellingPrice;
    
    if (parsedData.purchasingPrice !== undefined) {
      purchasingPrice = parsedData.purchasingPrice;
    }
    
    if (parsedData.sellingPrice !== undefined) {
      sellingPrice = parsedData.sellingPrice;
    }
    
    try {
      validatePricing(purchasingPrice, sellingPrice);
    } catch (pricingError) {
      return res.status(400).json({
        success: false,
        message: pricingError.message
      });
    }

    const updateData = {
      ...parsedData,
      purchasingPrice: purchasingPrice,
      sellingPrice: sellingPrice,
      images: imageUrls
    };

    // Prevent updating certified order source for manually created products
    if (!product.fromCertifiedOrder) {
      delete updateData.fromCertifiedOrder;
      delete updateData.certifiedOrderSource;
    }

    console.log('Final update data:', updateData);

    product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('Product updated successfully');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

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
      console.log(`Deleting ${product.images.length} images from Cloudinary`);
      const deletePromises = product.images.map(image => {
        return cloudinary.uploader.destroy(image.publicId);
      });
      
      await Promise.all(deletePromises);
    }

    await Product.findByIdAndDelete(req.params.id);

    console.log('Product deleted successfully:', req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
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
      categories: categories || []
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
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
    console.error('Error deleting product image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// Get products with low stock alert
exports.getLowStockProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const filter = { 
      wholesaler: req.user.id,
      isActive: true,
      lowStockAlert: true
    };

    const products = await Product.find(filter)
      .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
      .sort({ lowStockAlertAt: -1, quantity: 1 })
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
    console.error('Error fetching low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock products',
      error: error.message
    });
  }
};

// Get products statistics for dashboard
exports.getProductStats = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    
    const totalProducts = await Product.countDocuments({
      wholesaler: wholesalerId,
      isActive: true
    });

    const lowStockProducts = await Product.countDocuments({
      wholesaler: wholesalerId,
      isActive: true,
      lowStockAlert: true
    });

    const outOfStockProducts = await Product.countDocuments({
      wholesaler: wholesalerId,
      isActive: true,
      quantity: 0
    });

    const certifiedProducts = await Product.countDocuments({
      wholesaler: wholesalerId,
      isActive: true,
      fromCertifiedOrder: true
    });

    // Calculate total inventory value and potential profit
    const inventoryStats = await Product.aggregate([
      {
        $match: {
          wholesaler: mongoose.Types.ObjectId(wholesalerId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalInventoryValue: { 
            $sum: { $multiply: ['$quantity', '$purchasingPrice'] } 
          },
          totalPotentialProfit: { 
            $sum: { $multiply: ['$quantity', { $subtract: ['$sellingPrice', '$purchasingPrice'] }] } 
          },
          averageProfitMargin: {
            $avg: {
              $cond: [
                { $eq: ['$purchasingPrice', 0] },
                0,
                { $multiply: [{ $divide: [{ $subtract: ['$sellingPrice', '$purchasingPrice'] }, '$purchasingPrice'] }, 100] }
              ]
            }
          }
        }
      }
    ]);

    const stats = inventoryStats[0] || {
      totalInventoryValue: 0,
      totalPotentialProfit: 0,
      averageProfitMargin: 0
    };

    res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        certifiedProducts,
        totalInventoryValue: stats.totalInventoryValue || 0,
        totalPotentialProfit: stats.totalPotentialProfit || 0,
        averageProfitMargin: stats.averageProfitMargin || 0
      }
    });
  } catch (error) {
    console.error('Error fetching product statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product statistics',
      error: error.message
    });
  }
};

// Update product stock
exports.updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, operation = 'set' } = req.body; // operation: 'set', 'add', 'subtract'

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

    let newQuantity = product.quantity;
    
    switch (operation) {
      case 'add':
        newQuantity += parseInt(quantity);
        break;
      case 'subtract':
        newQuantity = Math.max(0, newQuantity - parseInt(quantity));
        break;
      case 'set':
      default:
        newQuantity = parseInt(quantity);
        break;
    }

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    product.quantity = newQuantity;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product stock updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product stock:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating product stock',
      error: error.message
    });
  }
};

// Bulk update products
exports.bulkUpdateProducts = async (req, res) => {
  try {
    const { products } = req.body; // Array of { productId, updates }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }

    const updatePromises = products.map(async (item) => {
      const product = await Product.findOne({
        _id: item.productId,
        wholesaler: req.user.id
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // Validate pricing if provided
      if (item.updates.purchasingPrice !== undefined || item.updates.sellingPrice !== undefined) {
        const purchasingPrice = item.updates.purchasingPrice !== undefined 
          ? parseFloat(item.updates.purchasingPrice) 
          : product.purchasingPrice;
        
        const sellingPrice = item.updates.sellingPrice !== undefined 
          ? parseFloat(item.updates.sellingPrice) 
          : product.sellingPrice;
        
        validatePricing(purchasingPrice, sellingPrice);
      }

      return Product.findByIdAndUpdate(
        item.productId,
        { ...item.updates },
        { new: true, runValidators: true }
      );
    });

    const updatedProducts = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Products updated successfully',
      products: updatedProducts
    });
  } catch (error) {
    console.error('Error bulk updating products:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating products',
      error: error.message
    });
  }
};

// Search products with advanced filters
exports.searchProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      minQuantity, 
      maxQuantity,
      hasBulkDiscount,
      tags,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    
    const filter = { 
      wholesaler: req.user.id,
      isActive: true
    };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.sellingPrice = {};
      if (minPrice !== undefined) filter.sellingPrice.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) filter.sellingPrice.$lte = parseFloat(maxPrice);
    }

    if (minQuantity !== undefined || maxQuantity !== undefined) {
      filter.quantity = {};
      if (minQuantity !== undefined) filter.quantity.$gte = parseInt(minQuantity);
      if (maxQuantity !== undefined) filter.quantity.$lte = parseInt(maxQuantity);
    }

    if (hasBulkDiscount !== undefined) {
      filter.bulkDiscount = hasBulkDiscount === 'true';
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('certifiedOrderSource.supplierId', 'businessName firstName lastName')
      .sort(sortOptions)
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
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching products',
      error: error.message
    });
  }
};

// Health check endpoint
exports.healthCheck = async (req, res) => {
  try {
    const productCount = await Product.countDocuments({ wholesaler: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'Product service is healthy',
      data: {
        totalProducts: productCount,
        service: 'Product Management',
        status: 'Operational'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Product service health check failed',
      error: error.message
    });
  }
};