const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Todo = require('../models/Todo');
const User = require('../models/User');
const router = express.Router();

// Helper function for recurring tasks - calculate next recurrence
function calculateNextRecurrence(dueDate, pattern) {
  if (!dueDate) return null;
  
  const nextDate = new Date(dueDate);
  
  switch (pattern) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return nextDate;
}

// Helper function to create next recurrence
async function createNextRecurrence(todo) {
  try {
    if (!todo.isRecurring || !todo.recurrencePattern) return;

    const nextRecurrenceDate = calculateNextRecurrence(todo.dueDate, todo.recurrencePattern);
    
    if (!nextRecurrenceDate) return;

    const nextTodoData = {
      ...todo.toObject(),
      _id: new mongoose.Types.ObjectId(),
      title: todo.title,
      status: 'pending',
      dueDate: nextRecurrenceDate,
      reminderDate: todo.reminderDate ? calculateNextRecurrence(todo.reminderDate, todo.recurrencePattern) : null,
      completedAt: null,
      reminderSent: false,
      lastReminderSent: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    delete nextTodoData._id;
    
    const nextTodo = new Todo(nextTodoData);
    await nextTodo.save();

    // Update the original todo with next recurrence
    await Todo.findByIdAndUpdate(todo._id, {
      nextRecurrence: nextRecurrenceDate
    });

    return nextTodo;
  } catch (error) {
    console.error('❌ Error creating next recurrence:', error);
    throw error;
  }
}

// GET /api/todo - Get all todos with advanced filtering, search, and pagination
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 GET /api/todo - Query params:', req.query);
    console.log('🔍 GET /api/todo - User ID:', req.user.id);
    
    const { 
      page = 1, 
      limit = 50, 
      status, 
      priority, 
      category, 
      search,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;
    
    // Validate and sanitize inputs
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    
    // Build filter object
    const filter = { user: req.user.id };
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Priority filter
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    
    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Search filter
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    const validSortFields = ['title', 'priority', 'status', 'category', 'dueDate', 'createdAt', 'updatedAt'];
    const validSortField = validSortFields.includes(sortBy) ? sortBy : 'dueDate';
    const validSortOrder = sortOrder === 'desc' ? -1 : 1;
    sortConfig[validSortField] = validSortOrder;

    console.log('🔍 GET /api/todo - Final filter:', JSON.stringify(filter, null, 2));

    // Execute query with pagination
    const todos = await Todo.find(filter)
      .sort(sortConfig)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const total = await Todo.countDocuments(filter);

    console.log(`🔍 GET /api/todo - Found ${todos.length} todos out of ${total} total`);

    res.status(200).json({
      success: true,
      todos: todos,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todos',
      error: 'Internal server error'
    });
  }
});

// GET /api/todo/stats/summary - Get comprehensive todo statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get basic counts using simple queries instead of aggregation
    const total = await Todo.countDocuments({ user: req.user.id });
    const completed = await Todo.countDocuments({ 
      user: req.user.id, 
      status: 'completed' 
    });
    const pending = await Todo.countDocuments({ 
      user: req.user.id, 
      status: 'pending' 
    });
    const inProgress = await Todo.countDocuments({ 
      user: req.user.id, 
      status: 'in-progress' 
    });

    // Get overdue count
    const overdue = await Todo.countDocuments({
      user: req.user.id,
      status: { $in: ['pending', 'in-progress'] },
      dueDate: { $lt: new Date() }
    });

    // Get due today count
    const dueToday = await Todo.countDocuments({
      user: req.user.id,
      status: { $in: ['pending', 'in-progress'] },
      dueDate: { 
        $gte: today, 
        $lt: tomorrow 
      }
    });

    // Get completion trends
    const completedToday = await Todo.countDocuments({
      user: req.user.id,
      status: 'completed',
      completedAt: { $gte: today }
    });

    const completedThisWeek = await Todo.countDocuments({
      user: req.user.id,
      status: 'completed',
      completedAt: { $gte: startOfWeek }
    });

    // Get breakdowns using simple aggregation
    const priorityCounts = await Todo.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const categoryCounts = await Todo.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const stats = {
      summary: {
        total,
        completed,
        pending,
        inProgress,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      },
      overdue: overdue,
      dueToday: dueToday,
      completionTrends: {
        today: completedToday,
        thisWeek: completedThisWeek,
        thisMonth: 0,
        thisYear: 0
      },
      breakdown: {
        byStatus: [
          { _id: 'pending', count: pending },
          { _id: 'in-progress', count: inProgress },
          { _id: 'completed', count: completed },
          { _id: 'cancelled', count: await Todo.countDocuments({ user: req.user.id, status: 'cancelled' }) }
        ],
        byPriority: priorityCounts,
        byCategory: categoryCounts
      },
      timeMetrics: {
        totalEstimatedHours: 0,
        tasksWithTimeEstimate: 0,
        averageCompletionTime: null
      }
    };

    res.status(200).json({
      success: true,
      stats: stats,
      timeframe: {
        generatedAt: new Date(),
        today: today
      }
    });
  } catch (error) {
    console.error('❌ Error fetching todo stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todo statistics',
      error: 'Internal server error'
    });
  }
});

// GET /api/todo/:id - Get single todo
router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID format'
      });
    }

    const todo = await Todo.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    res.status(200).json({
      success: true,
      todo: todo
    });
  } catch (error) {
    console.error('❌ Error fetching todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todo',
      error: 'Internal server error'
    });
  }
});

// POST /api/todo - Create new todo
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category = 'general',
      priority = 'medium',
      status = 'pending',
      dueDate,
      reminderDate,
      tags,
      estimatedTime,
      estimatedUnit = 'hours'
    } = req.body;

    // Validate required fields
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Todo title is required'
      });
    }

    // Prepare todo data
    const todoData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      category,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      reminderDate: reminderDate ? new Date(reminderDate) : null,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')) : [],
      user: req.user.id
    };

    // Handle estimated time
    if (estimatedTime && !isNaN(parseInt(estimatedTime))) {
      todoData.estimatedTime = {
        value: parseInt(estimatedTime),
        unit: estimatedUnit
      };
    }

    const todo = new Todo(todoData);
    await todo.save();

    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      todo
    });
  } catch (error) {
    console.error('❌ Error creating todo:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create todo',
      error: 'Internal server error'
    });
  }
});

// PUT /api/todo/:id - Update todo
router.put('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID format'
      });
    }

    const todo = await Todo.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const allowedUpdates = [
      'title', 'description', 'category', 'priority', 'status',
      'dueDate', 'reminderDate', 'tags', 'estimatedTime'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle tags conversion
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    }

    // Handle estimated time
    if (updates.estimatedTime !== undefined) {
      if (updates.estimatedTime && !isNaN(parseInt(updates.estimatedTime))) {
        updates.estimatedTime = {
          value: parseInt(updates.estimatedTime),
          unit: req.body.estimatedUnit || 'hours'
        };
      } else if (updates.estimatedTime === null || updates.estimatedTime === '') {
        updates.estimatedTime = undefined;
      }
    }

    // Handle status changes
    if (updates.status === 'completed' && todo.status !== 'completed') {
      updates.completedAt = new Date();
    }

    const updatedTodo = await Todo.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Todo updated successfully',
      todo: updatedTodo
    });
  } catch (error) {
    console.error('❌ Error updating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update todo',
      error: 'Internal server error'
    });
  }
});

// DELETE /api/todo/:id - Delete todo
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID format'
      });
    }

    const todo = await Todo.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    await Todo.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo',
      error: 'Internal server error'
    });
  }
});

// POST /api/todo/:id/complete - Mark todo as completed
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const todo = await Todo.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    if (todo.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Todo is already completed'
      });
    }

    const updatedTodo = await Todo.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Todo marked as completed',
      todo: updatedTodo
    });
  } catch (error) {
    console.error('❌ Error completing todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete todo',
      error: 'Internal server error'
    });
  }
});

// POST /api/todo/:id/reopen - Reopen completed todo
router.post('/:id/reopen', auth, async (req, res) => {
  try {
    const todo = await Todo.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    if (todo.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Todo is not completed'
      });
    }

    const updatedTodo = await Todo.findByIdAndUpdate(
      req.params.id,
      {
        status: 'pending',
        completedAt: null
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Todo reopened successfully',
      todo: updatedTodo
    });
  } catch (error) {
    console.error('❌ Error reopening todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reopen todo',
      error: 'Internal server error'
    });
  }
});

// Additional endpoints for future use (simplified versions)

// GET /api/todo/overdue - Get overdue todos
router.get('/overdue', auth, async (req, res) => {
  try {
    const overdueTodos = await Todo.find({
      user: req.user.id,
      dueDate: { $lt: new Date() },
      status: { $in: ['pending', 'in-progress'] }
    })
    .sort({ dueDate: 1 })
    .lean();

    res.status(200).json({
      success: true,
      todos: overdueTodos,
      count: overdueTodos.length
    });
  } catch (error) {
    console.error('❌ Error fetching overdue todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue todos',
      error: 'Internal server error'
    });
  }
});

// GET /api/todo/upcoming - Get upcoming todos
router.get('/upcoming', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    const upcomingTodos = await Todo.find({
      user: req.user.id,
      status: { $in: ['pending', 'in-progress'] },
      dueDate: { 
        $gte: today,
        $lte: nextWeek
      }
    })
    .sort({ dueDate: 1 })
    .lean();

    res.status(200).json({
      success: true,
      todos: upcomingTodos,
      count: upcomingTodos.length
    });
  } catch (error) {
    console.error('❌ Error fetching upcoming todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming todos',
      error: 'Internal server error'
    });
  }
});

module.exports = router;