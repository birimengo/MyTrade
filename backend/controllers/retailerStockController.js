const RetailerStock = require('../models/RetailerStock');

// Get retailer stocks
exports.getRetailerStocks = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, lowStock } = req.query;
    
    const filter = { retailer: req.user.id, isActive: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }

    if (lowStock === 'true') {
      filter.lowStockAlert = true;
    }

    const stocks = await RetailerStock.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RetailerStock.countDocuments(filter);

    res.status(200).json({
      success: true,
      stocks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get retailer stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stocks',
      error: error.message
    });
  }
};

// Create retailer stock
exports.createRetailerStock = async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      measurementUnit,
      unitPrice,
      minStockLevel,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !category || !quantity || !measurementUnit || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, quantity, measurement unit, and unit price are required'
      });
    }

    // Calculate values
    const quantityNum = parseFloat(quantity);
    const unitPriceNum = parseFloat(unitPrice);
    const totalValue = quantityNum * unitPriceNum;
    const minStockLevelNum = minStockLevel ? parseFloat(minStockLevel) : 0;
    
    // Check if stock is below minimum level OR below 50% of original quantity
    const isBelowMinLevel = quantityNum <= minStockLevelNum;
    const isBelowHalfOriginal = quantityNum <= (quantityNum * 0.5); // For new stock, original = current
    
    const lowStockAlert = isBelowMinLevel || isBelowHalfOriginal;

    const stock = new RetailerStock({
      retailer: req.user.id,
      name,
      category,
      quantity: quantityNum,
      originalQuantity: quantityNum, // Set original quantity to initial quantity
      measurementUnit,
      unitPrice: unitPriceNum,
      totalValue,
      minStockLevel: minStockLevelNum,
      notes,
      lowStockAlert
    });

    await stock.save();

    res.status(201).json({
      success: true,
      message: 'Stock item created successfully',
      stock
    });

  } catch (error) {
    console.error('Create retailer stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating stock',
      error: error.message
    });
  }
};

// Update retailer stock
exports.updateRetailerStock = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      quantity,
      measurementUnit,
      unitPrice,
      minStockLevel,
      notes,
      isActive
    } = req.body;

    const stock = await RetailerStock.findById(id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }

    // Check if user owns this stock
    if (stock.retailer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this stock item'
      });
    }

    // Update fields
    if (name !== undefined) stock.name = name;
    if (category !== undefined) stock.category = category;
    if (quantity !== undefined) stock.quantity = parseFloat(quantity);
    if (measurementUnit !== undefined) stock.measurementUnit = measurementUnit;
    if (unitPrice !== undefined) stock.unitPrice = parseFloat(unitPrice);
    if (minStockLevel !== undefined) stock.minStockLevel = parseFloat(minStockLevel);
    if (notes !== undefined) stock.notes = notes;
    if (isActive !== undefined) stock.isActive = isActive;

    // Recalculate total value - low stock alert will be handled by pre-save middleware
    stock.totalValue = stock.quantity * stock.unitPrice;

    await stock.save();

    res.status(200).json({
      success: true,
      message: 'Stock item updated successfully',
      stock
    });

  } catch (error) {
    console.error('Update retailer stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating stock',
      error: error.message
    });
  }
};

// Delete retailer stock (soft delete)
exports.deleteRetailerStock = async (req, res) => {
  try {
    const { id } = req.params;

    const stock = await RetailerStock.findById(id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }

    // Check if user owns this stock
    if (stock.retailer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this stock item'
      });
    }

    // Soft delete by setting isActive to false
    stock.isActive = false;
    await stock.save();

    res.status(200).json({
      success: true,
      message: 'Stock item deleted successfully'
    });

  } catch (error) {
    console.error('Delete retailer stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting stock',
      error: error.message
    });
  }
};

// Get stock statistics
exports.getStockStatistics = async (req, res) => {
  try {
    const retailerId = req.user.id;

    const statistics = await RetailerStock.aggregate([
      { $match: { retailer: retailerId, isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const lowStockCount = await RetailerStock.countDocuments({
      retailer: retailerId,
      isActive: true,
      lowStockAlert: true
    });

    const totalStocks = await RetailerStock.countDocuments({
      retailer: retailerId,
      isActive: true
    });

    const totalValue = await RetailerStock.aggregate([
      { $match: { retailer: retailerId, isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);

    res.status(200).json({
      success: true,
      statistics,
      lowStockCount,
      totalStocks,
      totalValue: totalValue[0]?.total || 0
    });

  } catch (error) {
    console.error('Get stock statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
      error: error.message
    });
  }
};

// Restock and update original quantity
exports.restock = async (req, res) => {
  try {
    const { id } = req.params;
    const { newQuantity } = req.body;

    if (!newQuantity || newQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid new quantity is required'
      });
    }

    const stock = await RetailerStock.findById(id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }

    // Check if user owns this stock
    if (stock.retailer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this stock item'
      });
    }

    // Update both quantity and original quantity
    stock.quantity = parseFloat(newQuantity);
    stock.originalQuantity = parseFloat(newQuantity);
    
    // The lowStockAlert will be automatically recalculated in pre-save middleware

    await stock.save();

    res.status(200).json({
      success: true,
      message: 'Stock restocked successfully',
      stock
    });

  } catch (error) {
    console.error('Restock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while restocking',
      error: error.message
    });
  }
};