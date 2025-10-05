const WholesalerOrderToSupplier = require('../models/WholesalerOrderToSupplier');

// Get all orders for supplier
const getSupplierOrders = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { supplier: supplierId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await WholesalerOrderToSupplier.find(query)
      .populate('wholesaler', 'businessName firstName lastName email phone')
      .populate('items.product', 'name description images measurementUnit')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WholesalerOrderToSupplier.countDocuments(query);

    // Get statistics
    const statistics = await WholesalerOrderToSupplier.aggregate([
      { $match: { supplier: mongoose.Types.ObjectId(supplierId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          in_production: { $sum: { $cond: [{ $eq: ['$status', 'in_production'] }, 1, 0] } },
          ready_for_delivery: { $sum: { $cond: [{ $eq: ['$status', 'ready_for_delivery'] }, 1, 0] } },
          shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      orders,
      statistics: statistics[0] || {
        total: 0, pending: 0, confirmed: 0, in_production: 0,
        ready_for_delivery: 0, shipped: 0, delivered: 0, cancelled: 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total
      }
    });

  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

// Get single order details
const getSupplierOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const supplierId = req.user.id;

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    })
    .populate('wholesaler', 'businessName firstName lastName email phone address')
    .populate('items.product', 'name description images measurementUnit category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order details'
    });
  }
};

// Update order status
const updateSupplierOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const supplierId = req.user.id;

    const validStatuses = ['pending', 'confirmed', 'in_production', 'ready_for_delivery', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await WholesalerOrderToSupplier.findOne({
      _id: orderId,
      supplier: supplierId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

// Get order statistics
const getSupplierOrderStatistics = async (req, res) => {
  try {
    const supplierId = req.user.id;

    const statistics = await WholesalerOrderToSupplier.aggregate([
      { $match: { supplier: mongoose.Types.ObjectId(supplierId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          in_production: { $sum: { $cond: [{ $eq: ['$status', 'in_production'] }, 1, 0] } },
          ready_for_delivery: { $sum: { $cond: [{ $eq: ['$status', 'ready_for_delivery'] }, 1, 0] } },
          shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalRevenue: { $sum: '$finalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      statistics: statistics[0] || {
        total: 0, pending: 0, confirmed: 0, in_production: 0,
        ready_for_delivery: 0, shipped: 0, delivered: 0, cancelled: 0,
        totalRevenue: 0
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

module.exports = {
  getSupplierOrders,
  getSupplierOrderDetails,
  updateSupplierOrderStatus,
  getSupplierOrderStatistics
};