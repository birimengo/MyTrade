// models/Todo.js
const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Todo title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: true,
    enum: [
      'general', 
      'sales', 
      'inventory', 
      'customer', 
      'financial', 
      'marketing', 
      'maintenance',
      'personal',
      'work',
      'shopping',
      'health'
    ],
    default: 'general'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: false
  },
  reminderDate: {
    type: Date,
    required: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderSent: {
    type: Date,
    required: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  estimatedTime: {
    value: {
      type: Number,
      min: 0
    },
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'hours'
    }
  },
  completedAt: {
    type: Date,
    required: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relatedSaleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: false
  },
  // For recurring tasks
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null
  },
  nextRecurrence: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Index for better query performance
todoSchema.index({ user: 1, dueDate: 1 });
todoSchema.index({ user: 1, status: 1 });
todoSchema.index({ user: 1, priority: 1 });
todoSchema.index({ reminderDate: 1, reminderSent: 1 });
todoSchema.index({ dueDate: 1, status: 1 });

// Virtual for overdue status
todoSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Method to check if reminder should be sent
todoSchema.methods.shouldSendReminder = function() {
  if (!this.reminderDate || this.reminderSent || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() >= this.reminderDate;
};

// Static method to get overdue todos
todoSchema.statics.getOverdueTodos = function(userId) {
  return this.find({
    user: userId,
    dueDate: { $lt: new Date() },
    status: { $in: ['pending', 'in-progress'] }
  });
};

// Static method to get upcoming reminders
todoSchema.statics.getUpcomingReminders = function(minutes = 30) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
  
  return this.find({
    reminderDate: {
      $lte: futureTime,
      $gte: now
    },
    reminderSent: false,
    status: { $in: ['pending', 'in-progress'] }
  }).populate('user');
};

module.exports = mongoose.model('Todo', todoSchema);