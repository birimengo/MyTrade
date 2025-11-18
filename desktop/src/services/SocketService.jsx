// src/services/SocketService.js
import { io } from 'socket.io-client';

// FIXED: Use the correct Render URL for both API and Socket
const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.isElectron = window.electronAPI;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  // FIXED: Enhanced safe token retrieval
  getToken() {
    try {
      const token = localStorage.getItem('trade_uganda_token');
      if (!token) {
        console.log('🔑 No token found in storage');
        return null;
      }
      
      console.log('🔑 Raw token from storage:', typeof token, token.substring(0, 20) + '...');
      
      // Handle both string and object tokens
      if (typeof token === 'string') {
        // If it's already a valid JWT token, return it directly
        if (token.startsWith('eyJ')) {
          console.log('🔑 Using raw JWT token');
          return token;
        }
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(token);
          console.log('🔑 Parsed token:', typeof parsed, parsed);
          
          if (parsed && typeof parsed === 'object' && parsed.token) {
            console.log('🔑 Extracted token from object');
            return parsed.token;
          }
          
          if (typeof parsed === 'string' && parsed.startsWith('eyJ')) {
            console.log('🔑 Using parsed string token');
            return parsed;
          }
          
          return parsed; // Return whatever was parsed
        } catch (parseError) {
          console.log('🔑 Cannot parse token as JSON, using raw string');
          return token; // Return raw string if not JSON
        }
      }
      
      return token;
    } catch (error) {
      console.error('❌ Error retrieving token:', error);
      return null;
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Don't reconnect if already connected
        if (this.socket?.connected) {
          console.log('✅ Socket already connected');
          resolve(this.socket);
          return;
        }

        const token = this.getToken();
        
        console.log('🔌 Connecting to Socket.IO server:', API_BASE_URL);
        console.log('💻 Running in Electron:', !!this.isElectron);
        console.log('🔑 Token available:', !!token);
        
        // Clean up existing socket
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
        }

        // Enhanced connection options
        this.socket = io(API_BASE_URL, {
          transports: ['websocket', 'polling'],
          auth: token ? { token } : undefined,
          timeout: 10000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          // Better error handling
          rejectUnauthorized: false,
          extraHeaders: this.isElectron ? {
            'User-Agent': 'TradeUgandaDesktop/1.0.0',
            'X-Platform': 'electron'
          } : undefined
        });

        // Connection successful
        this.socket.on('connect', () => {
          console.log('✅ Socket connected successfully');
          console.log('📡 Transport:', this.socket.io.engine.transport.name);
          this.isConnected = true;
          this.connectionAttempts = 0;
          this.reconnectDelay = 1000;
          resolve(this.socket);
        });

        // Connection error with enhanced handling
        this.socket.on('connect_error', (error) => {
          this.connectionAttempts++;
          console.error(`❌ Socket connection error (attempt ${this.connectionAttempts}):`, error.message);
          this.isConnected = false;
          
          // Exponential backoff for reconnection
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
          
          if (this.connectionAttempts >= this.maxConnectionAttempts) {
            console.warn('⚠️ Max connection attempts reached');
            reject(error);
          }
        });

        // Monitor transport upgrades
        this.socket.io.engine.on('upgrade', (transport) => {
          console.log('🔄 Transport upgraded to:', transport.name);
        });

        // Disconnect handling
        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
          this.isConnected = false;
        });

        // Handle reconnection events
        this.socket.on('reconnect', (attempt) => {
          console.log(`✅ Socket reconnected after ${attempt} attempts`);
          this.isConnected = true;
        });

        this.socket.on('reconnect_attempt', (attempt) => {
          console.log(`🔄 Socket reconnection attempt ${attempt}`);
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('❌ Socket reconnection failed:', error);
        });

        this.socket.on('reconnect_failed', () => {
          console.error('❌ Socket reconnection failed completely');
        });

      } catch (error) {
        console.error('❌ Socket connection failed:', error);
        reject(error);
      }
    });
  }

  // Enhanced emit with better error handling
  emit(event, data, callback) {
    if (this.socket && this.isConnected) {
      try {
        return this.socket.emit(event, data, callback);
      } catch (error) {
        console.error('❌ Socket emit error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
        return false;
      }
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
      if (callback) {
        callback({
          success: false,
          error: 'Socket not connected',
          offline: true,
          timestamp: new Date().toISOString()
        });
      }
      return false;
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
    } else {
      console.warn('⚠️ Socket not initialized, cannot listen to:', event);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      // Remove from stored listeners
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event = null) {
    if (event) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(callback => {
          this.socket?.off(event, callback);
        });
        this.listeners.delete(event);
      }
    } else {
      // Remove all listeners
      this.listeners.forEach((callbacks, eventName) => {
        callbacks.forEach(callback => {
          this.socket?.off(eventName, callback);
        });
      });
      this.listeners.clear();
    }
  }

  // Enhanced message sending with offline queuing
  sendMessage(messageData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        console.warn('⚠️ Socket offline, message queued for later delivery');
        
        // Queue for offline delivery
        const queuedMessage = {
          ...messageData,
          queuedAt: new Date().toISOString(),
          messageId: `offline-${Date.now()}`,
          status: 'queued'
        };
        
        this.queueOfflineMessage(queuedMessage);
        
        resolve({
          success: true,
          message: 'Message queued for offline delivery',
          offline: true,
          queuedMessage
        });
        return;
      }

      this.emit('sendMessage', messageData, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to send message');
        }
      });
    });
  }

  // Queue messages for offline delivery
  queueOfflineMessage(messageData) {
    try {
      const pendingMessages = JSON.parse(localStorage.getItem('pending_messages') || '[]');
      pendingMessages.push({
        ...messageData,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      localStorage.setItem('pending_messages', JSON.stringify(pendingMessages));
      console.log('💾 Message queued for offline delivery. Total pending:', pendingMessages.length);
    } catch (error) {
      console.error('❌ Failed to queue offline message:', error);
    }
  }

  // Sync pending messages when back online
  async syncPendingMessages() {
    if (!this.isConnected) {
      console.log('⚠️ Cannot sync - socket not connected');
      return;
    }

    try {
      const pendingMessages = JSON.parse(localStorage.getItem('pending_messages') || '[]');
      if (pendingMessages.length === 0) {
        console.log('✅ No pending messages to sync');
        return;
      }

      console.log(`🔄 Syncing ${pendingMessages.length} pending messages`);
      
      const results = [];
      for (const message of pendingMessages) {
        try {
          const result = await this.sendMessage(message);
          results.push({ id: message.id, success: true, result });
        } catch (error) {
          results.push({ id: message.id, success: false, error: error.message });
        }
      }

      // Clear successfully sent messages
      const failedMessages = pendingMessages.filter((msg, index) => !results[index].success);
      localStorage.setItem('pending_messages', JSON.stringify(failedMessages));
      
      console.log(`✅ Sync complete. Successful: ${results.filter(r => r.success).length}, Failed: ${failedMessages.length}`);
      
    } catch (error) {
      console.error('❌ Failed to sync pending messages:', error);
    }
  }

  joinConversation(conversationId) {
    if (this.isConnected) {
      this.emit('joinConversation', { conversationId });
      console.log(`✅ Joined conversation: ${conversationId}`);
    } else {
      console.warn('⚠️ Socket offline, cannot join conversation');
    }
  }

  leaveConversation(conversationId) {
    if (this.isConnected) {
      this.emit('leaveConversation', { conversationId });
      console.log(`✅ Left conversation: ${conversationId}`);
    }
  }

  sendTyping(conversationId, isTyping) {
    if (this.isConnected) {
      this.emit('typing', { conversationId, isTyping });
    }
  }

  // Getters
  getSocket() {
    return this.socket;
  }

  getIsConnected() {
    return this.isConnected && this.socket?.connected;
  }

  getConnectionStatus() {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }

  // Enhanced reconnect with better logic
  reconnect() {
    if (this.socket) {
      console.log('🔄 Attempting to reconnect socket...');
      this.socket.connect();
    } else {
      console.log('🔄 No socket instance, creating new connection...');
      this.connect().catch(error => {
        console.error('❌ Reconnection failed:', error);
      });
    }
  }

  // Enhanced cleanup
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionAttempts = 0;
    }
  }

  // Health check
  async healthCheck() {
    return new Promise((resolve) => {
      if (!this.isConnected) {
        resolve({ healthy: false, status: 'disconnected' });
        return;
      }

      const timeout = setTimeout(() => {
        resolve({ healthy: false, status: 'timeout' });
      }, 5000);

      this.emit('ping', { timestamp: Date.now() }, (response) => {
        clearTimeout(timeout);
        resolve({ 
          healthy: true, 
          status: 'connected',
          transport: this.socket.io.engine.transport.name,
          latency: Date.now() - (response?.timestamp || Date.now())
        });
      });
    });
  }
}

export default new SocketService();