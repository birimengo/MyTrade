const RetailerReceipt = require('../models/RetailerReceipt');
const RetailerSales = require('../models/RetailerSales');
const mongoose = require('mongoose');

// Create a new receipt
exports.createReceipt = async (req, res) => {
  try {
    const { saleIds, customerName, customerPhone, customerEmail, taxAmount = 0, discountAmount = 0, paymentMethod = 'cash', notes } = req.body;

    // Validate required fields
    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sale IDs are required and must be a non-empty array'
      });
    }

    // Validate sale IDs
    const validSaleIds = saleIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validSaleIds.length !== saleIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale ID format'
      });
    }

    // Fetch the selected sales
    const sales = await RetailerSales.find({
      _id: { $in: validSaleIds },
      retailer: req.user.id
    });

    if (sales.length !== saleIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some sales records were not found or you are not authorized to access them'
      });
    }

    // Calculate totals with safe number handling
    const subtotal = sales.reduce((total, sale) => {
      const quantity = Number(sale.quantity) || 0;
      const sellingPrice = Number(sale.sellingPrice) || 0;
      return total + (quantity * sellingPrice);
    }, 0);

    const totalQuantity = sales.reduce((total, sale) => total + (Number(sale.quantity) || 0), 0);
    const safeTaxAmount = Number(taxAmount) || 0;
    const safeDiscountAmount = Number(discountAmount) || 0;
    const grandTotal = subtotal - safeDiscountAmount + safeTaxAmount;

    // Generate receipt number (format: RCPT-YYYYMMDD-XXXXX)
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const receiptNumber = `RCPT-${datePart}-${randomPart}`;

    // Prepare items array with safe number handling
    const items = sales.map(sale => ({
      productName: sale.productName || 'Unknown Product',
      productId: sale.productId,
      quantity: Number(sale.quantity) || 0,
      measurementUnit: sale.measurementUnit || 'units',
      unitPrice: Number(sale.sellingPrice) || 0,
      totalPrice: (Number(sale.quantity) || 0) * (Number(sale.sellingPrice) || 0)
    }));

    // Create receipt
    const receipt = new RetailerReceipt({
      retailer: req.user.id,
      receiptNumber,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      items,
      subtotal,
      taxAmount: safeTaxAmount,
      discountAmount: safeDiscountAmount,
      grandTotal,
      totalQuantity,
      saleIds: validSaleIds,
      paymentMethod,
      notes: notes || ''
    });

    await receipt.save();

    // Populate the receipt with sales data for response
    const populatedReceipt = await RetailerReceipt.findById(receipt._id)
      .populate('saleIds', 'productName quantity sellingPrice measurementUnit saleDate productId');

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      receipt: populatedReceipt,
      formattedReceipt: populatedReceipt.getFormattedReceipt()
    });

  } catch (error) {
    console.error('Create receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating receipt',
      error: error.message
    });
  }
};

// Get all receipts for retailer with enhanced filtering and error handling
exports.getReceipts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      status,
      paymentMethod,
      sortBy = 'receiptDate',
      sortOrder = 'desc'
    } = req.query;
    
    const filter = { retailer: req.user.id };
    
    // Date filter with validation
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      
      filter.receiptDate = {
        $gte: start,
        $lte: end
      };
    }

    // Status filter
    if (status && ['active', 'cancelled', 'refunded'].includes(status)) {
      filter.status = status;
    }

    // Payment method filter
    if (paymentMethod && ['cash', 'card', 'digital_wallet', 'bank_transfer', 'other'].includes(paymentMethod)) {
      filter.paymentMethod = paymentMethod;
    }

    const sortOptions = {};
    const sortField = ['receiptDate', 'receiptNumber', 'subtotal', 'grandTotal'].includes(sortBy) ? sortBy : 'receiptDate';
    sortOptions[sortField] = sortOrder === 'desc' ? -1 : 1;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const receipts = await RetailerReceipt.find(filter)
      .populate('saleIds', 'productName quantity sellingPrice measurementUnit saleDate productId')
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await RetailerReceipt.countDocuments(filter);

    // Get formatted receipts with error handling
    const formattedReceipts = receipts.map(receipt => {
      try {
        return receipt.getFormattedReceipt ? receipt.getFormattedReceipt() : receipt.toObject();
      } catch (error) {
        console.error('Error formatting receipt:', error);
        // Return basic receipt data if formatting fails
        return {
          id: receipt._id,
          receiptNumber: receipt.receiptNumber,
          receiptDate: receipt.receiptDate,
          customerName: receipt.customerName,
          customerPhone: receipt.customerPhone,
          subtotal: receipt.subtotal || 0,
          grandTotal: receipt.grandTotal || 0,
          totalQuantity: receipt.totalQuantity || 0,
          status: receipt.status || 'active',
          paymentMethod: receipt.paymentMethod || 'cash',
          items: receipt.items || []
        };
      }
    });

    res.status(200).json({
      success: true,
      receipts: receipts,
      formattedReceipts: formattedReceipts,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total: total,
      hasNextPage: pageNum * limitNum < total,
      hasPrevPage: pageNum > 1
    });

  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching receipts',
      error: error.message
    });
  }
};

// Get single receipt by ID with error handling
exports.getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt ID format'
      });
    }

    const receipt = await RetailerReceipt.findOne({
      _id: id,
      retailer: req.user.id
    }).populate('saleIds', 'productName quantity sellingPrice measurementUnit saleDate productId');

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    let formattedReceipt;
    try {
      formattedReceipt = receipt.getFormattedReceipt ? receipt.getFormattedReceipt() : receipt.toObject();
    } catch (error) {
      console.error('Error formatting receipt:', error);
      formattedReceipt = receipt.toObject();
    }

    res.status(200).json({
      success: true,
      receipt: receipt,
      formattedReceipt: formattedReceipt
    });

  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching receipt',
      error: error.message
    });
  }
};

// Get receipt by receipt number
exports.getReceiptByNumber = async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    if (!receiptNumber || receiptNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Receipt number is required'
      });
    }

    const receipt = await RetailerReceipt.findOne({
      receiptNumber: receiptNumber.trim(),
      retailer: req.user.id
    }).populate('saleIds', 'productName quantity sellingPrice measurementUnit saleDate productId');

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    let formattedReceipt;
    try {
      formattedReceipt = receipt.getFormattedReceipt ? receipt.getFormattedReceipt() : receipt.toObject();
    } catch (error) {
      console.error('Error formatting receipt:', error);
      formattedReceipt = receipt.toObject();
    }

    res.status(200).json({
      success: true,
      receipt: receipt,
      formattedReceipt: formattedReceipt
    });

  } catch (error) {
    console.error('Get receipt by number error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching receipt',
      error: error.message
    });
  }
};

// Delete receipt with validation
exports.deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt ID format'
      });
    }

    const receipt = await RetailerReceipt.findOne({
      _id: id,
      retailer: req.user.id
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    if (hardDelete) {
      // Permanent delete
      await RetailerReceipt.deleteOne({ _id: id });
    } else {
      // Soft delete (mark as cancelled)
      receipt.status = 'cancelled';
      await receipt.save();
    }

    res.status(200).json({
      success: true,
      message: `Receipt ${hardDelete ? 'deleted' : 'cancelled'} successfully`
    });

  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting receipt',
      error: error.message
    });
  }
};

// Get receipt statistics with error handling
exports.getReceiptStatistics = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const matchStage = { retailer: retailerId, status: 'active' };
    
    // Date filter with validation
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        matchStage.receiptDate = {
          $gte: start,
          $lte: end
        };
      }
    }

    const statistics = await RetailerReceipt.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          totalSalesAmount: { $sum: '$grandTotal' },
          totalSubtotal: { $sum: '$subtotal' },
          totalTaxAmount: { $sum: '$taxAmount' },
          totalDiscountAmount: { $sum: '$discountAmount' },
          totalItemsSold: { $sum: '$totalQuantity' },
          averageReceiptValue: { $avg: '$grandTotal' },
          maxReceiptValue: { $max: '$grandTotal' },
          minReceiptValue: { $min: '$grandTotal' }
        }
      }
    ]);

    const dailyStats = await RetailerReceipt.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$receiptDate" }
          },
          date: { $first: "$receiptDate" },
          dailyReceipts: { $sum: 1 },
          dailySales: { $sum: '$grandTotal' },
          dailyItems: { $sum: '$totalQuantity' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    const paymentMethodStats = await RetailerReceipt.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    const defaultStats = {
      totalReceipts: 0,
      totalSalesAmount: 0,
      totalSubtotal: 0,
      totalTaxAmount: 0,
      totalDiscountAmount: 0,
      totalItemsSold: 0,
      averageReceiptValue: 0,
      maxReceiptValue: 0,
      minReceiptValue: 0
    };

    res.status(200).json({
      success: true,
      statistics: statistics[0] || defaultStats,
      dailyStats: dailyStats || [],
      paymentMethodStats: paymentMethodStats || []
    });

  } catch (error) {
    console.error('Get receipt statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching receipt statistics',
      error: error.message
    });
  }
};

// Get recent receipts
exports.getRecentReceipts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 5));

    const receipts = await RetailerReceipt.find({ 
      retailer: req.user.id,
      status: 'active'
    })
    .populate('saleIds', 'productName quantity sellingPrice measurementUnit saleDate')
    .sort({ receiptDate: -1 })
    .limit(limitNum);

    const formattedReceipts = receipts.map(receipt => {
      try {
        return receipt.getFormattedReceipt ? receipt.getFormattedReceipt() : receipt.toObject();
      } catch (error) {
        console.error('Error formatting receipt:', error);
        return receipt.toObject();
      }
    });

    res.status(200).json({
      success: true,
      receipts: formattedReceipts,
      total: receipts.length
    });

  } catch (error) {
    console.error('Get recent receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent receipts',
      error: error.message
    });
  }
};

// Search receipts with validation
exports.searchReceipts = async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchQuery = query.trim();
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

    const searchFilter = {
      retailer: req.user.id,
      $or: [
        { receiptNumber: { $regex: searchQuery, $options: 'i' } },
        { customerName: { $regex: searchQuery, $options: 'i' } },
        { customerPhone: { $regex: searchQuery, $options: 'i' } },
        { 'items.productName': { $regex: searchQuery, $options: 'i' } }
      ]
    };

    const receipts = await RetailerReceipt.find(searchFilter)
      .populate('saleIds', 'productName quantity sellingPrice measurementUnit saleDate')
      .sort({ receiptDate: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await RetailerReceipt.countDocuments(searchFilter);

    const formattedReceipts = receipts.map(receipt => {
      try {
        return receipt.getFormattedReceipt ? receipt.getFormattedReceipt() : receipt.toObject();
      } catch (error) {
        console.error('Error formatting receipt:', error);
        return receipt.toObject();
      }
    });

    res.status(200).json({
      success: true,
      receipts: formattedReceipts,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total: total,
      searchQuery: searchQuery
    });

  } catch (error) {
    console.error('Search receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching receipts',
      error: error.message
    });
  }
};

// Export receipts
exports.exportReceipts = async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    
    const filter = { retailer: req.user.id, status: 'active' };
    
    // Date filter with validation
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        filter.receiptDate = {
          $gte: start,
          $lte: end
        };
      }
    }

    const receipts = await RetailerReceipt.find(filter)
      .populate('saleIds', 'productName quantity sellingPrice measurementUnit saleDate')
      .sort({ receiptDate: -1 });

    if (format === 'csv') {
      // Simple CSV export implementation
      const csvData = receipts.map(receipt => ({
        receiptNumber: receipt.receiptNumber,
        date: receipt.receiptDate.toISOString().split('T')[0],
        customerName: receipt.customerName,
        customerPhone: receipt.customerPhone,
        totalAmount: receipt.grandTotal,
        totalItems: receipt.totalQuantity,
        paymentMethod: receipt.paymentMethod,
        status: receipt.status
      }));

      res.status(200).json({
        success: true,
        format: 'csv',
        data: csvData,
        total: receipts.length,
        message: 'CSV data prepared successfully'
      });
    } else {
      // JSON export (default)
      const formattedReceipts = receipts.map(receipt => {
        try {
          return receipt.getFormattedReceipt ? receipt.getFormattedReceipt() : receipt.toObject();
        } catch (error) {
          console.error('Error formatting receipt:', error);
          return receipt.toObject();
        }
      });
      
      res.status(200).json({
        success: true,
        format: 'json',
        receipts: formattedReceipts,
        total: receipts.length
      });
    }

  } catch (error) {
    console.error('Export receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting receipts',
      error: error.message
    });
  }
};