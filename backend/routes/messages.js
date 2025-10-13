// backend/routes/messages.js
const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// Upload file message to Cloudinary (supports images, documents, and audio)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { conversationId, senderId, duration } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this conversation'
      });
    }

    // Determine file type based on MIME type
    let messageType = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (req.file.mimetype.startsWith('audio/')) {
      messageType = 'audio';
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    });

    // Create message data
    const messageData = {
      conversationId,
      senderId,
      type: messageType,
      fileUrl: result.secure_url,
      fileName: req.file.originalname,
      fileSize: result.bytes,
      fileType: req.file.mimetype,
      cloudinaryPublicId: result.public_id
    };

    // Add duration for audio messages
    if (messageType === 'audio' && duration) {
      messageData.duration = parseFloat(duration);
    }

    // Set appropriate content based on file type
    if (messageType === 'image') {
      messageData.content = `Sent an image: ${req.file.originalname}`;
    } else if (messageType === 'audio') {
      messageData.content = `Sent a voice message`;
    } else {
      messageData.content = `Sent a file: ${req.file.originalname}`;
    }

    // Save message to database
    const message = await Message.create(messageData);

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message.content,
      lastMessageAt: new Date()
    });

    // Populate sender info
    await message.populate('senderId', 'firstName lastName businessName');

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    
    if (error.message.includes('Video files are not allowed')) {
      return res.status(415).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'File type not allowed') {
      return res.status(415).json({
        success: false,
        message: 'File type not supported. Please upload images, documents, or audio files only.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error uploading file'
    });
  }
});

// Get message by ID
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId)
      .populate('senderId', 'firstName lastName businessName');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching message'
    });
  }
});

// Delete message (soft delete)
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user is the sender
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    // For file messages, delete from Cloudinary too
    if (message.type !== 'text' && message.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(message.cloudinaryPublicId);
      } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        // Continue with message deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete message from database
    await Message.findByIdAndDelete(messageId);
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting message'
    });
  }
});

module.exports = router;