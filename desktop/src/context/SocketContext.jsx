// src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
  const [connectionHealth, setConnectionHealth] = useState({ healthy: false, lastCheck: null });
  
  const initializationRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);
  const listenersRef = useRef(new Map());

  // Initialize socket connection with enhanced error handling
  const initializeSocket = useCallback(async () => {
    if (initializationRef.current || !user?._id || !isAuthenticated) {
      console.log('⏸️ Skipping socket initialization - already initializing or no user');
      return;
    }

    try {
      initializationRef.current = true;
      console.log('🔄 Initializing socket connection for user:', user._id);
      setConnectionStatus('connecting');

      const connectedSocket = await socketService.connect();
      setSocket(connectedSocket);
      
      // Setup event listeners
      setupEventListeners();
      
      // Start health monitoring
      startHealthMonitoring();
      
      // Sync any pending messages
      setTimeout(() => {
        socketService.syncPendingMessages();
      }, 2000);
      
      console.log('✅ Socket initialization complete');

    } catch (error) {
      console.error('❌ Socket initialization failed:', error.message);
      setIsConnected(false);
      setConnectionStatus('error');
      initializationRef.current = false;
      
      // Retry connection with exponential backoff
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      const delay = Math.min(1000 * Math.pow(2, socketService.connectionAttempts || 0), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Retrying socket connection...');
        initializationRef.current = false;
        initializeSocket();
      }, delay);
    }
  }, [user, isAuthenticated]);

  // Setup all event listeners
  const setupEventListeners = useCallback(() => {
    console.log('🔧 Setting up socket event listeners');

    const listeners = {
      // Connection events - FIXED: Use correct event names
      connect: () => {
        console.log('✅ Socket connected in context');
        setIsConnected(true);
        setConnectionStatus('connected');
        setConnectionHealth(prev => ({ ...prev, healthy: true, lastCheck: new Date().toISOString() }));
      },

      disconnect: (reason) => {
        console.log('🔌 Socket disconnected in context:', reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setConnectionHealth(prev => ({ ...prev, healthy: false }));
      },

      connect_error: (error) => {
        console.error('❌ Socket connection error in context:', error.message);
        setIsConnected(false);
        setConnectionStatus('error');
        setConnectionHealth(prev => ({ ...prev, healthy: false }));
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

      // Chat events
      message: (message) => {
        console.log('📨 New message received in context:', message._id);
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('socketMessage', { detail: message }));
      },

      message_delivered: (data) => {
        console.log('✅ Message delivered:', data.messageId);
        window.dispatchEvent(new CustomEvent('socketMessageDelivered', { detail: data }));
      },

      message_read: (data) => {
        console.log('📖 Message read:', data.messageId);
        window.dispatchEvent(new CustomEvent('socketMessageRead', { detail: data }));
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
        window.dispatchEvent(new CustomEvent('socketError', { detail: error }));
      },

      message_error: (error) => {
        console.error('❌ Message error in context:', error);
        window.dispatchEvent(new CustomEvent('socketMessageError', { detail: error }));
      },

      // Reconnection events
      reconnect: (attempt) => {
        console.log(`✅ Socket reconnected after ${attempt} attempts`);
        setIsConnected(true);
        setConnectionStatus('connected');
      },

      reconnect_failed: () => {
        console.error('❌ Socket reconnection failed completely');
        setIsConnected(false);
        setConnectionStatus('error');
      }
    };

    // Register all listeners
    Object.entries(listeners).forEach(([event, handler]) => {
      socketService.on(event, handler);
      listenersRef.current.set(event, handler);
    });

    return () => {
      // Cleanup function
      listenersRef.current.forEach((handler, event) => {
        socketService.off(event, handler);
      });
      listenersRef.current.clear();
    };
  }, []);

  // Health monitoring
  const startHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(async () => {
      if (socketService.getIsConnected()) {
        try {
          const health = await socketService.healthCheck();
          setConnectionHealth({
            healthy: health.healthy,
            lastCheck: new Date().toISOString(),
            transport: health.transport,
            latency: health.latency
          });
        } catch (error) {
          setConnectionHealth(prev => ({ ...prev, healthy: false }));
        }
      }
    }, 30000); // Check every 30 seconds
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up socket context...');
    
    // Clear timeouts and intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    
    // Remove listeners
    listenersRef.current.forEach((handler, event) => {
      socketService.off(event, handler);
    });
    listenersRef.current.clear();
    
    // Disconnect socket
    socketService.disconnect();
    
    // Reset state
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setOnlineUsers([]);
    setTypingUsers({});
    setConnectionHealth({ healthy: false, lastCheck: null });
    initializationRef.current = false;
  }, []);

  // Main useEffect
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      initializeSocket();
    } else {
      cleanup();
    }

    return cleanup;
  }, [initializeSocket, cleanup, isAuthenticated, user]);

  // Enhanced socket methods
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

  const syncPendingMessages = useCallback(() => {
    return socketService.syncPendingMessages();
  }, []);

  const checkHealth = useCallback(() => {
    return socketService.healthCheck();
  }, []);

  // Context value
  const value = {
    socket: socketService.getSocket(),
    isConnected: socketService.getIsConnected(),
    connectionStatus,
    onlineUsers,
    typingUsers,
    connectionHealth,
    
    // Socket methods
    emit: (event, data, callback) => socketService.emit(event, data, callback),
    on: (event, callback) => socketService.on(event, callback),
    off: (event, callback) => socketService.off(event, callback),
    
    // Connection management
    reconnect: () => socketService.reconnect(),
    disconnect: () => socketService.disconnect(),
    checkHealth,
    
    // Chat-specific methods
    sendMessage,
    joinConversation,
    leaveConversation,
    setTyping,
    syncPendingMessages,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};