// backend/routes/conversations.js
const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get or create conversation
router.post('/', [
  body('participantId').isMongoId().withMessage('Valid participant ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { participantId } = req.body;
    const userId = req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (userId === participantId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself'
      });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Check communication permissions based on roles
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if communication is allowed between these roles
    const allowed = checkCommunicationPermission(currentUser.role, participant.role);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Communication not allowed between these roles'
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] }
    }).populate('participants', 'firstName lastName businessName role');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, participantId]
      });
      
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'firstName lastName businessName role');
    }
    
    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get user conversations with pagination and sorting
router.get('/', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20, sortBy = 'lastMessageAt', sortOrder = 'desc' } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'firstName lastName businessName role')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

    const totalConversations = await Conversation.countDocuments({
      participants: userId
    });

    res.json({
      success: true,
      conversations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalConversations,
        pages: Math.ceil(totalConversations / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get messages for a conversation with pagination
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Verify user is part of the conversation
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'firstName lastName businessName')
      .sort({ createdAt: -1 }) // Get latest messages first
      .skip(skip)
      .limit(limitNum);

    const totalMessages = await Message.countDocuments({ conversationId });

    res.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Mark messages as read
router.patch('/:conversationId/messages/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId }, // Messages not sent by this user
        readBy: { $ne: userId } // Not already read by this user
      },
      {
        $addToSet: { readBy: userId }
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get conversation by ID
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    }).populate('participants', 'firstName lastName businessName role');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete conversation (soft delete for participants)
router.delete('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // For now, we'll just remove the user from participants
    // In a real app, you might want to implement proper archiving
    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        participants: userId
      },
      {
        $pull: { participants: userId }
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // If no participants left, delete the conversation
    if (conversation.participants.length === 0) {
      await Conversation.findByIdAndDelete(conversationId);
      await Message.deleteMany({ conversationId });
    }

    res.json({
      success: true,
      message: 'Conversation removed'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get unread message count for user
router.get('/user/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;

    const unreadCount = await Message.countDocuments({
      conversationId: { $in: await Conversation.find({ participants: userId }).distinct('_id') },
      senderId: { $ne: userId },
      readBy: { $ne: userId }
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Helper function to check communication permissions
function checkCommunicationPermission(userRole, targetRole) {
  const permissions = {
    retailer: ['wholesaler', 'transporter'],
    wholesaler: ['retailer', 'supplier', 'transporter'],
    supplier: ['wholesaler', 'transporter'],
    transporter: ['retailer', 'wholesaler', 'supplier'],
    admin: ['retailer', 'wholesaler', 'supplier', 'transporter'] // Admin can communicate with everyone
  };

  return permissions[userRole]?.includes(targetRole) || false;
}

module.exports = router;