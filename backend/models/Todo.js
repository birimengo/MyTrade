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
      'maintenance'
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
  }
}, {
  timestamps: true
});

// Index for better query performance
todoSchema.index({ user: 1, dueDate: 1 });
todoSchema.index({ user: 1, status: 1 });
todoSchema.index({ user: 1, priority: 1 });

module.exports = mongoose.model('Todo', todoSchema);