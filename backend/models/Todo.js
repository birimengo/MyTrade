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
  },
  // WhatsApp specific fields
  whatsappReminderSent: {
    type: Boolean,
    default: false
  },
  whatsappReminderCount: {
    type: Number,
    default: 0
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
todoSchema.index({ reminderDate: 1, whatsappReminderSent: 1 });

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
  
  const now = new Date();
  const reminderTime = new Date(this.reminderDate);
  
  // Send reminder if current time is past reminder time
  return now >= reminderTime;
};

// Method to check if WhatsApp reminder should be sent
todoSchema.methods.shouldSendWhatsAppReminder = function() {
  if (!this.reminderDate || this.whatsappReminderSent || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  const reminderTime = new Date(this.reminderDate);
  
  // Send WhatsApp reminder if current time is past reminder time
  return now >= reminderTime;
};

// Static method to get overdue todos
todoSchema.statics.getOverdueTodos = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $in: ['pending', 'in-progress'] },
    reminderSent: false
  }).populate('user');
};

// ADD THIS MISSING METHOD - FIXES THE ERROR
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

// Static method to get todos that need reminders NOW
todoSchema.statics.getPendingReminders = function() {
  const now = new Date();
  
  return this.find({
    $or: [
      {
        // Reminders that are due now
        reminderDate: { 
          $lte: now,
          $gte: new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes
        },
        reminderSent: false,
        status: { $in: ['pending', 'in-progress'] }
      },
      {
        // WhatsApp reminders that are due now
        reminderDate: { 
          $lte: now,
          $gte: new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes
        },
        whatsappReminderSent: false,
        status: { $in: ['pending', 'in-progress'] }
      }
    ]
  }).populate('user');
};

// Static method to get todos for WhatsApp reminders
todoSchema.statics.getWhatsAppReminders = function() {
  const now = new Date();
  
  return this.find({
    reminderDate: { 
      $lte: now,
      $gte: new Date(now.getTime() - 10 * 60 * 1000) // Last 10 minutes
    },
    whatsappReminderSent: false,
    status: { $in: ['pending', 'in-progress'] }
  }).populate('user');
};

// Method to mark reminder as sent
todoSchema.methods.markReminderSent = function() {
  this.reminderSent = true;
  this.lastReminderSent = new Date();
  return this.save();
};

// Method to mark WhatsApp reminder as sent
todoSchema.methods.markWhatsAppReminderSent = function() {
  this.whatsappReminderSent = true;
  this.whatsappReminderCount += 1;
  this.lastReminderSent = new Date();
  return this.save();
};

// Pre-save middleware to handle reminder logic
todoSchema.pre('save', function(next) {
  // If reminder date is in the past and not sent, reset it to allow sending
  if (this.reminderDate && new Date(this.reminderDate) < new Date() && !this.reminderSent) {
    this.reminderSent = false;
    this.whatsappReminderSent = false;
  }
  
  next();
});

module.exports = mongoose.model('Todo', todoSchema);