const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Todo = require('../models/Todo');
const User = require('../models/User');
const router = express.Router();

// GET /api/todo - Get all todos with advanced filtering, search, and pagination
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      priority, 
      category, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      showOverdue = false,
      dueDateFrom,
      dueDateTo
    } = req.query;
    
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

    // Search filter - search in title, description, category, and tags
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    // Date range filter
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }

    // Overdue filter
    if (showOverdue === 'true') {
      filter.dueDate = { ...filter.dueDate, $lt: new Date() };
      filter.status = { $in: ['pending', 'in-progress'] };
    }

    // Sort configuration
    const sortConfig = {};
    const validSortFields = ['title', 'priority', 'status', 'category', 'dueDate', 'createdAt', 'updatedAt'];
    const validSortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortConfig[validSortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const todos = await Todo.find(filter)
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'firstName lastName email phone')
      .populate('relatedSaleId', 'referenceNumber customerName grandTotal')
      .lean();

    const total = await Todo.countDocuments(filter);

    // Add virtual isOverdue field to each todo
    const todosWithOverdue = todos.map(todo => ({
      ...todo,
      isOverdue: todo.dueDate && 
                 new Date(todo.dueDate) < new Date() && 
                 !['completed', 'cancelled'].includes(todo.status)
    }));

    res.status(200).json({
      success: true,
      todos: todosWithOverdue,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        status,
        priority,
        category,
        search,
        sortBy: validSortField,
        sortOrder
      }
    });
  } catch (error) {
    console.error('❌ Error fetching todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/todo/overdue - Get overdue todos with pagination
router.get('/overdue', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const overdueTodos = await Todo.find({
      user: req.user.id,
      dueDate: { $lt: new Date() },
      status: { $in: ['pending', 'in-progress'] }
    })
    .populate('user', 'firstName lastName email phone')
    .populate('relatedSaleId', 'referenceNumber customerName grandTotal')
    .sort({ dueDate: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

    const total = await Todo.countDocuments({
      user: req.user.id,
      dueDate: { $lt: new Date() },
      status: { $in: ['pending', 'in-progress'] }
    });

    res.status(200).json({
      success: true,
      todos: overdueTodos,
      count: overdueTodos.length,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching overdue todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue todos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/todo/upcoming - Get upcoming todos (next 7 days)
router.get('/upcoming', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
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
    .populate('user', 'firstName lastName email phone')
    .populate('relatedSaleId', 'referenceNumber customerName grandTotal')
    .sort({ dueDate: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

    const total = await Todo.countDocuments({
      user: req.user.id,
      status: { $in: ['pending', 'in-progress'] },
      dueDate: { 
        $gte: today,
        $lte: nextWeek
      }
    });

    res.status(200).json({
      success: true,
      todos: upcomingTodos,
      count: upcomingTodos.length,
      dateRange: {
        from: today,
        to: nextWeek
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching upcoming todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming todos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/todo/reminders/upcoming - Get todos with upcoming reminders (next 24 hours)
router.get('/reminders/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const reminderTodos = await Todo.find({
      user: req.user.id,
      reminderDate: {
        $gte: now,
        $lte: next24Hours
      },
      reminderSent: false,
      status: { $in: ['pending', 'in-progress'] }
    })
    .populate('user', 'firstName lastName email phone')
    .populate('relatedSaleId', 'referenceNumber customerName grandTotal')
    .sort({ reminderDate: 1 })
    .lean();

    res.status(200).json({
      success: true,
      todos: reminderTodos,
      count: reminderTodos.length,
      timeRange: {
        from: now,
        to: next24Hours
      }
    });
  } catch (error) {
    console.error('❌ Error fetching reminder todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminder todos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/todo/stats/summary - Get comprehensive todo statistics and analytics
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

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const stats = await Todo.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $facet: {
          // Basic counts
          totalCount: [{ $count: 'count' }],
          
          // Status breakdown
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          
          // Priority breakdown
          priorityCounts: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 }
              }
            }
          ],
          
          // Category breakdown
          categoryCounts: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 }
              }
            }
          ],
          
          // Overdue count
          overdueCount: [
            {
              $match: {
                status: { $in: ['pending', 'in-progress'] },
                dueDate: { $lt: new Date() }
              }
            },
            { $count: 'count' }
          ],
          
          // Due today count
          dueTodayCount: [
            {
              $match: {
                status: { $in: ['pending', 'in-progress'] },
                dueDate: { $gte: today, $lt: tomorrow }
              }
            },
            { $count: 'count' }
          ],
          
          // Completion stats
          completedToday: [
            {
              $match: {
                status: 'completed',
                completedAt: { $gte: today }
              }
            },
            { $count: 'count' }
          ],
          
          completedThisWeek: [
            {
              $match: {
                status: 'completed',
                completedAt: { $gte: startOfWeek }
              }
            },
            { $count: 'count' }
          ],
          
          completedThisMonth: [
            {
              $match: {
                status: 'completed',
                completedAt: { $gte: startOfMonth }
              }
            },
            { $count: 'count' }
          ],
          
          completedThisYear: [
            {
              $match: {
                status: 'completed',
                completedAt: { $gte: startOfYear }
              }
            },
            { $count: 'count' }
          ],
          
          // Time estimates
          totalTimeEstimated: [
            {
              $match: {
                'estimatedTime.value': { $exists: true, $gt: 0 }
              }
            },
            {
              $group: {
                _id: null,
                totalHours: {
                  $sum: {
                    $switch: {
                      branches: [
                        { 
                          case: { $eq: ['$estimatedTime.unit', 'hours'] }, 
                          then: '$estimatedTime.value' 
                        },
                        { 
                          case: { $eq: ['$estimatedTime.unit', 'minutes'] }, 
                          then: { $divide: ['$estimatedTime.value', 60] } 
                        },
                        { 
                          case: { $eq: ['$estimatedTime.unit', 'days'] }, 
                          then: { $multiply: ['$estimatedTime.value', 24] } 
                        }
                      ],
                      default: 0
                    }
                  }
                },
                taskCount: { $sum: 1 }
              }
            }
          ],
          
          // Average completion time
          completionStats: [
            {
              $match: {
                status: 'completed',
                completedAt: { $exists: true },
                createdAt: { $exists: true }
              }
            },
            {
              $addFields: {
                completionTimeHours: {
                  $divide: [
                    { $subtract: ['$completedAt', '$createdAt'] },
                    1000 * 60 * 60
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgCompletionTime: { $avg: '$completionTimeHours' },
                minCompletionTime: { $min: '$completionTimeHours' },
                maxCompletionTime: { $max: '$completionTimeHours' },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // Process aggregation results
    const result = stats[0];
    
    const totalTodos = result.totalCount[0]?.count || 0;
    const completedTodos = result.statusCounts.find(s => s._id === 'completed')?.count || 0;
    const pendingTodos = result.statusCounts.find(s => s._id === 'pending')?.count || 0;
    const inProgressTodos = result.statusCounts.find(s => s._id === 'in-progress')?.count || 0;

    const response = {
      summary: {
        total: totalTodos,
        completed: completedTodos,
        pending: pendingTodos,
        inProgress: inProgressTodos,
        completionRate: totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0
      },
      overdue: {
        count: result.overdueCount[0]?.count || 0,
        percentage: totalTodos > 0 ? Math.round((result.overdueCount[0]?.count / totalTodos) * 100) : 0
      },
      dueToday: {
        count: result.dueTodayCount[0]?.count || 0
      },
      completionTrends: {
        today: result.completedToday[0]?.count || 0,
        thisWeek: result.completedThisWeek[0]?.count || 0,
        thisMonth: result.completedThisMonth[0]?.count || 0,
        thisYear: result.completedThisYear[0]?.count || 0
      },
      breakdown: {
        byStatus: result.statusCounts,
        byPriority: result.priorityCounts,
        byCategory: result.categoryCounts
      },
      timeMetrics: {
        totalEstimatedHours: Math.round(result.totalTimeEstimated[0]?.totalHours || 0),
        tasksWithTimeEstimate: result.totalTimeEstimated[0]?.taskCount || 0,
        averageCompletionTime: result.completionStats[0] ? {
          hours: Math.round(result.completionStats[0].avgCompletionTime * 100) / 100,
          min: Math.round(result.completionStats[0].minCompletionTime * 100) / 100,
          max: Math.round(result.completionStats[0].maxCompletionTime * 100) / 100,
          sampleSize: result.completionStats[0].count
        } : null
      },
      productivity: {
        completedPerWeek: result.completedThisWeek[0]?.count || 0,
        completionRateThisWeek: result.completedThisWeek[0]?.count > 0 ? 
          Math.round((result.completedThisWeek[0].count / (result.completedThisWeek[0].count + result.overdueCount[0]?.count)) * 100) : 0
      }
    };

    res.status(200).json({
      success: true,
      stats: response,
      timeframe: {
        generatedAt: new Date(),
        today: today,
        weekStart: startOfWeek,
        monthStart: startOfMonth
      }
    });
  } catch (error) {
    console.error('❌ Error fetching todo stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todo statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/todo/:id - Get single todo with detailed information
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
    })
    .populate('user', 'firstName lastName email phone')
    .populate('relatedSaleId', 'referenceNumber customerName grandTotal saleDate items');

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found or you do not have permission to access it'
      });
    }

    // Calculate additional fields
    const todoWithCalculatedFields = {
      ...todo.toObject(),
      isOverdue: todo.dueDate && 
                 new Date(todo.dueDate) < new Date() && 
                 !['completed', 'cancelled'].includes(todo.status),
      daysUntilDue: todo.dueDate ? 
                   Math.ceil((new Date(todo.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 
                   null,
      completionTime: todo.completedAt && todo.createdAt ? 
                     (new Date(todo.completedAt) - new Date(todo.createdAt)) / (1000 * 60 * 60 * 24) : 
                     null
    };

    res.status(200).json({
      success: true,
      todo: todoWithCalculatedFields
    });
  } catch (error) {
    console.error('❌ Error fetching todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/todo - Create new todo with comprehensive validation
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
      estimatedUnit = 'hours',
      isRecurring = false,
      recurrencePattern,
      relatedSaleId
    } = req.body;

    // Validate required fields
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Todo title is required and cannot be empty'
      });
    }

    // Validate category
    const validCategories = ['general', 'sales', 'inventory', 'customer', 'financial', 'marketing', 'maintenance', 'personal', 'work', 'shopping', 'health'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Validate status
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
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
      user: req.user.id,
      relatedSaleId: relatedSaleId || null
    };

    // Handle estimated time
    if (estimatedTime && !isNaN(parseInt(estimatedTime))) {
      todoData.estimatedTime = {
        value: parseInt(estimatedTime),
        unit: ['minutes', 'hours', 'days'].includes(estimatedUnit) ? estimatedUnit : 'hours'
      };
    }

    // Handle recurring tasks
    if (isRecurring && recurrencePattern) {
      const validRecurrencePatterns = ['daily', 'weekly', 'monthly', 'yearly'];
      if (!validRecurrencePatterns.includes(recurrencePattern)) {
        return res.status(400).json({
          success: false,
          message: `Invalid recurrence pattern. Must be one of: ${validRecurrencePatterns.join(', ')}`
        });
      }
      
      todoData.isRecurring = true;
      todoData.recurrencePattern = recurrencePattern;
      todoData.nextRecurrence = calculateNextRecurrence(dueDate, recurrencePattern);
    }

    const todo = new Todo(todoData);
    await todo.save();

    // Populate all related data for response
    await todo.populate('user', 'firstName lastName email phone');
    if (relatedSaleId) {
      await todo.populate('relatedSaleId', 'referenceNumber customerName grandTotal saleDate items');
    }

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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/todo/:id - Update todo with comprehensive validation
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
        message: 'Todo not found or you do not have permission to modify it'
      });
    }

    const allowedUpdates = [
      'title', 'description', 'category', 'priority', 'status',
      'dueDate', 'reminderDate', 'tags', 'estimatedTime', 'estimatedUnit',
      'isRecurring', 'recurrencePattern', 'reminderSent', 'relatedSaleId'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Validate title if provided
    if (updates.title && updates.title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Todo title cannot be empty'
      });
    }

    // Handle tags conversion from string to array
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    }

    // Handle estimated time object
    if (updates.estimatedTime !== undefined) {
      if (updates.estimatedTime && !isNaN(parseInt(updates.estimatedTime))) {
        updates.estimatedTime = {
          value: parseInt(updates.estimatedTime),
          unit: updates.estimatedUnit || todo.estimatedTime?.unit || 'hours'
        };
      } else if (updates.estimatedTime === null || updates.estimatedTime === '') {
        updates.estimatedTime = undefined;
      }
      delete updates.estimatedUnit;
    }

    // Handle status changes
    if (updates.status === 'completed' && todo.status !== 'completed') {
      updates.completedAt = new Date();
      updates.reminderSent = true; // No need for reminders for completed tasks
      
      // If it's a recurring task, create the next occurrence
      if (todo.isRecurring && todo.recurrencePattern) {
        await createNextRecurrence(todo);
      }
    }

    // If reopening from completed, clear completedAt
    if (updates.status !== 'completed' && todo.status === 'completed') {
      updates.completedAt = null;
      updates.reminderSent = false;
    }

    // If reminder date is updated, reset reminder sent status
    if (updates.reminderDate && updates.reminderDate !== todo.reminderDate) {
      updates.reminderSent = false;
      updates.lastReminderSent = null;
    }

    // Handle recurring task updates
    if (updates.isRecurring !== undefined || updates.recurrencePattern !== undefined) {
      if (updates.isRecurring && updates.recurrencePattern) {
        updates.nextRecurrence = calculateNextRecurrence(updates.dueDate || todo.dueDate, updates.recurrencePattern);
      } else if (!updates.isRecurring) {
        updates.recurrencePattern = null;
        updates.nextRecurrence = null;
      }
    }

    const updatedTodo = await Todo.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('user', 'firstName lastName email phone')
    .populate('relatedSaleId', 'referenceNumber customerName grandTotal saleDate items');

    res.status(200).json({
      success: true,
      message: 'Todo updated successfully',
      todo: updatedTodo
    });
  } catch (error) {
    console.error('❌ Error updating todo:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update todo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/todo/:id - Delete todo with confirmation
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
        message: 'Todo not found or you do not have permission to delete it'
      });
    }

    await Todo.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Todo deleted successfully',
      deletedTodo: {
        id: req.params.id,
        title: todo.title,
        category: todo.category
      }
    });
  } catch (error) {
    console.error('❌ Error deleting todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/todo/:id/duplicate - Duplicate todo with smart naming
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const todo = await Todo.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found or you do not have permission to duplicate it'
      });
    }

    // Create a duplicate without the _id and with "Copy" in title
    const duplicateData = { ...todo.toObject() };
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    
    // Smart title duplication - handle multiple copies
    const copySuffix = ' (Copy)';
    let newTitle = todo.title;
    
    if (todo.title.includes(copySuffix)) {
      const baseTitle = todo.title.replace(copySuffix, '');
      newTitle = `${baseTitle}${copySuffix}`;
    } else {
      newTitle = `${todo.title}${copySuffix}`;
    }
    
    duplicateData.title = newTitle;
    duplicateData.status = 'pending';
    duplicateData.reminderSent = false;
    duplicateData.lastReminderSent = null;
    duplicateData.completedAt = null;

    const duplicatedTodo = new Todo(duplicateData);
    await duplicatedTodo.save();

    await duplicatedTodo.populate('user', 'firstName lastName email phone');
    if (duplicatedTodo.relatedSaleId) {
      await duplicatedTodo.populate('relatedSaleId', 'referenceNumber customerName grandTotal saleDate items');
    }

    res.status(201).json({
      success: true,
      message: 'Todo duplicated successfully',
      todo: duplicatedTodo
    });
  } catch (error) {
    console.error('❌ Error duplicating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate todo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
        completedAt: new Date(),
        reminderSent: true
      },
      { new: true }
    )
    .populate('user', 'firstName lastName email phone')
    .populate('relatedSaleId', 'referenceNumber customerName grandTotal saleDate items');

    // If it's a recurring task, create the next occurrence
    if (todo.isRecurring && todo.recurrencePattern) {
      await createNextRecurrence(todo);
    }

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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
        completedAt: null,
        reminderSent: false
      },
      { new: true }
    )
    .populate('user', 'firstName lastName email phone')
    .populate('relatedSaleId', 'referenceNumber customerName grandTotal saleDate items');

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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/todo/search/suggestions - Get search suggestions
router.get('/search/suggestions', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const suggestions = await Todo.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { category: searchRegex },
            { tags: { $in: [searchRegex] } }
          ]
        }
      },
      {
        $project: {
          title: 1,
          category: 1,
          priority: 1,
          status: 1,
          score: {
            $cond: [
              { $regexMatch: { input: '$title', regex: searchRegex } },
              3,
              {
                $cond: [
                  { $regexMatch: { input: '$description', regex: searchRegex } },
                  2,
                  {
                    $cond: [
                      { $regexMatch: { input: '$category', regex: searchRegex } },
                      1,
                      0
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      { $sort: { score: -1, title: 1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      suggestions: suggestions.map(s => ({
        id: s._id,
        title: s.title,
        category: s.category,
        priority: s.priority,
        status: s.status
      })),
      query: q.trim()
    });
  } catch (error) {
    console.error('❌ Error fetching search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

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

module.exports = router;