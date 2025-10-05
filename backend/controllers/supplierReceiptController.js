const Receipt = require('../models/supplierReceipts');
const Sale = require('../models/supplierSales');

// You can also create a controller if you prefer that pattern
// This is an alternative to having the logic directly in routes

const receiptController = {
  // Create receipt
  createReceipt: async (req, res) => {
    try {
      const { saleIds, receiptDate, notes } = req.body;

      const sales = await Sale.find({ 
        _id: { $in: saleIds },
        supplier: req.user.id 
      });

      if (sales.length !== saleIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some sales were not found or do not belong to you'
        });
      }

      const totalAmount = sales.reduce((total, sale) => total + sale.totalAmount, 0);
      const totalProfit = sales.reduce((total, sale) => total + sale.totalProfit, 0);

      const receipt = new Receipt({
        supplier: req.user.id,
        sales: saleIds,
        receiptDate: receiptDate || new Date(),
        totalAmount,
        totalProfit,
        notes: notes || `Receipt for ${saleIds.length} sale(s)`
      });

      await receipt.save();
      await receipt.populate('sales');

      res.status(201).json({
        success: true,
        message: 'Receipt created successfully',
        receipt
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  },

  // Get all receipts
  getReceipts: async (req, res) => {
    try {
      const receipts = await Receipt.find({ supplier: req.user.id })
        .populate('sales')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        receipts
      });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  },

  // Get single receipt
  getReceipt: async (req, res) => {
    try {
      const receipt = await Receipt.findOne({
        _id: req.params.id,
        supplier: req.user.id
      }).populate('sales');

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      res.json({
        success: true,
        receipt
      });
    } catch (error) {
      console.error('Error fetching receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  },

  // Update receipt
  updateReceipt: async (req, res) => {
    try {
      const { notes, status } = req.body;
      
      const receipt = await Receipt.findOneAndUpdate(
        { _id: req.params.id, supplier: req.user.id },
        { notes, status },
        { new: true }
      ).populate('sales');

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      res.json({
        success: true,
        message: 'Receipt updated successfully',
        receipt
      });
    } catch (error) {
      console.error('Error updating receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  }
};

module.exports = receiptController;