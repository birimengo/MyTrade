// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_order',
      'order_status_update',
      'order_assigned',
      'order_delivered',
      'order_disputed',
      'order_return',
      'system_alert',
      'chat_message'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create new order notification
notificationSchema.statics.createOrderNotification = async function(wholesalerId, orderData, retailerInfo) {
  return await this.create({
    user: wholesalerId,
    type: 'new_order',
    title: 'New Order Received',
    message: `New order for ${orderData.quantity} ${orderData.measurementUnit} of ${orderData.productName} from ${retailerInfo}`,
    data: {
      orderId: orderData.orderId,
      productName: orderData.productName,
      quantity: orderData.quantity,
      retailerName: retailerInfo,
      totalPrice: orderData.totalPrice,
      status: 'pending'
    },
    priority: 'high'
  });
};

module.exports = mongoose.model('Notification', notificationSchema);