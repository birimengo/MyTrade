// backend/routes/messages.js
const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// Upload file message to Cloudinary (supports images, documents, and audio)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 File upload request received:', {
      conversationId: req.body.conversationId,
      senderId: req.body.senderId,
      duration: req.body.duration,
      hasFile: !!req.file
    });

    const { conversationId, senderId, duration } = req.body;
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📁 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId
    });

    if (!conversation) {
      console.log('❌ User not authorized for conversation:', { conversationId, senderId });
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

    console.log('📝 Detected message type:', messageType);

    // Upload to Cloudinary with appropriate resource type
    let cloudinaryOptions = {
      public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    };

    // Set resource type for Cloudinary
    if (messageType === 'audio') {
      cloudinaryOptions.resource_type = 'video'; // Cloudinary uses 'video' for audio files
    } else if (messageType === 'image') {
      cloudinaryOptions.resource_type = 'image';
    } else {
      cloudinaryOptions.resource_type = 'raw'; // For documents
    }

    console.log('☁️ Uploading to Cloudinary with options:', cloudinaryOptions);

    const result = await uploadToCloudinary(req.file.buffer, cloudinaryOptions);

    console.log('✅ Cloudinary upload result:', {
      url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes
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

    console.log('💾 Saving message to database:', {
      type: messageData.type,
      content: messageData.content,
      duration: messageData.duration
    });

    // Save message to database
    const message = await Message.create(messageData);

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message.content,
      lastMessageAt: new Date()
    });

    // Populate sender info
    await message.populate('senderId', 'firstName lastName businessName');

    console.log('✅ Message saved successfully:', message._id);

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('❌ Error uploading file to Cloudinary:', error);
    
    // Handle specific error cases
    if (error.message.includes('Video files are not allowed')) {
      return res.status(415).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('File type not allowed')) {
      return res.status(415).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('File too large')) {
      return res.status(413).json({
        success: false,
        message: 'File size too large. Maximum size is 15MB.'
      });
    }
    
    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Server error uploading file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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