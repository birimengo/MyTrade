// src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import socketService from '../services/SocketService';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  const initializationRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef({});

  // Initialize socket connection
  const initializeSocket = useCallback(async () => {
    if (initializationRef.current || !user?._id || !isAuthenticated) {
      return;
    }

    try {
      initializationRef.current = true;
      console.log('🔄 Initializing socket connection for user:', user._id);
      setConnectionStatus('connecting');

      const connectedSocket = await socketService.connect();
      setSocket(connectedSocket);
      setIsConnected(true);
      setConnectionStatus('connected');

      // Set up event listeners
      setupEventListeners();
      
      console.log('✅ Socket initialization complete');

    } catch (error) {
      console.error('❌ Socket initialization failed:', error.message);
      setIsConnected(false);
      setConnectionStatus('error');
      initializationRef.current = false;
      
      // Fallback to mock socket in development
      if (__DEV__) {
        console.log('🔄 Falling back to mock socket for development');
        const mockSocket = createMockSocket();
        setSocket(mockSocket);
        setIsConnected(true);
        setConnectionStatus('connected');
      }
    }
  }, [user, isAuthenticated]);

  // Setup all event listeners that match backend
  const setupEventListeners = useCallback(() => {
    const listeners = {
      // Connection events
      connected: (data) => {
        console.log('✅ Socket connected in context');
        setIsConnected(true);
        setConnectionStatus('connected');
      },

      authenticated: (data) => {
        console.log('✅ Socket authenticated in context for user:', data.userId);
      },

      disconnect: (reason) => {
        console.log('🔌 Socket disconnected in context:', reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      },

      connect_error: (error) => {
        console.error('❌ Socket connection error in context:', error.message);
        setIsConnected(false);
        setConnectionStatus('error');
      },

      // User events
      onlineUsers: (userIds) => {
        console.log('👥 Online users updated:', userIds?.length || 0, 'users');
        setOnlineUsers(userIds || []);
      },

      userStatusChanged: (data) => {
        console.log('🔄 User status changed:', data.userId, data.isOnline ? 'online' : 'offline');
        setOnlineUsers(prev => {
          if (data.isOnline) {
            return prev.includes(data.userId) ? prev : [...prev, data.userId];
          } else {
            return prev.filter(id => id !== data.userId);
          }
        });
      },

      // Chat events - MATCHING BACKEND EVENTS
      message: (message) => {
        console.log('📨 New message received in context:', message._id);
        // Individual components will handle their own message events
      },

      typing: (data) => {
        console.log('⌨️ Typing event in context:', data.userId, data.isTyping ? 'typing...' : 'stopped');
        setTypingUsers(prev => ({
          ...prev,
          [data.conversationId]: data.isTyping 
            ? [...(prev[data.conversationId] || []).filter(id => id !== data.userId), data.userId]
            : (prev[data.conversationId] || []).filter(id => id !== data.userId)
        }));
      },

      conversation_joined: (data) => {
        console.log('✅ Joined conversation:', data.conversationId);
      },

      conversation_updated: (data) => {
        console.log('🔄 Conversation updated:', data.conversationId);
      },

      // Error events
      error: (error) => {
        console.error('🚨 Socket error event in context:', error);
      },

      message_error: (error) => {
        console.error('❌ Message error in context:', error);
        Alert.alert('Message Error', error.error || 'Failed to send message');
      },

      authentication_failed: (data) => {
        console.error('❌ Authentication failed in context:', data.message);
        Alert.alert('Authentication Error', 'Socket authentication failed');
      }
    };

    // Register all listeners
    Object.entries(listeners).forEach(([event, handler]) => {
      socketService.on(event, handler);
      listenersRef.current[event] = handler;
    });
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up socket context...');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Remove all listeners
    Object.entries(listenersRef.current).forEach(([event, listener]) => {
      socketService.off(event, listener);
    });
    listenersRef.current = {};
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    initializationRef.current = false;
  }, []);

  // Main useEffect
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      initializeSocket();
    } else {
      // Clean up if user logs out
      cleanup();
    }

    return cleanup;
  }, [initializeSocket, cleanup, isAuthenticated, user]);

  // Enhanced socket methods that match backend
  const sendMessage = useCallback((messageData) => {
    return socketService.sendMessage(messageData);
  }, []);

  const joinConversation = useCallback((conversationId) => {
    return socketService.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    return socketService.leaveConversation(conversationId);
  }, []);

  const setTyping = useCallback((conversationId, isTyping) => {
    socketService.sendTyping(conversationId, isTyping);
  }, []);

  // Context value
  const value = {
    socket: socket || socketService.getSocket(),
    isConnected: socketService.getIsConnected(),
    connectionStatus,
    onlineUsers,
    typingUsers,
    socketService,
    
    // Socket methods
    emit: (event, data, callback) => socketService.emit(event, data, callback),
    on: (event, callback) => socketService.on(event, callback),
    off: (event, callback) => socketService.off(event, callback),
    
    // Connection management
    reconnect: () => socketService.reconnect(),
    
    // Chat-specific methods - MATCHING BACKEND EVENTS
    sendMessage,
    joinConversation,
    leaveConversation,
    setTyping,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Mock socket for development
const createMockSocket = () => {
  const mockSocket = {
    id: 'mock-socket-id',
    connected: true,
    
    emit: (event, data, callback) => {
      console.log(`📤 [MOCK] Emit: ${event}`, data);
      
      // Simulate successful responses for backend events
      if (callback) {
        setTimeout(() => {
          if (event === 'sendMessage') {
            callback({
              success: true,
              message: {
                _id: 'mock-' + Date.now(),
                ...data,
                createdAt: new Date().toISOString()
              },
              messageId: 'mock-' + Date.now()
            });
          } else {
            callback({ success: true });
          }
        }, 100);
      }
      return true;
    },
    
    on: (event, callback) => {
      console.log(`📥 [MOCK] Listening: ${event}`);
    },
    
    off: (event) => {
      console.log(`🚫 [MOCK] Stop listening: ${event}`);
    },
    
    disconnect: () => {
      console.log('🔌 [MOCK] Socket disconnected');
    }
  };

  return mockSocket;
};