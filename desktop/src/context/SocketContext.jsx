// src/context/SocketContext.jsx - COMPLETE WITH PROPER EXPORTS
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/SocketService';

const SocketContext = createContext();

// Export the useSocket hook - THIS WAS MISSING
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const initializationRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
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
      
      // Setup event listeners including notification handlers
      setupEventListeners();
      
      // Join user's notification room immediately after connection
      if (user._id) {
        setTimeout(() => {
          socketService.emit('join_user_room', user._id);
          console.log('🔔 Joined user notification room:', user._id);
        }, 1000);
      }
      
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

  // Setup all event listeners including notification handlers
  const setupEventListeners = useCallback(() => {
    console.log('🔧 Setting up socket event listeners');

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

      // NEW: User room confirmation
      user_room_joined: (data) => {
        console.log('✅ Successfully joined user notification room:', data.userId);
      },

      // Chat events
      message: (message) => {
        console.log('📨 New message received in context:', message._id);
        // Emit custom event for message components
        window.dispatchEvent(new CustomEvent('socketMessage', { detail: message }));
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

      // NEW: REAL-TIME NOTIFICATION EVENTS
      new_notification: (data) => {
        console.log('🔔 New notification received:', data.notification?.title);
        const newNotification = data.notification;
        
        // Update notifications state
        setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
        setUnreadCount(prev => prev + 1);
        
        // Emit custom event for notification components
        window.dispatchEvent(new CustomEvent('socketNotification', { 
          detail: {
            type: 'new_notification',
            notification: newNotification,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Show browser notification for important notifications
        if (newNotification.priority === 'high' || newNotification.priority === 'urgent') {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico'
            });
          } else if (Notification.permission !== 'denied') {
            // Request permission if not already granted or denied
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: '/favicon.ico'
                });
              }
            });
          }
        }
      },

      new_order: (data) => {
        console.log('🛒 New order notification received:', data.order?._id);
        
        // Emit custom event specifically for new orders
        window.dispatchEvent(new CustomEvent('socketNewOrder', { 
          detail: {
            type: 'new_order',
            order: data.order,
            notification: data.notification,
            timestamp: new Date().toISOString()
          }
        }));

        // Also emit as a general notification
        window.dispatchEvent(new CustomEvent('socketNotification', { 
          detail: {
            type: 'new_order',
            order: data.order,
            notification: data.notification,
            timestamp: new Date().toISOString()
          }
        }));

        // Update notifications state
        if (data.notification) {
          setNotifications(prev => [data.notification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
        }

        // Show browser notification for new orders
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('New Order! 🛒', {
              body: `You have a new order for ${data.order.quantity} ${data.order.measurementUnit} of ${data.order.productName}`,
              icon: '/favicon.ico',
              tag: 'new-order'
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('New Order! 🛒', {
                  body: `You have a new order for ${data.order.quantity} ${data.order.measurementUnit} of ${data.order.productName}`,
                  icon: '/favicon.ico',
                  tag: 'new-order'
                });
              }
            });
          }
        }
      },

      // NEW: Order status update events
      order_status_update: (data) => {
        console.log('📦 Order status update received:', data.orderId, data.status);
        window.dispatchEvent(new CustomEvent('socketOrderStatusUpdate', { 
          detail: {
            type: 'order_status_update',
            orderId: data.orderId,
            status: data.status,
            data: data,
            timestamp: new Date().toISOString()
          }
        }));
      },

      order_assigned: (data) => {
        console.log('🚚 Order assigned to transporter:', data.orderId);
        window.dispatchEvent(new CustomEvent('socketOrderAssigned', { 
          detail: {
            type: 'order_assigned',
            orderId: data.orderId,
            transporterId: data.transporterId,
            data: data,
            timestamp: new Date().toISOString()
          }
        }));
      },

      order_delivered: (data) => {
        console.log('📬 Order delivered:', data.orderId);
        window.dispatchEvent(new CustomEvent('socketOrderDelivered', { 
          detail: {
            type: 'order_delivered',
            orderId: data.orderId,
            data: data,
            timestamp: new Date().toISOString()
          }
        }));
      },

      order_disputed: (data) => {
        console.log('⚠️ Order disputed:', data.orderId);
        window.dispatchEvent(new CustomEvent('socketOrderDisputed', { 
          detail: {
            type: 'order_disputed',
            orderId: data.orderId,
            reason: data.reason,
            data: data,
            timestamp: new Date().toISOString()
          }
        }));
      },

      order_return: (data) => {
        console.log('🔄 Order return requested:', data.orderId);
        window.dispatchEvent(new CustomEvent('socketOrderReturn', { 
          detail: {
            type: 'order_return',
            orderId: data.orderId,
            reason: data.returnReason,
            data: data,
            timestamp: new Date().toISOString()
          }
        }));
      },

      // NEW: Notification status events
      notification_marked_read: (data) => {
        console.log('✅ Notification marked as read:', data.notificationId);
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === data.notificationId 
              ? { ...notif, read: true, readAt: new Date() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      },

      all_notifications_marked_read: (data) => {
        console.log('✅ All notifications marked as read for user:', data.userId);
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
        );
        setUnreadCount(0);
      },

      unread_count_updated: (data) => {
        console.log('🔢 Unread count updated:', data.count);
        setUnreadCount(data.count);
      },

      // Test notification events
      test_notification_sent: (data) => {
        console.log('🧪 Test notification sent successfully:', data.userId);
        // Use browser notification instead of alert for better UX
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Test Notification', {
            body: 'Test notification sent successfully!',
            icon: '/favicon.ico'
          });
        } else {
          console.log('🧪 Test notification sent successfully');
        }
      },

      test_notification_error: (data) => {
        console.error('❌ Test notification failed:', data.error);
        // Use console.error instead of alert for errors
        console.error('Test notification failed:', data.error);
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

      authentication_failed: (data) => {
        console.error('❌ Authentication failed in context:', data.message);
        window.dispatchEvent(new CustomEvent('socketAuthError', { detail: data }));
      },

      notification_error: (error) => {
        console.error('🔔 Notification error in context:', error);
        window.dispatchEvent(new CustomEvent('socketNotificationError', { detail: error }));
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

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up socket context...');
    
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
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
    setNotifications([]);
    setUnreadCount(0);
    initializationRef.current = false;
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
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

  // NEW: Notification methods
  const joinUserRoom = useCallback(() => {
    if (user?._id) {
      socketService.emit('join_user_room', user._id);
      console.log('🔔 Joining user notification room:', user._id);
      return true;
    }
    return false;
  }, [user]);

  const markNotificationRead = useCallback((notificationId) => {
    return new Promise((resolve, reject) => {
      socketService.emit('mark_notification_read', { notificationId }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to mark notification as read');
        }
      });
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    return new Promise((resolve, reject) => {
      socketService.emit('mark_all_notifications_read', {}, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to mark all notifications as read');
        }
      });
    });
  }, []);

  const getUnreadCount = useCallback(() => {
    return new Promise((resolve, reject) => {
      socketService.emit('get_unread_count', {}, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to get unread count');
        }
      });
    });
  }, []);

  const sendTestNotification = useCallback((testData = {}) => {
    return new Promise((resolve, reject) => {
      socketService.emit('test_notification', {
        userId: user?._id,
        ...testData
      }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to send test notification');
        }
      });
    });
  }, [user]);

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
    notifications,
    unreadCount,
    connectionHealth: { healthy: isConnected, lastCheck: new Date().toISOString() },
    
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
    
    // NEW: Notification methods
    joinUserRoom,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadCount,
    sendTestNotification,
    
    // NEW: Helper methods for real-time events
    listenForNotifications: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketNotification', handler);
      return () => window.removeEventListener('socketNotification', handler);
    },
    
    listenForNewOrders: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketNewOrder', handler);
      return () => window.removeEventListener('socketNewOrder', handler);
    },
    
    listenForMessages: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketMessage', handler);
      return () => window.removeEventListener('socketMessage', handler);
    },
    
    listenForOrderUpdates: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketOrderStatusUpdate', handler);
      return () => window.removeEventListener('socketOrderStatusUpdate', handler);
    },
    
    listenForOrderAssignments: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketOrderAssigned', handler);
      return () => window.removeEventListener('socketOrderAssigned', handler);
    },
    
    listenForOrderDeliveries: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketOrderDelivered', handler);
      return () => window.removeEventListener('socketOrderDelivered', handler);
    },
    
    listenForOrderDisputes: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketOrderDisputed', handler);
      return () => window.removeEventListener('socketOrderDisputed', handler);
    },
    
    listenForOrderReturns: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketOrderReturn', handler);
      return () => window.removeEventListener('socketOrderReturn', handler);
    },
    
    listenForErrors: (callback) => {
      const handler = (event) => callback(event.detail);
      window.addEventListener('socketError', handler);
      return () => window.removeEventListener('socketError', handler);
    },
    
    // NEW: State management helpers
    addNotification: (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
    },
    
    clearNotifications: () => {
      setNotifications([]);
      setUnreadCount(0);
    },
    
    updateNotification: (notificationId, updates) => {
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, ...updates } : notif
        )
      );
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Export the SocketProvider as default
export default SocketProvider;