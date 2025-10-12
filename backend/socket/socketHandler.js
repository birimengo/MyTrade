// backend/socket/socketHandler.js - Enhanced version
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const handleSocketConnection = (io) => {
  const onlineUsers = new Map(); // userId -> socketId
  const userSockets = new Map(); // userId -> Set of socketIds (for multiple devices)
  const typingUsers = new Map();
  const recordingUsers = new Map();

  const broadcastOnlineUsers = () => {
    const onlineUserIds = Array.from(onlineUsers.keys());
    io.emit('onlineUsers', onlineUserIds);
    console.log(`📊 Online users: ${onlineUserIds.length} users`);
  };

  const updateUserStatus = async (userId, isOnline) => {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: isOnline,
        lastSeen: new Date()
      });

      io.emit('userStatusChanged', {
        userId,
        isOnline,
        lastSeen: new Date()
      });

      console.log(`👤 User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.id);
    
    // Send immediate connection confirmation
    socket.emit('connected', { 
      socketId: socket.id, 
      message: 'Connected to server successfully' 
    });

    // Enhanced authentication with device tracking
    socket.on('authenticate', async (data) => {
      try {
        const userId = typeof data === 'string' ? data : data.userId;
        const deviceId = data.deviceId || socket.id;
        
        if (!userId) {
          socket.emit('authentication_failed', { message: 'User ID required' });
          return;
        }

        const user = await User.findById(userId);
        if (!user) {
          socket.emit('authentication_failed', { message: 'User not found' });
          return;
        }

        // Store user connection with device tracking
        socket.userId = userId;
        socket.deviceId = deviceId;
        
        onlineUsers.set(userId, socket.id);
        
        // Track multiple sockets per user
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        
        // Join user room and conversation rooms
        socket.join(userId);
        
        // Join user's conversations
        const conversations = await Conversation.find({ participants: userId });
        conversations.forEach(conv => {
          socket.join(conv._id.toString());
        });

        await updateUserStatus(userId, true);
        broadcastOnlineUsers();
        
        socket.emit('authenticated', { 
          success: true, 
          userId,
          onlineUsers: Array.from(onlineUsers.keys())
        });
        
        console.log(`✅ User ${userId} authenticated from device ${deviceId}`);
        
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication_failed', { message: error.message });
      }
    });

    // Enhanced message sending with better error handling
    socket.on('sendMessage', async (data, callback) => {
      try {
        console.log('📨 Processing message:', {
          conversationId: data.conversationId,
          senderId: data.senderId,
          type: data.type || 'text'
        });

        // Validate required fields
        if (!data.conversationId || !data.senderId) {
          const error = 'Missing required fields: conversationId and senderId are required';
          console.error(error);
          if (callback) callback({ success: false, error });
          socket.emit('message_error', { error });
          return;
        }

        // Verify conversation and authorization
        const conversation = await Conversation.findOne({
          _id: data.conversationId,
          participants: data.senderId
        }).populate('participants', '_id');

        if (!conversation) {
          const error = 'Conversation not found or user not authorized';
          console.error(error);
          if (callback) callback({ success: false, error });
          socket.emit('message_error', { error });
          return;
        }

        // Create message with proper file metadata
        const messageData = {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content || '',
          type: data.type || 'text',
          fileUrl: data.fileUrl || '',
          fileName: data.fileName || '',
          fileSize: data.fileSize || 0,
          fileType: data.fileType || '',
          cloudinaryPublicId: data.cloudinaryPublicId || '',
          // Add React Native specific fields
          localUri: data.localUri || '', // For React Native file references
          thumbnailUrl: data.thumbnailUrl || '' // For image/video previews
        };

        const message = await Message.create(messageData);
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'firstName lastName businessName avatarUrl');

        if (!populatedMessage) {
          throw new Error('Failed to populate message');
        }

        // Update conversation
        let lastMessageContent = data.content || '';
        if (data.type === 'audio') lastMessageContent = '🎤 Voice message';
        else if (data.type === 'image') lastMessageContent = '🖼️ Image';
        else if (data.type === 'document') lastMessageContent = `📄 ${data.fileName || 'File'}`;

        await Conversation.findByIdAndUpdate(data.conversationId, {
          lastMessage: lastMessageContent,
          lastMessageAt: new Date()
        });

        // Format message for client
        const messageForClient = {
          _id: populatedMessage._id,
          conversationId: populatedMessage.conversationId,
          senderId: {
            _id: populatedMessage.senderId._id,
            firstName: populatedMessage.senderId.firstName,
            lastName: populatedMessage.senderId.lastName,
            businessName: populatedMessage.senderId.businessName,
            avatarUrl: populatedMessage.senderId.avatarUrl
          },
          content: populatedMessage.content,
          type: populatedMessage.type,
          fileUrl: populatedMessage.fileUrl,
          fileName: populatedMessage.fileName,
          fileSize: populatedMessage.fileSize,
          fileType: populatedMessage.fileType,
          cloudinaryPublicId: populatedMessage.cloudinaryPublicId,
          localUri: populatedMessage.localUri,
          thumbnailUrl: populatedMessage.thumbnailUrl,
          readBy: populatedMessage.readBy || [],
          createdAt: populatedMessage.createdAt,
          updatedAt: populatedMessage.updatedAt
        };

        // Send to all conversation participants
        conversation.participants.forEach(participant => {
          io.to(participant._id.toString()).emit('message', messageForClient);
          io.to(participant._id.toString()).emit('conversation_updated', {
            conversationId: conversation._id,
            lastMessage: lastMessageContent,
            lastMessageAt: new Date()
          });
        });

        // Send success callback
        if (callback) {
          callback({ 
            success: true, 
            message: messageForClient,
            messageId: message._id 
          });
        }

        console.log('✅ Message delivered to all participants');

      } catch (error) {
        console.error('❌ Message sending error:', error);
        if (callback) {
          callback({ 
            success: false, 
            error: error.message 
          });
        }
        socket.emit('message_error', { 
          error: 'Failed to send message: ' + error.message 
        });
      }
    });

    // Enhanced typing indicators
    socket.on('typing', (data) => {
      try {
        const { conversationId, isTyping } = data;
        
        if (!conversationId) {
          console.error('Missing conversationId in typing event');
          return;
        }

        if (isTyping) {
          if (!typingUsers.has(conversationId)) {
            typingUsers.set(conversationId, new Set());
          }
          typingUsers.get(conversationId).add(socket.userId);
        } else {
          if (typingUsers.has(conversationId)) {
            typingUsers.get(conversationId).delete(socket.userId);
            if (typingUsers.get(conversationId).size === 0) {
              typingUsers.delete(conversationId);
            }
          }
        }
        
        // Notify other participants
        socket.to(conversationId).emit('typing', {
          userId: socket.userId,
          isTyping,
          conversationId,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error handling typing event:', error);
      }
    });

    // Enhanced disconnect handling
    socket.on('disconnect', async (reason) => {
      try {
        console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
        
        if (socket.userId) {
          // Remove this specific socket from user's sockets
          if (userSockets.has(socket.userId)) {
            userSockets.get(socket.userId).delete(socket.id);
            
            // If user has no more connected sockets, mark as offline
            if (userSockets.get(socket.userId).size === 0) {
              userSockets.delete(socket.userId);
              onlineUsers.delete(socket.userId);
              await updateUserStatus(socket.userId, false);
              broadcastOnlineUsers();
            }
          }

          // Clean up typing status
          for (const [conversationId, usersSet] of typingUsers.entries()) {
            if (usersSet.has(socket.userId)) {
              usersSet.delete(socket.userId);
              if (usersSet.size === 0) {
                typingUsers.delete(conversationId);
              }
              socket.to(conversationId).emit('typing', {
                userId: socket.userId,
                isTyping: false,
                conversationId
              });
            }
          }
        }
        
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Heartbeat for connection monitoring
    socket.on('heartbeat', (data) => {
      socket.emit('heartbeat_ack', { 
        timestamp: new Date(),
        ...data 
      });
    });

    // Join specific conversation
    socket.on('join_conversation', async (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit('error', { message: 'conversationId is required' });
          return;
        }
        
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(socket.userId)) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }
        
        socket.join(conversationId);
        socket.emit('conversation_joined', { conversationId });
        
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Leave conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
      socket.emit('conversation_left', { conversationId });
    });

    // Error handling for socket
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Periodically clean up stale connections
  setInterval(() => {
    console.log(`🔄 Connection stats: ${onlineUsers.size} online users, ${userSockets.size} users with sockets`);
  }, 30000); // Log every 30 seconds
};

module.exports = { handleSocketConnection };