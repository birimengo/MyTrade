// backend/socket/socketHandler.js
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const handleSocketConnection = (io) => {
  const onlineUsers = new Map(); // userId -> socketId
  const typingUsers = new Map(); // conversationId -> Set of userIds
  const recordingUsers = new Map(); // conversationId -> Set of userIds

  // Function to broadcast online users list
  const broadcastOnlineUsers = () => {
    const onlineUserIds = Array.from(onlineUsers.keys());
    io.emit('onlineUsers', onlineUserIds);
    console.log(`📊 Online users: ${onlineUserIds.length} users`);
  };

  // Function to update user status and notify
  const updateUserStatus = async (userId, isOnline) => {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: isOnline,
        lastSeen: new Date()
      });

      // Notify all users about status change
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
    console.log('User connected:', socket.id);

    // Handle user joining with authentication
    socket.on('authenticate', async (userId) => {
      try {
        if (!userId) {
          console.log('No user ID provided for authentication');
          return;
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
          console.error('User not found:', userId);
          return;
        }

        // Store user connection
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(userId);
        
        // Update user status
        await updateUserStatus(userId, true);
        
        // Broadcast updated online users list
        broadcastOnlineUsers();
        
        console.log(`✅ User ${userId} (${user.firstName} ${user.lastName}) authenticated with socket ${socket.id}`);
      } catch (error) {
        console.error('Error in authenticate event:', error);
      }
    });

    // Handle user joining (legacy support)
    socket.on('join', async (userId) => {
      try {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(userId);
        
        // Update user's online status in database
        await updateUserStatus(userId, true);
        
        console.log(`User ${userId} joined with socket ${socket.id}`);
      } catch (error) {
        console.error('Error in join event:', error);
      }
    });

    // Handle sending messages (your existing code)
    socket.on('sendMessage', async (data) => {
      try {
        console.log('📨 Processing message:', {
          conversationId: data.conversationId,
          senderId: data.senderId,
          type: data.type || 'text',
          hasFile: !!data.fileUrl,
          content: data.content ? data.content.substring(0, 50) + '...' : 'File message'
        });
        
        // Verify conversation exists and user is a participant
        const conversation = await Conversation.findOne({
          _id: data.conversationId,
          participants: data.senderId
        });

        if (!conversation) {
          console.error('Conversation not found or user not authorized');
          socket.emit('error', 'Not authorized to send messages in this conversation');
          return;
        }

        // Save message to database with ALL file metadata
        const messageData = {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content || '',
          type: data.type || 'text',
          fileUrl: data.fileUrl || '',
          fileName: data.fileName || '',
          fileSize: data.fileSize || 0,
          fileType: data.fileType || '',
          cloudinaryPublicId: data.cloudinaryPublicId || ''
        };

        const message = await Message.create(messageData);

        // Populate ALL fields including file information
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'firstName lastName businessName');

        if (!populatedMessage) {
          throw new Error('Failed to populate message');
        }

        // Update conversation last message
        let lastMessageContent = data.content || '';
        if (data.type === 'audio') {
          lastMessageContent = 'Voice message';
        } else if (data.type === 'image') {
          lastMessageContent = 'Sent an image';
        } else if (data.type === 'document') {
          lastMessageContent = `Sent a file: ${data.fileName || 'file'}`;
        }

        await Conversation.findByIdAndUpdate(data.conversationId, {
          lastMessage: lastMessageContent,
          lastMessageAt: new Date()
        });

        // Get updated conversation with participants
        const updatedConversation = await Conversation.findById(data.conversationId)
          .populate('participants', 'firstName lastName businessName role');

        if (!updatedConversation) {
          throw new Error('Failed to populate conversation');
        }

        // Send to all participants with complete message data
        updatedConversation.participants.forEach(participant => {
          io.to(participant._id.toString()).emit('message', {
            _id: populatedMessage._id,
            conversationId: populatedMessage.conversationId,
            senderId: {
              _id: populatedMessage.senderId._id,
              firstName: populatedMessage.senderId.firstName,
              lastName: populatedMessage.senderId.lastName,
              businessName: populatedMessage.senderId.businessName
            },
            content: populatedMessage.content,
            type: populatedMessage.type,
            fileUrl: populatedMessage.fileUrl,
            fileName: populatedMessage.fileName,
            fileSize: populatedMessage.fileSize,
            fileType: populatedMessage.fileType,
            cloudinaryPublicId: populatedMessage.cloudinaryPublicId,
            readBy: populatedMessage.readBy,
            createdAt: populatedMessage.createdAt,
            updatedAt: populatedMessage.updatedAt
          });
          
          io.to(participant._id.toString()).emit('conversationUpdate', updatedConversation);
        });

        console.log('✅ Message saved and broadcasted:', populatedMessage._id);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', 'Failed to send message: ' + error.message);
      }
    });

    // Handle typing indicators (your existing code)
    socket.on('typing', (data) => {
      const { conversationId, isTyping } = data;
      
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
      
      // Notify other participants in the conversation
      socket.to(conversationId).emit('typing', {
        userId: socket.userId,
        isTyping,
        conversationId
      });
    });

    // Handle user going offline manually
    socket.on('userOffline', async () => {
      if (socket.userId) {
        await updateUserStatus(socket.userId, false);
        onlineUsers.delete(socket.userId);
        broadcastOnlineUsers();
      }
    });

    // Handle user going online manually
    socket.on('userOnline', async () => {
      if (socket.userId) {
        onlineUsers.set(socket.userId, socket.id);
        await updateUserStatus(socket.userId, true);
        broadcastOnlineUsers();
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        if (socket.userId) {
          await updateUserStatus(socket.userId, false);
          onlineUsers.delete(socket.userId);
          broadcastOnlineUsers();
          
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
          
          // Clean up recording status
          for (const [conversationId, usersSet] of recordingUsers.entries()) {
            if (usersSet.has(socket.userId)) {
              usersSet.delete(socket.userId);
              if (usersSet.size === 0) {
                recordingUsers.delete(conversationId);
              }
              socket.to(conversationId).emit('recording', {
                userId: socket.userId,
                isRecording: false,
                conversationId
              });
            }
          }
        }
        console.log('User disconnected:', socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle recording, file upload, message read, etc. (your existing code)
    socket.on('recording', (data) => {
      const { conversationId, isRecording } = data;
      
      if (isRecording) {
        if (!recordingUsers.has(conversationId)) {
          recordingUsers.set(conversationId, new Set());
        }
        recordingUsers.get(conversationId).add(socket.userId);
      } else {
        if (recordingUsers.has(conversationId)) {
          recordingUsers.get(conversationId).delete(socket.userId);
          if (recordingUsers.get(conversationId).size === 0) {
            recordingUsers.delete(conversationId);
          }
        }
      }
      
      socket.to(conversationId).emit('recording', {
        userId: socket.userId,
        isRecording,
        conversationId
      });
    });

    socket.on('fileUploadProgress', (data) => {
      const { conversationId, progress } = data;
      
      socket.to(conversationId).emit('fileUploadProgress', {
        userId: socket.userId,
        progress,
        conversationId
      });
    });

    socket.on('markAsRead', async (data) => {
      try {
        const { conversationId, messageId } = data;
        
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: socket.userId }
        });

        const message = await Message.findById(messageId);
        if (message && message.senderId.toString() !== socket.userId) {
          io.to(message.senderId.toString()).emit('messageRead', {
            messageId,
            readBy: socket.userId,
            readAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    socket.on('audioPlayback', (data) => {
      const { conversationId, messageId, isPlaying } = data;
      
      socket.to(conversationId).emit('audioPlayback', {
        userId: socket.userId,
        messageId,
        isPlaying,
        conversationId
      });
    });
  });
};

module.exports = { handleSocketConnection };