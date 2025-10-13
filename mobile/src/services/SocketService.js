// src/services/SocketService.js
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.connectionPromise = null;
    this.connectionTimeout = 10000;
  }

  async connect(url = "https://mytrade-cx5z.onrender.com") {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      this.connectionPromise = new Promise((resolve, reject) => {
        // Clean up existing socket
        if (this.socket) {
          this.socket.disconnect();
          this.socket.removeAllListeners();
          this.socket = null;
        }

        console.log("🔌 Attempting socket connection to:", url);

        this.socket = io(url, {
          transports: ["websocket", "polling"],
          auth: {
            token: token
          },
          timeout: this.connectionTimeout,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.error("⏰ Socket connection timeout");
            this.cleanup();
            reject(new Error("Connection timeout"));
          }
        }, this.connectionTimeout);

        // Event handlers
        this.socket.on("connect", () => {
          clearTimeout(connectionTimeout);
          console.log("✅ Socket connected successfully. ID:", this.socket.id);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send authentication immediately after connection
          this.authenticate();
          
          resolve(this.socket);
        });

        this.socket.on("connected", (data) => {
          console.log("✅ Server connection confirmed:", data.message);
        });

        this.socket.on("authenticated", (data) => {
          console.log("✅ Socket authentication successful for user:", data.userId);
        });

        this.socket.on("connect_error", (error) => {
          clearTimeout(connectionTimeout);
          console.error("❌ Socket connection error:", error.message);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log("🔌 Socket disconnected. Reason:", reason);
          this.isConnected = false;
        });

        this.socket.on("error", (error) => {
          console.error("🚨 Socket error:", error);
        });

        this.socket.on("authentication_failed", (data) => {
          console.error("❌ Socket authentication failed:", data.message);
        });

        // Handle existing listeners
        this.reattachEventListeners();

      });

      return this.connectionPromise;

    } catch (error) {
      console.error("🚨 Socket connection failed:", error);
      this.cleanup();
      throw error;
    }
  }

  // Authenticate with the server
  async authenticate() {
    try {
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("user");
      
      if (userData) {
        const user = JSON.parse(userData);
        if (user._id) {
          console.log("🔐 Authenticating socket with user ID:", user._id);
          this.emit("authenticate", {
            userId: user._id,
            deviceId: this.socket?.id
          });
        }
      }
    } catch (error) {
      console.error("❌ Socket authentication error:", error);
    }
  }

  // Reattach all registered event listeners after reconnection
  reattachEventListeners() {
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket.on(event, callback);
      });
    });
  }

  // MATCHING BACKEND EVENTS - Updated to match your backend exactly
  joinRoom(roomId) {
    console.log(`🔗 Joining room: ${roomId}`);
    return this.emit("join_room", roomId);
  }

  leaveRoom(roomId) {
    return this.emit("leave_room", roomId);
  }

  // FIXED: Use 'sendMessage' (not 'send_message') to match backend
  sendMessage(messageData) {
    return new Promise((resolve, reject) => {
      console.log("📤 Sending message via socket:", {
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        type: messageData.type
      });

      if (!this.socket || !this.isConnected) {
        reject(new Error("Socket not connected"));
        return;
      }

      // Add timeout for message sending
      const timeout = setTimeout(() => {
        reject(new Error("Message send timeout"));
      }, 5000);

      // Use the exact event name from backend: 'sendMessage'
      this.socket.emit("sendMessage", messageData, (response) => {
        clearTimeout(timeout);
        
        if (response?.success) {
          console.log("✅ Message sent successfully:", response.messageId);
          resolve(response);
        } else {
          console.error("❌ Message send failed:", response?.error);
          reject(new Error(response?.error || "Failed to send message"));
        }
      });
    });
  }

  // FIXED: Join conversation - matches backend exactly
  joinConversation(conversationId) {
    console.log(`🔗 Joining conversation: ${conversationId}`);
    return this.emit("join_conversation", conversationId);
  }

  leaveConversation(conversationId) {
    return this.emit("leave_conversation", conversationId);
  }

  // FIXED: Typing event - matches backend exactly
  sendTyping(conversationId, isTyping) {
    return this.emit("typing", { 
      conversationId, 
      isTyping 
    });
  }

  markAsRead(conversationId, messageId) {
    // Note: Your backend doesn't have markAsRead handler yet
    console.log("📖 Mark as read - backend handler not implemented");
    return false;
  }

  // Basic emit method
  emit(event, data, callback) {
    if (this.socket && this.isConnected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
      console.log(`📤 Emitted: ${event}`, data);
      return true;
    } else {
      console.warn("⚠️ Socket not connected, cannot emit:", event);
      return false;
    }
  }

  // Event listeners management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
    
    console.log(`📥 Registered listener for: ${event}`);
  }

  off(event, callback = null) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
        // Remove from our tracking
        if (this.eventListeners.has(event)) {
          const callbacks = this.eventListeners.get(event);
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
          if (callbacks.length === 0) {
            this.eventListeners.delete(event);
          }
        }
      } else {
        this.socket.off(event);
        this.eventListeners.delete(event);
      }
    }
  }

  removeAllListeners(event = null) {
    if (this.socket) {
      if (event) {
        this.socket.removeAllListeners(event);
        this.eventListeners.delete(event);
      } else {
        this.socket.removeAllListeners();
        this.eventListeners.clear();
      }
    }
  }

  cleanup() {
    this.connectionPromise = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting socket...");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.cleanup();
      console.log("✅ Socket disconnected and cleaned up");
    }
  }

  getSocket() {
    return this.socket;
  }

  getIsConnected() {
    return this.isConnected && this.socket?.connected;
  }

  async reconnect() {
    try {
      console.log("🔄 Manual reconnection initiated...");
      this.disconnect();
      
      // Small delay before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.connect();
      return true;
    } catch (error) {
      console.error("❌ Manual reconnection failed:", error);
      return false;
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;