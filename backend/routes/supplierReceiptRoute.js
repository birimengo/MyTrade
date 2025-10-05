const express = require('express');
const router = express.Router();
const Receipt = require('../models/supplierReceipts');
const SupplierSale = require('../models/SupplierSale');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// ========== RECEIPT CRUD OPERATIONS ==========

// POST /api/supplier-receipts - Create a new receipt
router.post('/', async (req, res) => {
  try {
    const { saleIds, receiptDate, notes, paymentMethod } = req.body;

    console.log('Creating receipt with sale IDs:', saleIds);

    // Validate input
    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid sale IDs to create a receipt'
      });
    }

    // Verify all sales exist and belong to the supplier
    const sales = await SupplierSale.find({ 
      _id: { $in: saleIds },
      supplier: req.user.id 
    }).populate('items.productId', 'name category sku measurementUnit');

    if (sales.length !== saleIds.length) {
      const foundIds = sales.map(sale => sale._id.toString());
      const missingIds = saleIds.filter(id => !foundIds.includes(id));
      
      return res.status(400).json({
        success: false,
        message: `Some sales were not found or do not belong to you. Missing: ${missingIds.join(', ')}`
      });
    }

    // Check if any sales are already included in other receipts
    const existingReceipts = await Receipt.find({
      sales: { $in: saleIds },
      status: 'active'
    });

    if (existingReceipts.length > 0) {
      const receiptNumbers = existingReceipts.map(r => r.receiptNumber);
      return res.status(400).json({
        success: false,
        message: `Some sales are already included in receipts: ${receiptNumbers.join(', ')}`
      });
    }

    // Calculate totals
    const totalAmount = sales.reduce((total, sale) => total + sale.totalAmount, 0);
    const totalProfit = sales.reduce((total, sale) => total + sale.totalProfit, 0);
    const totalTax = sales.reduce((total, sale) => total + (sale.taxAmount || 0), 0);
    const totalDiscount = sales.reduce((total, sale) => total + (sale.discountAmount || 0), 0);

    // Determine payment method
    const paymentMethods = [...new Set(sales.map(sale => sale.paymentMethod))];
    const finalPaymentMethod = paymentMethod || (paymentMethods.length > 1 ? 'multiple' : paymentMethods[0] || 'cash');

    // Extract customer details from first sale
    const customerDetails = sales.length > 0 ? sales[0].customerDetails : {};

    // Create receipt using static method
    const receipt = await Receipt.createReceipt({
      supplier: req.user.id,
      sales: saleIds,
      receiptDate: receiptDate || new Date(),
      totalAmount,
      totalProfit,
      totalTax,
      totalDiscount,
      paymentMethod: finalPaymentMethod,
      customerDetails,
      notes: notes || `Receipt for ${saleIds.length} sale(s) totaling $${totalAmount.toFixed(2)}`,
      createdBy: req.user.id
    });

    // Populate sales for response
    await receipt.populate('sales');

    console.log('✅ Receipt created successfully:', receipt.receiptNumber);

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      receipt
    });

  } catch (error) {
    console.error('❌ Error creating receipt:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Receipt number already exists. Please try again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create receipt: ' + error.message
    });
  }
});

// GET /api/supplier-receipts - Get all receipts for supplier with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { supplier: req.user.id };
    
    // Date range filter
    if (startDate || endDate) {
      filter.receiptDate = {};
      if (startDate) filter.receiptDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.receiptDate.$lte = end;
      }
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const receipts = await Receipt.find(filter)
      .populate('sales')
      .populate('createdBy', 'name email')
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Receipt.countDocuments(filter);

    // Calculate summary statistics
    const stats = await Receipt.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          totalTax: { $sum: '$totalTax' },
          totalDiscount: { $sum: '$totalDiscount' },
          activeReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          cancelledReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const summary = stats[0] || {
      totalReceipts: 0,
      totalAmount: 0,
      totalProfit: 0,
      totalTax: 0,
      totalDiscount: 0,
      activeReceipts: 0,
      cancelledReceipts: 0
    };

    res.json({
      success: true,
      receipts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalReceipts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      summary
    });

  } catch (error) {
    console.error('❌ Error fetching receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipts: ' + error.message
    });
  }
});

// GET /api/supplier-receipts/:id - Get single receipt details
router.get('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      supplier: req.user.id
    }).populate({
      path: 'sales',
      populate: {
        path: 'items.productId',
        select: 'name category sku measurementUnit images productionPrice'
      }
    }).populate('createdBy', 'name email');

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Calculate additional details
    const itemsCount = await receipt.itemsCount;
    const salesCount = receipt.salesCount;
    const totalItemsQuantity = await receipt.totalItemsQuantity;

    res.json({
      success: true,
      receipt: {
        ...receipt.toObject(),
        itemsCount,
        salesCount,
        totalItemsQuantity
      }
    });

  } catch (error) {
    console.error('❌ Error fetching receipt details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt details: ' + error.message
    });
  }
});

// PUT /api/supplier-receipts/:id - Update receipt
router.put('/:id', async (req, res) => {
  try {
    const { notes, status, receiptDate, paymentStatus } = req.body;

    const receipt = await Receipt.findOne({
      _id: req.params.id,
      supplier: req.user.id
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Update fields
    if (notes !== undefined) receipt.notes = notes;
    if (status !== undefined) receipt.status = status;
    if (receiptDate !== undefined) receipt.receiptDate = receiptDate;
    if (paymentStatus !== undefined) receipt.paymentStatus = paymentStatus;
    
    receipt.updatedAt = new Date();

    await receipt.save();
    await receipt.populate('sales');

    res.json({
      success: true,
      message: 'Receipt updated successfully',
      receipt
    });

  } catch (error) {
    console.error('❌ Error updating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update receipt: ' + error.message
    });
  }
});

// DELETE /api/supplier-receipts/:id - Cancel/void receipt
router.delete('/:id', async (req, res) => {
  try {
    const { reason } = req.body;

    const receipt = await Receipt.findOne({
      _id: req.params.id,
      supplier: req.user.id
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    if (receipt.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Receipt is already cancelled'
      });
    }

    // Update receipt status
    receipt.status = 'cancelled';
    receipt.notes = receipt.notes + `\n[VOIDED on ${new Date().toISOString()}] Reason: ${reason || 'No reason provided'}`;
    receipt.updatedAt = new Date();

    await receipt.save();

    res.json({
      success: true,
      message: 'Receipt cancelled successfully',
      receipt
    });

  } catch (error) {
    console.error('❌ Error cancelling receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel receipt: ' + error.message
    });
  }
});

// ========== RECEIPT ANALYTICS & REPORTS ==========

// GET /api/supplier-receipts/analytics/summary - Get receipt analytics summary
router.get('/analytics/summary', async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const supplierId = req.user.id;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const analytics = await Receipt.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'active',
          receiptDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          totalTax: { $sum: '$totalTax' },
          totalDiscount: { $sum: '$totalDiscount' },
          averageReceiptValue: { $avg: '$totalAmount' },
          maxReceiptValue: { $max: '$totalAmount' },
          minReceiptValue: { $min: '$totalAmount' },
          totalSalesIncluded: { $sum: { $size: '$sales' } }
        }
      }
    ]);

    // Payment method distribution
    const paymentDistribution = await Receipt.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'active',
          receiptDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          averageAmount: { $avg: '$totalAmount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Monthly trend
    const monthlyTrend = await Receipt.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'active',
          receiptDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$receiptDate' },
            month: { $month: '$receiptDate' }
          },
          receiptCount: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          totalSales: { $sum: { $size: '$sales' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const result = analytics[0] || {
      totalReceipts: 0,
      totalAmount: 0,
      totalProfit: 0,
      totalTax: 0,
      totalDiscount: 0,
      averageReceiptValue: 0,
      maxReceiptValue: 0,
      minReceiptValue: 0,
      totalSalesIncluded: 0
    };

    res.json({
      success: true,
      analytics: {
        ...result,
        paymentDistribution,
        monthlyTrend,
        timeframe
      }
    });

  } catch (error) {
    console.error('❌ Error fetching receipt analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt analytics: ' + error.message
    });
  }
});

// GET /api/supplier-receipts/export/data - Export receipts data
router.get('/export/data', async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    const supplierId = req.user.id;

    const filter = { supplier: supplierId, status: 'active' };

    if (startDate || endDate) {
      filter.receiptDate = {};
      if (startDate) filter.receiptDate.$gte = new Date(startDate);
      if (endDate) filter.receiptDate.$lte = new Date(endDate);
    }

    const receipts = await Receipt.find(filter)
      .populate('sales')
      .populate('createdBy', 'name')
      .sort({ receiptDate: -1 });

    if (format === 'json') {
      return res.json({
        success: true,
        data: receipts,
        exportInfo: {
          totalReceipts: receipts.length,
          totalAmount: receipts.reduce((sum, r) => sum + r.totalAmount, 0),
          totalProfit: receipts.reduce((sum, r) => sum + r.totalProfit, 0),
          dateRange: { startDate, endDate },
          exportedAt: new Date().toISOString()
        }
      });
    }

    // CSV Export
    const csvHeaders = [
      'Receipt Number',
      'Receipt Date',
      'Total Amount',
      'Total Profit',
      'Total Tax',
      'Total Discount',
      'Sales Count',
      'Payment Method',
      'Customer Name',
      'Customer Email',
      'Status',
      'Created By',
      'Notes',
      'Created Date'
    ];

    const csvData = receipts.map(receipt => [
      receipt.receiptNumber,
      receipt.receiptDate.toISOString().split('T')[0],
      receipt.totalAmount,
      receipt.totalProfit,
      receipt.totalTax || 0,
      receipt.totalDiscount || 0,
      receipt.sales.length,
      receipt.paymentMethod,
      receipt.customerDetails?.name || '',
      receipt.customerDetails?.email || '',
      receipt.status,
      receipt.createdBy?.name || 'System',
      receipt.notes,
      receipt.createdAt.toISOString().split('T')[0]
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=receipts-export-${Date.now()}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('❌ Error exporting receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export receipts: ' + error.message
    });
  }
});

// GET /api/supplier-receipts/search/sales - Search sales for receipt creation
router.get('/search/sales', async (req, res) => {
  try {
    const { query, startDate, endDate, excludeReceipts = true } = req.query;
    const supplierId = req.user.id;

    const saleFilter = { 
      supplier: supplierId, 
      status: 'completed' 
    };

    // Date range
    if (startDate || endDate) {
      saleFilter.saleDate = {};
      if (startDate) saleFilter.saleDate.$gte = new Date(startDate);
      if (endDate) saleFilter.saleDate.$lte = new Date(endDate);
    }

    // Text search
    if (query) {
      saleFilter.$or = [
        { saleNumber: { $regex: query, $options: 'i' } },
        { 'customerDetails.name': { $regex: query, $options: 'i' } },
        { 'customerDetails.email': { $regex: query, $options: 'i' } },
        { 'items.productName': { $regex: query, $options: 'i' } }
      ];
    }

    let sales = await SupplierSale.find(saleFilter)
      .populate('items.productId', 'name category sku')
      .sort({ saleDate: -1 })
      .limit(50);

    // Exclude sales that are already included in active receipts
    if (excludeReceipts) {
      const receiptSales = await Receipt.find({
        supplier: supplierId,
        status: 'active'
      }).select('sales');

      const excludedSaleIds = receiptSales.flatMap(receipt => receipt.sales);
      sales = sales.filter(sale => !excludedSaleIds.includes(sale._id.toString()));
    }

    res.json({
      success: true,
      sales,
      totalCount: sales.length
    });

  } catch (error) {
    console.error('❌ Error searching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search sales: ' + error.message
    });
  }
});

// ========== BULK RECEIPT OPERATIONS ==========

// POST /api/supplier-receipts/bulk/create - Create multiple receipts
router.post('/bulk/create', async (req, res) => {
  try {
    const { receiptsData } = req.body;

    if (!receiptsData || !Array.isArray(receiptsData)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid receipts data array'
      });
    }

    const createdReceipts = [];
    const errors = [];

    for (const receiptData of receiptsData) {
      try {
        const { saleIds, notes } = receiptData;

        // Verify sales exist and belong to supplier
        const sales = await SupplierSale.find({
          _id: { $in: saleIds },
          supplier: req.user.id
        });

        if (sales.length !== saleIds.length) {
          errors.push(`Some sales not found for receipt batch`);
          continue;
        }

        // Calculate totals
        const totalAmount = sales.reduce((total, sale) => total + sale.totalAmount, 0);
        const totalProfit = sales.reduce((total, sale) => total + sale.totalProfit, 0);

        // Create receipt
        const receipt = await Receipt.createReceipt({
          supplier: req.user.id,
          sales: saleIds,
          totalAmount,
          totalProfit,
          notes: notes || `Bulk receipt for ${saleIds.length} sale(s)`,
          createdBy: req.user.id
        });

        await receipt.populate('sales');
        createdReceipts.push(receipt);

      } catch (error) {
        errors.push(`Error creating receipt: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdReceipts.length} receipts, ${errors.length} errors`,
      receipts: createdReceipts,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error bulk creating receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create receipts: ' + error.message
    });
  }
});

// PUT /api/supplier-receipts/bulk/status - Bulk update receipt status
router.put('/bulk/status', async (req, res) => {
  try {
    const { receiptIds, status, reason } = req.body;

    if (!receiptIds || !Array.isArray(receiptIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid receipt IDs'
      });
    }

    const updateResult = await Receipt.updateMany(
      { 
        _id: { $in: receiptIds },
        supplier: req.user.id 
      },
      { 
        $set: { 
          status: status,
          updatedAt: new Date()
        },
        $push: {
          notes: `Bulk status update: ${status} on ${new Date().toISOString()}. Reason: ${reason || 'No reason provided'}`
        }
      }
    );

    res.json({
      success: true,
      message: `Updated ${updateResult.modifiedCount} receipts to ${status}`,
      updatedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error bulk updating receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update receipts: ' + error.message
    });
  }
});

module.exports = router;